import { format, getDaysInMonth } from 'date-fns'

const ISO = 'yyyy-MM-dd'

// Fecha de vencimiento del mes de `monthDate`; un día 31 en un mes corto cae el
// último día (misma regla que la función SQL que genera los movimientos).
function dueInMonth(monthDate, day) {
  const d = Math.min(day, getDaysInMonth(monthDate))
  return new Date(monthDate.getFullYear(), monthDate.getMonth(), d)
}

// Primera fecha de vencimiento >= `from` (por defecto hoy), para mostrar "Próximo: …".
export function nextOccurrence(day, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const thisMonth = dueInMonth(start, day)
  if (thisMonth >= start) return format(thisMonth, ISO)
  return format(dueInMonth(new Date(start.getFullYear(), start.getMonth() + 1, 1), day), ISO)
}
