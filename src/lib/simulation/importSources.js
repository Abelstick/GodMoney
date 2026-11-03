import { addDays, parseISO } from 'date-fns'
import { nextOccurrence } from '@/lib/recurringSchedule'
import { currentPeriodDueDate, isPeriodPaid, nextFixedDayDueDate } from '@/lib/recurringPaymentSchedule'
import { formatDate } from '@/lib/formatters'
import { createEvent } from './scenarioModel'
import { toCents } from './money'

// Convierte tus datos reales (gastos/ingresos automáticos, pagos recurrentes,
// cuotas de préstamos) en eventos hipotéticos que el usuario puede elegir
// importar. Son COPIAS: el simulador nunca modifica el dato original.

const laterOf = (a, b) => (a > b ? a : b)
const amountText = (value) => (toCents(value) / 100).toFixed(2)

// ── Gastos e ingresos automáticos (plantillas mensuales, migración 013) ──
export function fromRecurringTransaction(rt, { from, to }) {
  if (!rt.is_active || toCents(rt.amount) <= 0) return null
  if (rt.end_date && rt.end_date < from) return null
  const date = nextOccurrence(rt.day_of_month, parseISO(laterOf(from, rt.start_date ?? from)))
  if (date > to || (rt.end_date && date > rt.end_date)) return null
  const income = rt.type === 'income'
  return {
    key: `recurring_tx:${rt.id}`,
    group: income ? 'income' : 'expense',
    suggested: true,
    note: `Automático, cada mes el día ${rt.day_of_month}`,
    event: createEvent({
      type: income ? 'income' : 'expense',
      description: rt.description || rt.category?.name || (income ? 'Ingreso mensual' : 'Gasto mensual'),
      amount: amountText(rt.amount),
      date,
      repeat: 'monthly',
      until: rt.end_date ?? null,
      categoryId: rt.category_id ?? null,
      categoryName: rt.category?.name ?? null,
      source: { kind: 'recurring_tx', id: rt.id },
    }),
  }
}

// Próxima fecha que falta pagar de un pago recurrente, o null si no aplica.
function pendingDueDate(rp, ledger, from) {
  const fromDate = parseISO(from)
  const paid = isPeriodPaid(rp, ledger, fromDate)
  if (rp.schedule_type === 'FIXED_DAY') {
    const due = currentPeriodDueDate(rp, fromDate)
    // Si ya pagaste el periodo vigente, el siguiente vence el mes que viene.
    return paid ? nextFixedDayDueDate(rp.due_day_of_month, addDays(parseISO(due), 1)) : due
  }
  return paid ? null : rp.next_due_date
}

// ── Pagos recurrentes con monto (migración 006) ──
export function fromRecurringPayment(rp, ledger, { from, to }) {
  if (!rp.is_active || toCents(rp.amount) <= 0) return null
  const due = pendingDueDate(rp, ledger, from)
  if (!due) return null
  const fixed = rp.schedule_type === 'FIXED_DAY'
  const date = laterOf(due, from) // un pago vencido se cuenta desde hoy
  if (date > to) return null
  let note = `Pago recurrente, vence el día ${rp.due_day_of_month}`
  if (!fixed) note = due < from ? `Pago pendiente, venció el ${formatDate(due)}` : 'Pago pendiente'
  return {
    key: `recurring_payment:${rp.id}`,
    group: 'pending',
    suggested: true,
    note,
    event: createEvent({
      type: 'expense',
      description: rp.name,
      amount: amountText(rp.amount),
      date,
      repeat: fixed ? 'monthly' : 'once',
      categoryId: rp.category_id ?? null,
      categoryName: rp.category?.name ?? null,
      source: { kind: 'recurring_payment', id: rp.id },
    }),
  }
}

// ── Cuotas pendientes de préstamos (lo que debes o lo que te deben) ──
export function fromInstallment(inst, { from, to }) {
  const remaining = toCents(inst.total_amount) - toCents(inst.paid_amount)
  if (remaining <= 0 || !inst.loan || inst.due_date > to) return null
  const lent = inst.loan.type === 'LENT'
  const overdue = inst.due_date < from
  const person = inst.loan.person_name
  return {
    key: `installment:${inst.id}`,
    group: lent ? 'income' : 'pending',
    suggested: true,
    note: overdue ? `Cuota vencida el ${formatDate(inst.due_date)}` : `Cuota ${inst.installment_number}`,
    event: createEvent({
      type: lent ? 'income' : 'debt',
      description: lent
        ? `Cobro a ${person} (cuota ${inst.installment_number})`
        : `Cuota ${inst.installment_number} · ${person}`,
      amount: (remaining / 100).toFixed(2),
      date: overdue ? from : inst.due_date,
      repeat: 'once',
      source: { kind: 'installment', id: inst.id },
    }),
  }
}

// Un pago recurrente con el mismo monto y la misma categoría (o el mismo día)
// que un gasto automático probablemente es el mismo gasto registrado dos
// veces: se ofrece desmarcado para no contarlo doble.
export function flagPossibleDuplicates(candidates) {
  const automatic = candidates.filter((c) => c.event.source.kind === 'recurring_tx' && c.event.type === 'expense')
  const sameDay = (a, b) => parseISO(a.event.date).getDate() === parseISO(b.event.date).getDate()
  const sameCategory = (a, b) => Boolean(a.event.categoryId) && a.event.categoryId === b.event.categoryId
  return candidates.map((c) => {
    if (c.event.source.kind !== 'recurring_payment') return c
    const twin = automatic.find((a) =>
      toCents(a.event.amount) === toCents(c.event.amount) && (sameCategory(a, c) || sameDay(a, c)))
    if (!twin) return c
    return { ...c, suggested: false, note: `Parece el mismo que «${twin.event.description}» (gasto automático)` }
  })
}

/**
 * Todos los candidatos a importar dentro de la ventana [from, to].
 * Devuelve [{ key, group, event, note, suggested }].
 */
export function importCandidates({
  recurringTransactions = [], recurringPayments = [], ledger = [], installments = [], from, to,
}) {
  const window = { from, to }
  const all = [
    ...recurringTransactions.map((rt) => fromRecurringTransaction(rt, window)),
    ...recurringPayments.map((rp) => fromRecurringPayment(rp, ledger, window)),
    ...installments.map((inst) => fromInstallment(inst, window)),
  ].filter(Boolean)
  return flagPossibleDuplicates(all)
}

export const IMPORT_GROUPS = [
  { value: 'income',  label: 'Ingresos futuros esperados' },
  { value: 'pending', label: 'Pagos pendientes' },
  { value: 'expense', label: 'Gastos recurrentes' },
]
