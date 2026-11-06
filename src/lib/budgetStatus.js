import {
  differenceInCalendarDays, endOfMonth, endOfWeek, endOfYear, format, parseISO,
  startOfMonth, startOfWeek, startOfYear, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { BUDGET_PERIODS } from './constants'
import { formatCurrency } from './formatters'

export const BUDGET_STATUS = {
  NORMAL:   'normal',
  WARNING:  'warning',
  REACHED:  'reached',
  EXCEEDED: 'exceeded',
}

const SEVERITY = {
  [BUDGET_STATUS.EXCEEDED]: 3,
  [BUDGET_STATUS.REACHED]:  2,
  [BUDGET_STATUS.WARNING]:  1,
  [BUDGET_STATUS.NORMAL]:   0,
}

const ISO = 'yyyy-MM-dd'
const WEEK_OPTIONS = { weekStartsOn: 1 } // igual que la Edge Function send-budget-alerts

function toCents(value) {
  return Math.round(Number(value) * 100)
}

// Rango [from, to] (YYYY-MM-DD) del período de un presupuesto que contiene refDate.
export function getBudgetPeriodRange(period, refDate) {
  if (period === 'weekly') {
    return { from: format(startOfWeek(refDate, WEEK_OPTIONS), ISO), to: format(endOfWeek(refDate, WEEK_OPTIONS), ISO) }
  }
  if (period === 'yearly') {
    return { from: format(startOfYear(refDate), ISO), to: format(endOfYear(refDate), ISO) }
  }
  return { from: format(startOfMonth(refDate), ISO), to: format(endOfMonth(refDate), ISO) }
}

// Fecha que decide qué período se muestra: hoy en el mes en curso; en un mes
// pasado, su último día (la última semana de ese mes, el año al que pertenece).
export function getBudgetReferenceDate(activeMonth, now = new Date()) {
  return activeMonth === format(now, 'yyyy-MM') ? now : endOfMonth(parseISO(`${activeMonth}-01`))
}

// Rango que cubre los períodos de todos los presupuestos (null si no hay ninguno).
export function getBudgetsRange(budgets, refDate) {
  if (!budgets.length) return null
  const ranges = budgets.map((b) => getBudgetPeriodRange(b.period, refDate))
  return {
    from: ranges.reduce((min, r) => (r.from < min ? r.from : min), ranges[0].from),
    to:   ranges.reduce((max, r) => (r.to > max ? r.to : max), ranges[0].to),
  }
}

// Ids únicos de todas las categorías cubiertas por una lista de presupuestos.
export function allBudgetCategoryIds(budgets) {
  return [...new Set(budgets.flatMap((b) => b.category_ids ?? []))]
}

// Gasto de las categorías indicadas dentro del rango. rows: { category_id, amount, date }.
export function spentInRange(rows, categoryIds, { from, to }) {
  const ids = new Set(categoryIds)
  const cents = rows.reduce(
    (acc, r) => (ids.has(r.category_id) && r.date >= from && r.date <= to ? acc + toCents(r.amount) : acc),
    0,
  )
  return cents / 100
}

// Presupuesto con lo gastado en SU período y su estado. Único cálculo para toda la app.
export function withBudgetStatus(budget, rows, refDate, now = new Date()) {
  const range  = getBudgetPeriodRange(budget.period, refDate)
  const spent  = spentInRange(rows, budget.category_ids ?? [], range)
  const amount = Number(budget.amount)
  const result = {
    ...budget,
    range,
    spent,
    remaining: Math.max(amount - spent, 0),
    overBy:    Math.max(spent - amount, 0),
    percent:   amount > 0 ? Math.round((spent / amount) * 100) : 0,
    status:    getBudgetStatus(spent, amount),
  }
  return { ...result, pace: getBudgetPace(result, rows, now) }
}

// Con menos días, una sola compra dispara la proyección.
const MIN_PACE_DAYS = 3

// Ritmo del período en curso (null si `now` queda fuera de él). Solo se extrapola
// lo variable hasta hoy: un alquiler del día 2 o un ahorro no se repiten a diario.
// No incluye pagos recurrentes que aún no se han registrado.
export function getBudgetPace(budget, rows, now = new Date()) {
  const { range, period, spent } = budget
  const today = format(now, ISO)
  if (!range || today < range.from || today > range.to) return null

  const amount = Number(budget.amount)
  const elapsed = differenceInCalendarDays(parseISO(today), parseISO(range.from)) + 1
  const daysAfterToday = differenceInCalendarDays(parseISO(range.to), parseISO(today))

  const ids = new Set(budget.category_ids ?? [])
  const variableCents = rows.reduce((acc, r) => (
    ids.has(r.category_id) && r.date >= range.from && r.date <= today && !r.is_fixed && !r.category?.is_savings
      ? acc + toCents(r.amount)
      : acc
  ), 0)
  const projected = elapsed >= MIN_PACE_DAYS && spent > 0
    ? Math.round(toCents(spent) + (variableCents / elapsed) * daysAfterToday) / 100
    : null

  const left = amount - spent
  return {
    projected,
    projectedOver: projected !== null && toCents(projected) > toCents(amount),
    daysLeft: daysAfterToday + 1,
    // Un "por día" sobre un límite anual no ayuda a decidir el gasto de hoy.
    perDay: period !== 'yearly' && left > 0 ? Math.floor((toCents(left) / (daysAfterToday + 1))) / 100 : null,
  }
}

// Orden de las tarjetas: primero lo más grave y lo que va camino de pasarse.
export function sortBudgetsByUrgency(budgets) {
  return [...budgets].sort((a, b) => (
    budgetStatusSeverity(b.status) - budgetStatusSeverity(a.status)
    || Number(Boolean(b.pace?.projectedOver)) - Number(Boolean(a.pace?.projectedOver))
    || b.percent - a.percent
    || a.name.localeCompare(b.name, 'es')
  ))
}

// Enlace a Movimientos con los gastos que cuentan para el presupuesto en su período.
export function getBudgetMovementsUrl({ category_ids: ids, range }) {
  const params = new URLSearchParams({
    tipo: 'expense', desde: range.from, hasta: range.to, categorias: (ids ?? []).join(','),
  })
  return `/movimientos?${params}`
}

// Totales de los presupuestos mensuales (null si no hay): sumar límites de distinto
// período no significa nada. Una categoría en dos presupuestos se cuenta una vez, y
// lo restante es el neto real: un exceso en uno se come lo que sobra en otro.
export function summarizeBudgets(budgets, rows) {
  const monthly = budgets.filter((b) => b.period === 'monthly')
  if (!monthly.length) return null

  const categoryIds = allBudgetCategoryIds(monthly)
  const limit = monthly.reduce((acc, b) => acc + toCents(b.amount), 0) / 100
  const spent = spentInRange(rows, categoryIds, monthly[0].range)
  const linkCount = monthly.reduce((acc, b) => acc + (b.category_ids?.length ?? 0), 0)

  return {
    limit,
    spent,
    net: (toCents(limit) - toCents(spent)) / 100,
    percent: limit > 0 ? Math.round((spent / limit) * 100) : 0,
    monthlyCount: monthly.length,
    otherPeriodCount: budgets.length - monthly.length,
    hasSharedCategories: linkCount > categoryIds.length,
  }
}

// Texto del período para la tarjeta: "Mensual", "Semanal · 2 nov – 8 nov", "Anual · 2026".
export function getBudgetPeriodText({ period, range }) {
  const label = BUDGET_PERIODS.find((p) => p.value === period)?.label ?? period
  if (!range) return label
  const from = parseISO(range.from)
  if (period === 'weekly') {
    const short = (d) => format(d, 'd MMM', { locale: es })
    return `${label} · ${short(from)} – ${short(parseISO(range.to))}`
  }
  if (period === 'yearly') return `${label} · ${format(from, 'yyyy')}`
  return label
}

// Clasifica un presupuesto comparando en centavos para evitar errores de precisión decimal (0.1 + 0.2 ...).
export function getBudgetStatus(spent, amount) {
  const amountCents = toCents(amount)
  if (amountCents <= 0) return BUDGET_STATUS.NORMAL

  const spentCents = toCents(spent)
  if (spentCents > amountCents)  return BUDGET_STATUS.EXCEEDED
  if (spentCents === amountCents) return BUDGET_STATUS.REACHED

  const percent = (spentCents / amountCents) * 100
  return percent >= 80 ? BUDGET_STATUS.WARNING : BUDGET_STATUS.NORMAL
}

export function budgetStatusSeverity(status) {
  return SEVERITY[status] ?? 0
}

export const BUDGET_STATUS_META = {
  [BUDGET_STATUS.NORMAL]:   { label: 'Normal',           color: 'var(--color-text-muted)' },
  [BUDGET_STATUS.WARNING]:  { label: 'Cerca del límite', color: 'var(--color-warning)'     },
  [BUDGET_STATUS.REACHED]:  { label: 'Alcanzado',        color: 'var(--color-info)'        },
  [BUDGET_STATUS.EXCEEDED]: { label: 'Excedido',         color: 'var(--color-danger)'      },
}

// Estado para la UI (StatusBadge): tono semántico + texto corto. Las etiquetas
// de BUDGET_STATUS_META se mantienen para los exports (CSV / reporte).
export const BUDGET_STATUS_TONE = {
  [BUDGET_STATUS.NORMAL]:   { tone: 'ok',      label: 'Dentro',           progress: 'income'  },
  [BUDGET_STATUS.WARNING]:  { tone: 'warning', label: 'Cerca del límite', progress: 'warning' },
  [BUDGET_STATUS.REACHED]:  { tone: 'warning', label: 'Al límite',        progress: 'warning' },
  [BUDGET_STATUS.EXCEEDED]: { tone: 'danger',  label: 'Excedido',         progress: 'expense' },
}

// Mensaje descriptivo para el panel de alertas. Siempre incluye el límite del presupuesto.
export function getBudgetAlertMessage(budget) {
  switch (budget.status) {
    case BUDGET_STATUS.EXCEEDED:
      return `Excediste tu límite de ${formatCurrency(budget.amount)} — gastaste ${formatCurrency(budget.overBy)} de más`
    case BUDGET_STATUS.REACHED:
      return `Alcanzaste tu límite de ${formatCurrency(budget.amount)}`
    default:
      return `${budget.percent}% usado de ${formatCurrency(budget.amount)} — quedan ${formatCurrency(budget.remaining)}`
  }
}

// Últimos 3 meses completos: el mes en curso aún no dice cuánto se suele gastar.
export function getSuggestionRange(now = new Date()) {
  return {
    from: format(startOfMonth(subMonths(now, 3)), ISO),
    to:   format(endOfMonth(subMonths(now, 1)), ISO),
  }
}

const MONTHS_PER_PERIOD = { weekly: 12 / 52, monthly: 1, yearly: 12 }

// Monto sugerido según lo gastado, en soles enteros hacia arriba (null sin historial).
// rows: gastos de TODAS las categorías, para promediar solo los meses en que se usó
// la app; quien lleva un mes no debe ver su gasto dividido entre tres.
export function suggestBudgetAmount(rows, categoryIds, period) {
  const ids = new Set(categoryIds)
  const months = new Set(rows.map((r) => r.date.slice(0, 7))).size
  const cents = rows.reduce((acc, r) => (ids.has(r.category_id) ? acc + toCents(r.amount) : acc), 0)
  if (!months || !cents) return null
  return Math.ceil((cents / 100 / months) * (MONTHS_PER_PERIOD[period] ?? 1))
}

// Gasto del rango que no cuenta para ningún presupuesto, por categoría y de mayor
// a menor (null si no hay). El ahorro no es un gasto que limitar: queda fuera.
export function getUnbudgetedSpending(expenses, budgets, { from, to }) {
  const covered = new Set(allBudgetCategoryIds(budgets))
  const byCategory = new Map()
  let totalCents = 0
  for (const e of expenses) {
    if (e.date < from || e.date > to || e.category?.is_savings || covered.has(e.category_id)) continue
    const key = e.category_id ?? null
    const entry = byCategory.get(key) ?? { id: key, name: e.category?.name ?? 'Sin categoría', color: e.category?.color ?? null, cents: 0 }
    entry.cents += toCents(e.amount)
    byCategory.set(key, entry)
    totalCents += toCents(e.amount)
  }
  if (!totalCents) return null
  return {
    total: totalCents / 100,
    categories: [...byCategory.values()]
      .sort((a, b) => b.cents - a.cents)
      .map(({ cents, ...category }) => ({ ...category, total: cents / 100 })),
  }
}

// Nombres de los presupuestos que ya cubren alguna de estas categorías.
export function getOverlappingBudgetNames(categoryIds, budgets) {
  const ids = new Set(categoryIds)
  return budgets.filter((b) => (b.category_ids ?? []).some((id) => ids.has(id))).map((b) => b.name)
}
