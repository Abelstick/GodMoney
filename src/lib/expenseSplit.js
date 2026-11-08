import { toCents, fromCents } from './simulation/money'

// Dividir un gasto entre varias categorías (p. ej. un pollo a la brasa: una
// parte "Comida", otra "Pareja"). Cada parte se guarda como un gasto propio
// unido a los demás por split_group_id, así presupuestos, reportes y gráficos
// por categoría siguen sumando bien sin cambiar nada más.
//
// Todo se calcula en enteros: céntimos para montos y centésimas de punto para
// porcentajes (100 % = 10000), para que 33.33 + 33.33 + 33.34 sume exacto.

export const SPLIT_MODES = { PERCENT: 'percent', AMOUNT: 'amount' }

const FULL = 10000 // 100.00 %

const toBasisPoints = (value) => toCents(value)
const formatPercent = (bp) => String(bp / 100)
const formatAmount  = (cents) => (cents / 100).toFixed(2)

// Reparte un total en céntimos según porcentajes que suman 100 %. Los céntimos
// que sobran por redondeo van a las partes con mayor resto, así la suma de las
// partes es siempre exactamente el total.
function distribute(totalCents, basisPoints) {
  const raw = basisPoints.map((bp) => totalCents * bp)
  const amounts = raw.map((r) => Math.floor(r / FULL))
  let leftover = totalCents - amounts.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, rest: r % FULL }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (let k = 0; leftover > 0 && k < order.length; k++, leftover--) amounts[order[k].i] += 1
  return amounts
}

// Porcentajes iguales que suman 100: 2 → 50/50, 3 → 33.34/33.33/33.33.
export function evenPercents(count) {
  if (count <= 0) return []
  const base = Math.floor(FULL / count)
  const extra = FULL - base * count
  return Array.from({ length: count }, (_, i) => formatPercent(base + (i < extra ? 1 : 0)))
}

// Estado de la división: cuánto toca a cada parte (en céntimos), cuánto falta
// asignar y si se puede guardar.
export function resolveSplit(total, parts, mode) {
  const totalCents = toCents(total)
  const isPercent = mode === SPLIT_MODES.PERCENT

  let amounts
  let remaining // céntimos (monto) o centésimas de punto (porcentaje)
  if (isPercent) {
    const bps = parts.map((p) => toBasisPoints(p.value))
    const allocated = bps.reduce((a, b) => a + b, 0)
    remaining = FULL - allocated
    amounts = remaining === 0
      ? distribute(totalCents, bps)
      : bps.map((bp) => Math.round((totalCents * bp) / FULL))
  } else {
    amounts = parts.map((p) => toCents(p.value))
    remaining = totalCents - amounts.reduce((a, b) => a + b, 0)
  }

  let error = null
  const categories = parts.map((p) => p.category_id || '')
  if (totalCents <= 0) error = 'Primero ingresa el monto total'
  else if (parts.length < 2) error = 'Agrega al menos dos categorías'
  else if (new Set(categories).size !== categories.length) error = 'Hay una categoría repetida'
  else if (remaining > 0) error = isPercent ? `Falta asignar ${formatPercent(remaining)} %` : `Falta asignar S/ ${formatAmount(remaining)}`
  else if (remaining < 0) error = isPercent ? `Te pasaste por ${formatPercent(-remaining)} %` : `Te pasaste por S/ ${formatAmount(-remaining)}`
  else if (amounts.some((c) => c <= 0)) error = 'Cada parte debe ser mayor a cero'

  return {
    amounts,
    remaining,
    remainingLabel: isPercent ? `${formatPercent(Math.abs(remaining))} %` : `S/ ${formatAmount(Math.abs(remaining))}`,
    valid: error === null,
    error,
  }
}

// Valor que deja la parte `index` si se le suma todo lo que falta asignar.
export function fillRemaining(total, parts, mode, index) {
  const { remaining } = resolveSplit(total, parts, mode)
  const current = mode === SPLIT_MODES.PERCENT ? toBasisPoints(parts[index].value) : toCents(parts[index].value)
  const next = Math.max(0, current + remaining)
  return mode === SPLIT_MODES.PERCENT ? formatPercent(next) : formatAmount(next)
}

// Al cambiar de modo se convierten los valores para no perder lo ya escrito.
export function convertParts(total, parts, from, to) {
  if (from === to) return parts
  const totalCents = toCents(total)
  if (totalCents <= 0) return parts.map((p) => ({ ...p, value: '' }))
  if (to === SPLIT_MODES.AMOUNT) {
    const { amounts } = resolveSplit(total, parts, from)
    return parts.map((p, i) => ({ ...p, value: p.value === '' ? '' : formatAmount(amounts[i]) }))
  }
  const values = parts.map((p) => toCents(p.value))
  const bps = values.reduce((a, b) => a + b, 0) === totalCents
    ? distribute(FULL, values.map((c) => Math.round((c * FULL) / totalCents)))
    : values.map((c) => Math.round((c * FULL) / totalCents))
  return parts.map((p, i) => ({ ...p, value: p.value === '' ? '' : formatPercent(bps[i]) }))
}

// Gastos listos para guardar, uno por parte, todos con el mismo grupo. Solo
// la parte cuya categoría es de ahorro lleva la cuenta de destino. Una parte
// que ya existe (al editar) conserva su id: newId(part) decide.
export function buildSplitExpenses(base, parts, mode, { groupId, isSavingsCategory = () => false, newId }) {
  const { amounts, valid, error } = resolveSplit(base.amount, parts, mode)
  if (!valid) throw new Error(error)
  return parts.map((p, i) => ({
    ...base,
    id: newId(p),
    category_id: p.category_id || null,
    amount: fromCents(amounts[i]),
    savings_account_id: isSavingsCategory(p.category_id) ? (base.savings_account_id ?? null) : null,
    split_group_id: groupId,
  }))
}

// Partes del editor a partir de los gastos guardados de un grupo (para editar
// o duplicar): en monto, que es lo que quedó registrado.
export function splitFromGroup(rows, { keepIds = true } = {}) {
  const sorted = [...rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || Number(b.amount) - Number(a.amount))
  return {
    mode: SPLIT_MODES.AMOUNT,
    groupId: keepIds ? sorted[0]?.split_group_id ?? null : null,
    parts: sorted.map((r) => ({
      key: keepIds ? r.id : globalThis.crypto.randomUUID(),
      id: keepIds ? r.id : undefined,
      category_id: r.category_id ?? '',
      value: formatAmount(toCents(r.amount)),
    })),
  }
}

export function groupTotal(rows) {
  return fromCents(rows.reduce((sum, r) => sum + toCents(r.amount), 0))
}

// Qué hacer para pasar de las partes guardadas a las nuevas: actualizar las
// que siguen, insertar las nuevas y borrar las que se quitaron.
export function diffSplitGroup(oldRows, newRows) {
  const oldIds = new Set(oldRows.map((r) => r.id))
  const newIds = new Set(newRows.map((r) => r.id))
  return {
    toUpdate: newRows.filter((r) => oldIds.has(r.id)),
    toInsert: newRows.filter((r) => !oldIds.has(r.id)),
    toDelete: oldRows.filter((r) => !newIds.has(r.id)).map((r) => r.id),
  }
}
