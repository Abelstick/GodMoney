import { addDays, format, parseISO } from 'date-fns'
import { percentOf } from './money'

const ISO = 'yyyy-MM-dd'

// Puntos del resultado hasta `until` inclusive.
export function pointsUntil(result, until = result.to) {
  return result.points.filter((p) => p.date <= until)
}

// Saldo al cierre del día `date`. Antes del inicio = saldo inicial; fuera del
// rango simulado = null (no se inventa lo que no se calculó).
export function balanceOn(result, date) {
  if (date < result.from) return result.initial
  if (date > result.to) return null
  const point = result.points.find((p) => p.date === date)
  return point ? point.balance : null
}

/**
 * Indicadores del escenario entre el inicio y `until`.
 * Todos los montos en céntimos (también `thresholdCents`, el saldo mínimo
 * deseado que define el usuario).
 */
export function summarize(result, { until = result.to, thresholdCents = 0 } = {}) {
  const points = pointsUntil(result, until)

  const totals = { income: 0, expense: 0, debt: 0, saving: 0, transfer: 0 }
  for (const p of points) {
    for (const item of p.items) totals[item.type] += item.cents
  }
  const outflow = totals.expense + totals.debt + totals.saving
  const final = points.length ? points.at(-1).balance : result.initial

  // El mínimo considera también el punto de partida.
  let min = { balance: result.initial, date: result.from }
  for (const p of points) if (p.balance < min.balance) min = { balance: p.balance, date: p.date }

  const firstNegative = points.find((p) => p.balance < 0) ?? null
  const firstBelow = points.find((p) => p.balance < thresholdCents) ?? null
  const daysBelow = points.filter((p) => p.balance < thresholdCents).length

  return {
    initial: result.initial,
    income: totals.income,
    outflow,
    totals,
    final,
    variation: final - result.initial,
    variationPct: result.initial > 0 ? percentOf(final - result.initial, result.initial) : null,
    // De todo el dinero con el que cuentas en el periodo (lo que tienes + lo
    // que entra), qué parte ya tiene destino.
    committedPct: percentOf(outflow, result.initial + totals.income),
    min,
    threshold: thresholdCents,
    firstNegativeDate: firstNegative?.date ?? null,
    firstBelowThresholdDate: thresholdCents > 0 ? (firstBelow?.date ?? null) : null,
    daysBelowThreshold: thresholdCents > 0 ? daysBelow : 0,
  }
}

export const CHECKPOINT_OFFSETS = [
  { days: 0,  label: 'Hoy' },
  { days: 7,  label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días' },
  { days: 60, label: '60 días' },
]

// Saldo proyectado en cada corte. "Hoy" es el saldo inicial (antes de los
// movimientos del primer día), el resto el cierre de ese día.
export function checkpoints(result, offsets = CHECKPOINT_OFFSETS) {
  const start = parseISO(result.from)
  return offsets.map(({ days, label }) => {
    const date = format(addDays(start, days), ISO)
    return { days, label, date, balance: days === 0 ? result.initial : balanceOn(result, date) }
  })
}

// Próximo ingreso estrictamente posterior a `date` dentro del resultado.
export function nextIncomeAfter(result, date) {
  for (const p of result.points) {
    if (p.date <= date) continue
    const income = p.items.find((i) => i.type === 'income')
    if (income) return { date: p.date, ...income }
  }
  return null
}

// Saldo por cuenta al final (solo cuando el escenario usa cuentas).
export function bucketBreakdown(result, accounts = []) {
  const names = Object.fromEntries(accounts.map((a) => [a.id, a.name]))
  return Object.entries(result.finalBuckets).map(([key, cents]) => ({
    key,
    name: names[key] ?? (key === '__general__' ? 'Sin cuenta asignada' : 'Cuenta eliminada'),
    initial: result.initialBuckets[key] ?? 0,
    final: cents,
  }))
}
