import { useEffect, useMemo, useState } from 'react'
import { addMonths, format } from 'date-fns'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { expenseService } from '@/services/expenseService'
import { formatCurrency, getMonthRange } from '@/lib/formatters'
import { currentPeriodDueDate } from '@/lib/recurringPaymentSchedule'
import styles from './MarkPaidModal.module.css'

export function MarkPaidModal({ payment, onSubmit, onCancel, loading }) {
  const isManual = payment.schedule_type === 'MANUAL'
  const periodDate = useMemo(() => currentPeriodDueDate(payment), [payment])

  const [expenses, setExpenses] = useState([])
  const [expenseId, setExpenseId] = useState('')
  const [amount, setAmount] = useState(payment.amount ? String(payment.amount) : '')
  const [notes, setNotes] = useState('')
  const [nextDueDate, setNextDueDate] = useState(
    isManual ? format(addMonths(new Date(periodDate), 1), 'yyyy-MM-dd') : ''
  )
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const { from, to } = getMonthRange()
    expenseService.getByMonth(from, to).then(setExpenses).catch(() => setExpenses([]))
  }, [])

  function handleExpenseChange(e) {
    const id = e.target.value
    setExpenseId(id)
    const expense = expenses.find((ex) => ex.id === id)
    if (expense) setAmount(String(expense.amount))
  }

  function validate() {
    const errs = {}
    if (!amount || Number(amount) <= 0) errs.amount = 'Debe ser mayor a 0'
    if (isManual && !nextDueDate) errs.nextDueDate = 'Obligatorio'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      recurring_payment_id: payment.id,
      period_date: periodDate,
      amount: Number(amount),
      expense_id: expenseId || null,
      notes: notes.trim() || null,
      next_due_date: isManual ? nextDueDate : null,
    })
  }

  const expenseOptions = [
    { value: '', label: 'No vincular a un gasto (solo marcar pagado)' },
    ...expenses.map((ex) => ({
      value: ex.id,
      label: `${formatCurrency(ex.amount)} — ${ex.description || ex.category?.name || 'Gasto'} (${ex.date})`,
    })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.hint}>
        Vencimiento vigente: <strong>{periodDate}</strong>
      </p>

      <Select label="Vincular a un gasto ya registrado (opcional)" options={expenseOptions}
        value={expenseId} onChange={handleExpenseChange} />

      <Input label="Monto pagado" type="number" min="0" step="0.01" prefix="S/"
        value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} required />

      {isManual && (
        <Input label="Próxima fecha de vencimiento" type="date"
          value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} error={errors.nextDueDate} required
          hint="Este pago no tiene día fijo, así que necesitamos saber cuándo vence el próximo" />
      )}

      <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Registrando…' : 'Marcar como pagado'}</Button>
      </div>
    </form>
  )
}
