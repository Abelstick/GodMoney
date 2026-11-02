import { differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns'

export const OCCASION_KIND = {
  BIRTHDAY: 'BIRTHDAY',
  CHRISTMAS: 'CHRISTMAS',
  ANNIVERSARY: 'ANNIVERSARY',
  OTHER: 'OTHER',
}

export const OCCASION_KIND_META = {
  BIRTHDAY:    { label: 'Cumpleaños',  color: 'var(--color-primary)' },
  CHRISTMAS:   { label: 'Navidad',     color: 'var(--color-success)' },
  ANNIVERSARY: { label: 'Aniversario', color: 'var(--color-danger)'  },
  OTHER:       { label: 'Otra',        color: 'var(--color-warning)' },
}

export const GIFT_STATUS = { IDEA: 'IDEA', PLANNED: 'PLANNED', DONE: 'DONE' }

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "25 de diciembre"
export function formatDayMonth(month, day) {
  if (!month || !day) return ''
  return `${day} de ${MONTHS[month - 1]}`
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Un 29 de febrero se celebra el 28 en años no bisiestos.
function dateInYear(year, month, day) {
  const last = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, last))
}

// Próxima vez que cae month/day contando hoy. Devuelve 'yyyy-MM-dd'.
export function nextAnnualDate(month, day, today = new Date()) {
  const t = startOfDay(today)
  let date = dateInYear(t.getFullYear(), month, day)
  if (date < t) date = dateInYear(t.getFullYear() + 1, month, day)
  return format(date, 'yyyy-MM-dd')
}

export function daysUntil(dateStr, today = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return differenceInCalendarDays(new Date(y, m - 1, d), startOfDay(today))
}

// Texto corto para la cuenta regresiva.
export function countdownLabel(days) {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days < 0) return `Hace ${-days} días`
  return `En ${days} días`
}

// Ciclo vigente de una ocasión: la próxima fecha y el año al que pertenecen
// los regalos de ese ciclo (los de Navidad 2026 dejan de contar el 26/12).
export function occasionCycle(occasion, today = new Date()) {
  const date = nextAnnualDate(occasion.month, occasion.day, today)
  return { date, year: Number(date.slice(0, 4)), days: daysUntil(date, today) }
}

// Gasto real, comprometido (planificado sin comprar) y restante del ciclo.
export function occasionBudgetSummary(occasion, gifts, year) {
  const mine = gifts.filter((g) =>
    g.direction === 'GIVEN' && g.occasion_id === occasion.id && g.year === year)
  const spent = mine
    .filter((g) => g.status === GIFT_STATUS.DONE)
    .reduce((acc, g) => acc + Number(g.amount ?? 0), 0)
  const planned = mine
    .filter((g) => g.status === GIFT_STATUS.PLANNED)
    .reduce((acc, g) => acc + Number(g.estimated_amount ?? 0), 0)
  const budget = occasion.budget ? Number(occasion.budget) : null
  return {
    gifts: mine,
    spent,
    planned,
    budget,
    remaining: budget === null ? null : budget - spent - planned,
    percent: budget ? ((spent + planned) / budget) * 100 : 0,
  }
}

// Cuánto apartar cada mes para llegar al presupuesto sin sentir el golpe.
// Cuenta el mes actual: faltando 2 meses y medio se reparte en 3 cuotas.
// Si ya hay un objetivo de ahorro vinculado, se descuenta lo ahorrado.
export function monthlySavingSuggestion({ budget, alreadyCovered = 0, date, today = new Date() }) {
  if (!budget) return null
  const missing = budget - alreadyCovered
  if (missing <= 0) return { perMonth: 0, months: 0, missing: 0 }
  const [y, m, d] = date.split('-').map(Number)
  const months = Math.max(1, differenceInCalendarMonths(new Date(y, m - 1, d), startOfDay(today)) + 1)
  return { perMonth: Math.ceil((missing / months) * 100) / 100, months, missing }
}

// Ocasiones activas ordenadas por cercanía, con su ciclo calculado.
export function upcomingOccasions(occasions, today = new Date()) {
  return occasions
    .filter((o) => o.is_active !== false)
    .map((o) => ({ occasion: o, ...occasionCycle(o, today) }))
    .sort((a, b) => a.days - b.days)
}

// Ocasiones que ya entraron en su ventana de aviso.
export function dueReminders(occasions, today = new Date()) {
  return upcomingOccasions(occasions, today)
    .filter(({ occasion, days }) => days <= Number(occasion.reminder_days_before ?? 14))
}

// Totales por año del historial (dado vs recibido).
export function historyByYear(gifts) {
  const byYear = new Map()
  for (const g of gifts) {
    if (g.status !== GIFT_STATUS.DONE) continue
    const year = g.year ?? (g.date ? Number(g.date.slice(0, 4)) : null)
    if (!year) continue
    const row = byYear.get(year) ?? { year, given: 0, received: 0, givenCount: 0, receivedCount: 0, gifts: [] }
    if (g.direction === 'RECEIVED') {
      row.received += Number(g.amount ?? 0)
      row.receivedCount += 1
    } else {
      row.given += Number(g.amount ?? 0)
      row.givenCount += 1
    }
    row.gifts.push(g)
    byYear.set(year, row)
  }
  return [...byYear.values()]
    .sort((a, b) => b.year - a.year)
    .map((row) => ({ ...row, gifts: row.gifts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')) }))
}
