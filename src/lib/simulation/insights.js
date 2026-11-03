import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@/lib/formatters'
import { simulate } from './engine'
import { fromCents, percentOf } from './money'
import { nextIncomeAfter, summarize } from './metrics'

const ISO = 'yyyy-MM-dd'
const POSTPONE_DAYS = 15

const money = (cents) => formatCurrency(fromCents(cents))
const day = (iso) => format(parseISO(iso), "d 'de' MMMM", { locale: es })

// La compra única más grande dentro del rango: es la decisión que el usuario
// suele estar evaluando ("¿compro el celular?").
export function biggestPurchase(result, until = result.to) {
  let best = null
  for (const p of result.points) {
    if (p.date > until) break
    for (const item of p.items) {
      if (item.type !== 'expense') continue
      if (!best || item.cents > best.cents) best = { ...item, date: p.date }
    }
  }
  return best
}

/**
 * Avisos y sugerencias del escenario. Cada texto sale de un cálculo del motor
 * (nada inventado) y se redacta como proyección, no como certeza.
 *
 * Devuelve [{ id, tone: 'danger'|'warning'|'success'|'info', title, detail }].
 */
export function buildInsights(scenario, window, { thresholdCents = 0 } = {}) {
  const result = simulate(scenario, window)
  const summary = summarize(result, { thresholdCents })
  const out = []
  if (!result.points.some((p) => p.items.length)) return out

  // 1. Saldo negativo y cuánto falta para el próximo ingreso.
  if (summary.firstNegativeDate) {
    const lowPoint = result.points.find((p) => p.date === summary.firstNegativeDate)
    const next = nextIncomeAfter(result, summary.firstNegativeDate)
    const gap = next ? differenceInCalendarDays(parseISO(next.date), parseISO(summary.firstNegativeDate)) : null
    out.push({
      id: 'negative',
      tone: 'danger',
      title: next
        ? 'Podrías quedarte sin dinero antes de tu próximo ingreso'
        : 'Podrías quedarte sin dinero en este periodo',
      detail: next
        ? `El ${day(summary.firstNegativeDate)} tu saldo proyectado bajaría a ${money(lowPoint.balance)}, ${gap} ${gap === 1 ? 'día' : 'días'} antes del ingreso del ${day(next.date)} (${money(next.cents)}).`
        : `El ${day(summary.firstNegativeDate)} tu saldo proyectado bajaría a ${money(lowPoint.balance)} y en este escenario no hay ingresos después de esa fecha.`,
    })
  } else if (summary.firstBelowThresholdDate) {
    // 2. No llega a negativo pero cruza el límite que el usuario se puso.
    out.push({
      id: 'threshold',
      tone: 'warning',
      title: `Tu saldo bajaría de tu límite de ${money(summary.threshold)}`,
      detail: `Desde el ${day(summary.firstBelowThresholdDate)}, durante ${summary.daysBelowThreshold} ${summary.daysBelowThreshold === 1 ? 'día' : 'días'} del periodo.`,
    })
  }

  // 3. Saldo mínimo y margen de seguridad.
  out.push({
    id: 'min',
    tone: summary.min.balance < 0 ? 'danger' : summary.min.balance < summary.threshold ? 'warning' : 'info',
    title: `Tu saldo mínimo proyectado sería ${money(summary.min.balance)}`,
    detail: summary.min.date === result.from
      ? 'Es tu saldo de partida: en este periodo nunca bajarías de ahí.'
      : `Se alcanzaría el ${day(summary.min.date)}.`,
  })
  if (summary.min.balance >= summary.threshold && summary.min.balance >= 0) {
    const margin = summary.min.balance - summary.threshold
    out.push({
      id: 'margin',
      tone: 'success',
      title: `Este escenario mantiene un margen de seguridad de ${money(margin)}`,
      detail: summary.threshold > 0
        ? `Es lo que te sobraría por encima de tu límite de ${money(summary.threshold)} en el peor momento.`
        : 'Es lo mínimo que tendrías disponible en el peor momento del periodo.',
    })
  }

  // 4. La compra más grande: cuánto pesa y qué pasa si se posterga.
  const purchase = biggestPurchase(result)
  if (purchase) {
    const name = purchase.description?.trim() || 'esta compra'
    const share = percentOf(purchase.cents, summary.income)
    out.push({
      id: 'purchase',
      tone: purchase.balanceAfter < summary.threshold || purchase.balanceAfter < 0 ? 'warning' : 'info',
      title: `Con ${name === 'esta compra' ? name : `«${name}»`}, tu saldo bajaría a ${money(purchase.balanceAfter)}`,
      detail: share !== null
        ? `El ${day(purchase.date)}. Representa el ${share.toLocaleString('es-PE')} % de tus ingresos proyectados del periodo (${money(summary.income)}).`
        : `El ${day(purchase.date)}. No hay ingresos proyectados en el periodo para compararla.`,
    })

    const postponed = postponeAdvice(scenario, window, purchase, { thresholdCents, summary })
    if (postponed) out.push(postponed)
  }

  return out
}

// Re-simula el escenario moviendo la compra 15 días. Solo recomienda si la
// nueva fecha sigue dentro del periodo (si no, la "mejora" sería solo sacarla
// del cálculo) y si el saldo mínimo realmente mejora.
function postponeAdvice(scenario, window, purchase, { thresholdCents, summary }) {
  const event = scenario.events.find((e) => e.id === purchase.eventId)
  if (!event || event.repeat !== 'once') return null
  const newDate = format(addDays(parseISO(purchase.date), POSTPONE_DAYS), ISO)
  if (newDate > window.to) return null

  const moved = {
    ...scenario,
    events: scenario.events.map((e) => (e.id === event.id ? { ...e, date: newDate } : e)),
  }
  const after = summarize(simulate(moved, window), { thresholdCents })
  const improvement = after.min.balance - summary.min.balance
  if (improvement <= 0) return null

  const name = event.description?.trim() ? `«${event.description.trim()}»` : 'esta compra'
  const avoidsNegative = summary.firstNegativeDate && !after.firstNegativeDate
  return {
    id: 'postpone',
    tone: 'success',
    title: `Si postergas ${name} ${POSTPONE_DAYS} días, tu saldo proyectado mejoraría`,
    detail: `Comprando el ${day(newDate)}, tu saldo mínimo pasaría de ${money(summary.min.balance)} a ${money(after.min.balance)}${avoidsNegative ? ' y ya no quedarías en negativo' : ''}.`,
  }
}
