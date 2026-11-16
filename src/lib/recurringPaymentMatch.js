import { addMonths, format, parseISO } from 'date-fns'
import { currentPeriodDueDate, isPeriodPaid, todayISO } from './recurringPaymentSchedule'

// Un gasto cuyo monto se aleja más que esto del "monto aproximado" del pago
// recurrente no se vincula solo por categoría (sí por nombre).
const AMOUNT_TOLERANCE = 0.25

function normalize(text) {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Vencimiento anterior al vigente: los gastos posteriores a él cuentan para este periodo. */
function previousDueDate(payment, due) {
  if (payment.schedule_type !== 'FIXED_DAY') return format(addMonths(parseISO(due), -1), 'yyyy-MM-dd')
  const [year, month] = due.split('-').map(Number)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const day = Math.min(payment.due_day_of_month, new Date(prevYear, prevMonth, 0).getDate())
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Rango de fechas de gasto que pagan el periodo vigente: después del
 * vencimiento anterior y hasta el vigente (o hasta hoy si ya venció).
 */
export function periodWindow(payment, fromDate = new Date()) {
  const due = currentPeriodDueDate(payment, fromDate)
  const today = todayISO(fromDate)
  return { due, after: previousDueDate(payment, due), until: due > today ? due : today }
}

/** Pagos activos cuyo periodo vigente aún no está pagado. */
export function pendingRecurringPayments(payments, ledger, fromDate = new Date()) {
  return payments.filter((p) => p.is_active && !isPeriodPaid(p, ledger, fromDate))
}

export function unlinkKey(recurringPaymentId, expenseId) {
  return `${recurringPaymentId}:${expenseId}`
}

/**
 * Empareja gastos ya registrados con los pagos recurrentes pendientes.
 *
 * Un gasto paga un pago recurrente si cae en su periodo vigente y:
 * - su descripción contiene el nombre del pago (y, si el pago tiene
 *   categoría, el gasto es de esa categoría), o
 * - es de la categoría del pago, ningún otro pago activo usa esa categoría
 *   y el monto se parece al monto aproximado (si lo tiene).
 *
 * `excluded` son pares pago:gasto que el usuario desvinculó a mano.
 * Cada gasto paga como mucho un pago recurrente.
 */
export function matchExpensesToRecurringPayments(payments, ledger, expenses, { fromDate = new Date(), excluded = new Set() } = {}) {
  const used = new Set(ledger.map((l) => l.expense_id).filter(Boolean))
  const categoryUse = new Map()
  for (const p of payments) {
    if (p.is_active && p.category_id) categoryUse.set(p.category_id, (categoryUse.get(p.category_id) ?? 0) + 1)
  }

  const matches = []
  for (const payment of pendingRecurringPayments(payments, ledger, fromDate)) {
    const { due, after, until } = periodWindow(payment, fromDate)
    const name = normalize(payment.name)
    const expected = Number(payment.amount) || null
    const categoryIsExclusive = payment.category_id && categoryUse.get(payment.category_id) === 1

    const candidates = []
    for (const expense of expenses) {
      if (used.has(expense.id) || excluded.has(unlinkKey(payment.id, expense.id))) continue
      if (expense.date <= after || expense.date > until) continue
      if (payment.category_id && expense.category_id !== payment.category_id) continue

      const nameMatch = Boolean(name) && normalize(expense.description).includes(name)
      const distance = expected ? Math.abs(Number(expense.amount) - expected) / expected : 0
      const categoryMatch = categoryIsExclusive && distance <= AMOUNT_TOLERANCE
      if (nameMatch || categoryMatch) candidates.push({ expense, nameMatch, distance })
    }
    if (!candidates.length) continue

    candidates.sort((a, b) =>
      (b.nameMatch - a.nameMatch) || (a.distance - b.distance) || b.expense.date.localeCompare(a.expense.date))
    const { expense } = candidates[0]
    used.add(expense.id)
    matches.push({
      payment,
      expense,
      period_date: due,
      next_due_date: payment.schedule_type === 'MANUAL' ? format(addMonths(parseISO(due), 1), 'yyyy-MM-dd') : null,
    })
  }
  return matches
}
