import { differenceInCalendarDays, parseISO, format } from 'date-fns'

// Misma lógica implementada en supabase/functions/_shared/recurringPaymentSchedule.ts
// (Deno no puede importar este archivo directamente): si cambias el algoritmo
// aquí, replica el cambio también allá.

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Último día calendario de un mes (1-12), en año `year`. */
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * Próxima fecha de vencimiento de un pago FIXED_DAY a partir de `fromDate`
 * (por defecto hoy): si el día configurado ya pasó este mes, salta al
 * siguiente. Si el mes no tiene ese día (ej. 31 en febrero), usa el último
 * día disponible de ese mes.
 */
export function nextFixedDayDueDate(dueDayOfMonth, fromDate = new Date()) {
  const year = fromDate.getFullYear()
  const month = fromDate.getMonth() + 1 // 1-12
  const day = fromDate.getDate()

  const clampedThisMonth = Math.min(dueDayOfMonth, lastDayOfMonth(year, month))
  if (day <= clampedThisMonth) {
    return `${year}-${pad2(month)}-${pad2(clampedThisMonth)}`
  }

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const clampedNextMonth = Math.min(dueDayOfMonth, lastDayOfMonth(nextYear, nextMonth))
  return `${nextYear}-${pad2(nextMonth)}-${pad2(clampedNextMonth)}`
}

/**
 * Fecha de vencimiento vigente de un pago recurrente, usada tanto para
 * decidir si está pagado como para calcular alertas.
 *
 * Un pago FIXED_DAY se paga una vez por mes calendario: su vencimiento es el
 * día configurado del mes en curso, aunque ya haya pasado (entonces queda
 * vencido hasta que se pague o empiece el mes siguiente).
 */
export function currentPeriodDueDate(payment, fromDate = new Date()) {
  if (payment.schedule_type === 'MANUAL') return payment.next_due_date
  const year = fromDate.getFullYear()
  const month = fromDate.getMonth() + 1
  const day = Math.min(payment.due_day_of_month, lastDayOfMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * ¿Existe un pago registrado para el periodo vigente? En FIXED_DAY basta un
 * pago en el mismo mes del vencimiento, sin importar el día exacto (así
 * sigue contando si luego se cambia el día de vencimiento).
 */
export function isPeriodPaid(payment, payments, fromDate = new Date()) {
  const due = currentPeriodDueDate(payment, fromDate)
  const samePeriod = payment.schedule_type === 'MANUAL'
    ? (date) => date === due
    : (date) => date.slice(0, 7) === due.slice(0, 7)
  return payments.some((p) => p.recurring_payment_id === payment.id && samePeriod(p.period_date))
}

export function daysUntil(dateStr, fromDate = new Date()) {
  return differenceInCalendarDays(parseISO(dateStr), fromDate)
}

export function todayISO(fromDate = new Date()) {
  return format(fromDate, 'yyyy-MM-dd')
}
