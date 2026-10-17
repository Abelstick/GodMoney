import {
  format, parseISO, subDays, subMonths, subYears, startOfMonth, endOfMonth,
  differenceInCalendarDays, addDays, isValid,
} from 'date-fns'
import { formatDate } from './formatters'

const ISO = 'yyyy-MM-dd'

export const RANGE_PRESETS = [
  { value: '30d',    label: 'Últimos 30 días' },
  { value: 'year',   label: 'Este año' },
  { value: 'custom', label: 'Personalizado' },
]

// Rango de un preset. 'custom' arranca con el mes en curso hasta hoy para que
// el usuario solo ajuste los extremos.
export function buildRange(type, today = new Date()) {
  if (type === '30d')  return { type, from: format(subDays(today, 29), ISO), to: format(today, ISO) }
  if (type === 'year') return { type, from: `${today.getFullYear()}-01-01`, to: format(today, ISO) }
  return { type: 'custom', from: format(startOfMonth(today), ISO), to: format(today, ISO) }
}

export function isValidRange(from, to) {
  if (!from || !to) return false
  const a = parseISO(from)
  const b = parseISO(to)
  return isValid(a) && isValid(b) && a <= b
}

export function rangeLabel(range) {
  if (range.type === '30d')  return 'Últimos 30 días'
  if (range.type === 'year') return `Año ${range.from.slice(0, 4)}`
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

// Periodo inmediatamente anterior, comparable con el actual:
// - mes calendario completo → mes anterior
// - desde el 1 de enero     → mismo tramo del año anterior
// - cualquier otro          → igual número de días justo antes
export function previousRange({ from, to }) {
  const start = parseISO(from)
  const end = parseISO(to)

  if (format(start, ISO) === format(startOfMonth(start), ISO) && format(end, ISO) === format(endOfMonth(start), ISO)) {
    const prev = subMonths(start, 1)
    return { from: format(startOfMonth(prev), ISO), to: format(endOfMonth(prev), ISO) }
  }
  if (from.slice(5) === '01-01') {
    return { from: format(subYears(start, 1), ISO), to: format(subYears(end, 1), ISO) }
  }
  const days = differenceInCalendarDays(end, start) + 1
  const prevTo = addDays(start, -1)
  return { from: format(addDays(prevTo, -(days - 1)), ISO), to: format(prevTo, ISO) }
}

// Variación porcentual; null cuando no hay base de comparación.
export function percentDelta(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}
