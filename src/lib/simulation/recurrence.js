import { addDays, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns'

const ISO = 'yyyy-MM-dd'

export const REPEAT_OPTIONS = [
  { value: 'once',     label: 'Única'     },
  { value: 'daily',    label: 'Diaria'    },
  { value: 'weekly',   label: 'Semanal'   },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly',  label: 'Mensual'   },
]

export const REPEAT_VALUES = new Set(REPEAT_OPTIONS.map((o) => o.value))

// Tope de seguridad: un evento diario en un rango de dos años da ~730.
const MAX_OCCURRENCES = 2000

const iso = (date) => format(date, ISO)

// Día `day` del mes (year, monthIndex); si el mes es más corto, cae el último
// día (31 → 30 de abril → 28/29 de febrero), igual que los pagos recurrentes.
function clampedDate(year, monthIndex, day) {
  const first = new Date(year, monthIndex, 1)
  return new Date(year, monthIndex, Math.min(day, getDaysInMonth(first)))
}

// Quincenal = dos veces al mes, separadas 15 días (como la quincena del
// sueldo): día 7 → 7 y 22; día 15 → 15 y 30 (fin de mes si no existe);
// día 20 → 5 y 20. Así el calendario no se corre mes a mes.
export function biweeklyDays(anchorDay) {
  return anchorDay <= 15 ? [anchorDay, anchorDay + 15] : [anchorDay - 15, anchorDay]
}

// Texto corto para la fila del evento: "Cada mes, día 7", "Quincenal (7 y 22)".
export function repeatLabel(repeat, dateStr) {
  if (!dateStr || repeat === 'once') return 'Única vez'
  const anchor = parseISO(dateStr)
  if (repeat === 'daily')  return 'Cada día'
  if (repeat === 'weekly') return `Cada ${WEEKDAYS[anchor.getDay()]}`
  if (repeat === 'biweekly') {
    const [a, b] = biweeklyDays(anchor.getDate())
    return `Quincenal (días ${a} y ${b})`
  }
  if (repeat === 'monthly') return `Cada mes, día ${anchor.getDate()}`
  return ''
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Fechas (ISO) en que ocurre un evento dentro de [from, to], ambas inclusive.
 * - `event.date` es la primera ocurrencia (ancla); nunca hay ocurrencias antes.
 * - `event.until` (opcional) corta la repetición.
 * Cada fecha aparece una sola vez y en orden: un evento recurrente nunca se
 * cuenta dos veces el mismo día.
 */
export function expandOccurrences(event, from, to) {
  if (!event?.date || !from || !to || from > to) return []
  const repeat = REPEAT_VALUES.has(event.repeat) ? event.repeat : 'once'
  const last = event.until && event.until < to ? event.until : to
  if (event.date > last) return []

  if (repeat === 'once') return event.date >= from ? [event.date] : []

  const anchor = parseISO(event.date)
  const start = parseISO(from)
  const end = parseISO(last)
  const out = []
  const push = (date) => {
    if (date < anchor || date < start || date > end) return
    out.push(iso(date))
  }

  if (repeat === 'daily' || repeat === 'weekly') {
    const step = repeat === 'daily' ? 1 : 7
    // Salta directo a la primera ocurrencia >= from (no recorre el pasado).
    const gap = Math.max(0, differenceInCalendarDays(start, anchor))
    let date = addDays(anchor, Math.ceil(gap / step) * step)
    while (date <= end && out.length < MAX_OCCURRENCES) {
      push(date)
      date = addDays(date, step)
    }
    return out
  }

  // Mensual / quincenal: se recorre mes a mes desde el mes del ancla o desde
  // el mes de `from`, el que sea posterior.
  const anchorDay = anchor.getDate()
  const days = repeat === 'monthly' ? [anchorDay] : biweeklyDays(anchorDay)
  const firstMonth = start > anchor ? start : anchor
  let year = firstMonth.getFullYear()
  let month = firstMonth.getMonth()
  // Un mes antes por si el segundo día quincenal del mes previo cae en rango.
  month -= 1
  if (month < 0) { month = 11; year -= 1 }

  while (out.length < MAX_OCCURRENCES) {
    const monthStart = new Date(year, month, 1)
    if (monthStart > end) break
    const seen = new Set()
    for (const day of days) {
      const date = clampedDate(year, month, day)
      const key = iso(date)
      if (seen.has(key)) continue // 30 y 30 clampeados en febrero = una sola vez
      seen.add(key)
      push(date)
    }
    month += 1
    if (month > 11) { month = 0; year += 1 }
  }
  return out
}
