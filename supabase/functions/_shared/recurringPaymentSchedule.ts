// Misma lógica implementada en src/lib/recurringPaymentSchedule.js (Vite/
// browser no puede importar este archivo Deno y viceversa): si cambias el
// algoritmo aquí, replica el cambio también allá.

export interface RecurringPaymentRow {
  id: string
  schedule_type: 'FIXED_DAY' | 'MANUAL'
  due_day_of_month: number | null
  next_due_date: string | null
  reminder_days_before: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function nextFixedDayDueDate(dueDayOfMonth: number, fromDate = new Date()): string {
  const year = fromDate.getFullYear()
  const month = fromDate.getMonth() + 1
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

export function currentPeriodDueDate(payment: RecurringPaymentRow, fromDate = new Date()): string {
  if (payment.schedule_type === 'MANUAL') return payment.next_due_date as string
  return nextFixedDayDueDate(payment.due_day_of_month as number, fromDate)
}

export function daysUntil(dateStr: string, fromDate = new Date()): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const due = Date.UTC(y, m - 1, d)
  const from = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  return Math.round((due - from) / 86_400_000)
}

export function todayISO(fromDate = new Date()): string {
  return `${fromDate.getFullYear()}-${pad2(fromDate.getMonth() + 1)}-${pad2(fromDate.getDate())}`
}
