import { toCents, fromCents } from './simulation/money'

// Reparto de una reposición entre las deudas abiertas de una cuenta.
// debts: [{ id, pending }] ordenadas de la más antigua a la más nueva.
// Todo se calcula en céntimos para que el reparto sume exacto.

/** Reparto por defecto: cubre la más antigua primero. → { [id]: monto } */
export function autoAllocate(debts, amount) {
  let left = Math.max(0, toCents(amount))
  const result = {}
  for (const d of debts) {
    const chunk = Math.min(left, Math.max(0, toCents(d.pending)))
    result[d.id] = fromCents(chunk)
    left -= chunk
  }
  return result
}

/**
 * Revisa un reparto hecho a mano. values: { [id]: texto o número }.
 * Devuelve:
 *   allocations  [{ withdrawal_id, amount }] solo las deudas con monto
 *   assigned     total asignado a deudas
 *   extra        sobrante que entra como aporte (solo si todas quedan cubiertas)
 *   missing      falta asignar (quedan deudas con saldo y monto sin repartir)
 *   excess       asignado de más respecto al monto a reponer
 *   overIds      deudas con más de lo que les falta
 *   valid        se puede guardar
 */
export function checkAllocation(debts, values, amount) {
  const total = Math.max(0, toCents(amount))
  const allocations = []
  const overIds = []
  let assigned = 0
  let allCovered = true

  for (const d of debts) {
    const pending = Math.max(0, toCents(d.pending))
    const cents = Math.max(0, toCents(values[d.id]))
    if (cents > pending) overIds.push(d.id)
    if (cents < pending) allCovered = false
    if (cents > 0) allocations.push({ withdrawal_id: d.id, amount: fromCents(cents) })
    assigned += cents
  }

  const diff = total - assigned
  const extra = diff > 0 && allCovered ? diff : 0
  const missing = diff > 0 && !allCovered ? diff : 0
  const excess = diff < 0 ? -diff : 0

  return {
    allocations,
    assigned: fromCents(assigned),
    extra: fromCents(extra),
    missing: fromCents(missing),
    excess: fromCents(excess),
    overIds,
    valid: total > 0 && !overIds.length && !missing && !excess,
  }
}

/**
 * Recorta un reparto a lo que hay disponible (p. ej. el saldo de la cuenta de
 * origen): respeta lo marcado, de la más antigua a la más nueva, hasta agotar
 * el presupuesto. La última que alcanza queda parcial y el resto sin monto.
 */
export function fitToBudget(debts, values, budget) {
  let left = Math.max(0, toCents(budget))
  const result = {}
  for (const d of debts) {
    const wanted = Math.min(Math.max(0, toCents(values[d.id])), Math.max(0, toCents(d.pending)))
    const cents = Math.min(wanted, left)
    result[d.id] = cents > 0 ? String(fromCents(cents)) : ''
    left -= cents
  }
  return result
}

/** Marca o desmarca una deuda: al marcar se propone completa (se puede bajar para pagarla en parte). */
export function toggleDebt(debts, values, id, checked) {
  if (!checked) return { ...values, [id]: '' }
  const debt = debts.find((d) => d.id === id)
  return { ...values, [id]: String(fromCents(Math.max(0, toCents(debt?.pending)))) }
}
