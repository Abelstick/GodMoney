import { addDays, addMonths, format, parseISO } from 'date-fns'
import { currentPeriodDueDate, isPeriodPaid, todayISO } from './recurringPaymentSchedule'

// "Monto aproximado": el periodo se da por pagado cuando los gastos suman al
// menos esta fracción del monto.
const AMOUNT_TOLERANCE = 0.25

const ISO = 'yyyy-MM-dd'

function normalize(text) {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Vencimiento anterior al vigente: los gastos posteriores a él cuentan para este periodo. */
function previousDueDate(payment, due) {
  if (payment.schedule_type !== 'FIXED_DAY') return format(addMonths(parseISO(due), -1), ISO)
  const [year, month] = due.split('-').map(Number)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const day = Math.min(payment.due_day_of_month, new Date(prevYear, prevMonth, 0).getDate())
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Periodo vigente: los gastos con fecha entre `from` y `until` (inclusive)
 * pagan el vencimiento `due`. Empieza el día siguiente al vencimiento
 * anterior (`after`) y termina en el vigente, o en hoy si ya venció.
 */
export function periodWindow(payment, fromDate = new Date()) {
  const due = currentPeriodDueDate(payment, fromDate)
  const today = todayISO(fromDate)
  const after = previousDueDate(payment, due)
  return { due, after, from: format(addDays(parseISO(after), 1), ISO), until: due > today ? due : today }
}

/** Pagos activos cuyo periodo vigente aún no está pagado. */
export function pendingRecurringPayments(payments, ledger, fromDate = new Date()) {
  return payments.filter((p) => p.is_active && !isPeriodPaid(p, ledger, fromDate))
}

/** Clave de un periodo que el usuario dejó pendiente a mano ("Deshacer"). */
export function unlinkKey(recurringPaymentId, periodDate) {
  return `${recurringPaymentId}:${periodDate}`
}

/**
 * Qué gastos cuentan para el periodo vigente de un pago y si ya lo cubren.
 *
 * - Con categoría que ningún otro pago activo usa: cuentan todos los gastos
 *   de esa categoría en el periodo.
 * - Con categoría compartida (`sharedWith`) o sin categoría: solo los gastos
 *   cuya descripción contiene el nombre del pago.
 *
 * Está cubierto (`satisfied`) cuando esos gastos suman al menos el monto
 * aproximado (con tolerancia), o hay alguno si el monto es variable.
 * `used` son gastos ya vinculados a otro pago.
 */
export function evaluatePeriod(payment, payments, expenses, { fromDate = new Date(), used = new Set() } = {}) {
  const window = periodWindow(payment, fromDate)
  const name = normalize(payment.name)
  const expected = Number(payment.amount) || null
  const sharedWith = payment.category_id
    ? payments.filter((p) => p.id !== payment.id && p.is_active && p.category_id === payment.category_id)
    : []
  const byCategory = Boolean(payment.category_id) && !sharedWith.length

  const counted = expenses
    .filter((e) => !used.has(e.id) && e.date >= window.from && e.date <= window.until)
    .filter((e) => !payment.category_id || e.category_id === payment.category_id)
    .filter((e) => byCategory || (Boolean(name) && normalize(e.description).includes(name)))
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = Math.round(counted.reduce((sum, e) => sum + Number(e.amount), 0) * 100) / 100
  const needed = expected ? Math.round(expected * (1 - AMOUNT_TOLERANCE) * 100) / 100 : 0
  return { ...window, expected, needed, sharedWith, byCategory, counted, total, satisfied: counted.length > 0 && total >= needed }
}

/**
 * Empareja gastos ya registrados con los pagos recurrentes pendientes.
 * El pago queda vinculado al gasto más reciente y por el total de los gastos
 * que cuentan. `excluded` son periodos que el usuario dejó pendientes a mano.
 */
export function matchExpensesToRecurringPayments(payments, ledger, expenses, { fromDate = new Date(), excluded = new Set() } = {}) {
  const used = new Set(ledger.map((l) => l.expense_id).filter(Boolean))
  const matches = []
  for (const payment of pendingRecurringPayments(payments, ledger, fromDate)) {
    const period = evaluatePeriod(payment, payments, expenses, { fromDate, used })
    if (!period.satisfied || excluded.has(unlinkKey(payment.id, period.due))) continue
    period.counted.forEach((e) => used.add(e.id))
    matches.push({
      payment,
      expense: period.counted[0],
      expenses: period.counted,
      amount: period.total,
      period_date: period.due,
      next_due_date: payment.schedule_type === 'MANUAL' ? format(addMonths(parseISO(period.due), 1), ISO) : null,
    })
  }
  return matches
}
