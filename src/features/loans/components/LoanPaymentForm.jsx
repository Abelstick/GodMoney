import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/formatters'
import { LOAN_TYPE } from '@/lib/loanStatus'
import styles from './LoanPaymentForm.module.css'

export function LoanPaymentForm({ loan, pendingInstallments = [], onSubmit, onCancel, loading }) {
  const { accounts } = useAccounts()
  const isLent = loan.type === LOAN_TYPE.LENT

  const [installmentId, setInstallmentId] = useState(pendingInstallments[0]?.id ?? '')
  const selectedInstallment = pendingInstallments.find((i) => i.id === installmentId) ?? null

  const defaults = useMemo(() => {
    if (!selectedInstallment) return { principal: '', interest: '' }
    const pendingTotal = Number(selectedInstallment.total_amount) - Number(selectedInstallment.paid_amount)
    if (Number(selectedInstallment.paid_amount) === 0) {
      return { principal: String(selectedInstallment.principal_amount), interest: String(selectedInstallment.interest_amount) }
    }
    return { principal: String(pendingTotal), interest: '0' }
  }, [selectedInstallment])

  const [principal, setPrincipal] = useState(defaults.principal)
  const [interest, setInterest]   = useState(defaults.interest)
  const [accountId, setAccountId] = useState(loan.account_id)
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [overpayConfirmed, setOverpayConfirmed] = useState(false)

  function handleInstallmentChange(e) {
    const id = e.target.value
    setInstallmentId(id)
    setOverpayConfirmed(false)
    const inst = pendingInstallments.find((i) => i.id === id)
    if (!inst) { setPrincipal(''); setInterest(''); return }
    const pendingTotal = Number(inst.total_amount) - Number(inst.paid_amount)
    if (Number(inst.paid_amount) === 0) {
      setPrincipal(String(inst.principal_amount))
      setInterest(String(inst.interest_amount))
    } else {
      setPrincipal(String(pendingTotal))
      setInterest('0')
    }
  }

  const total = (Number(principal) || 0) + (Number(interest) || 0)
  const loanPending = Number(loan.remaining_principal) + Number(loan.remaining_interest)
  const isOverpay = total > loanPending + 0.005

  function validate() {
    const errs = {}
    if (total <= 0) errs.total = 'El monto debe ser mayor a 0'
    if (Number(principal) < 0 || Number(interest) < 0) errs.total = 'Los montos no pueden ser negativos'
    if (!accountId) errs.account = 'Selecciona una cuenta'
    if (!paymentDate) errs.date = 'Obligatorio'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    if (isOverpay && !overpayConfirmed) {
      setOverpayConfirmed(true)
      return
    }
    onSubmit({
      loan_id: loan.id,
      installment_id: installmentId || null,
      account_id: accountId,
      principal_amount: Number(principal) || 0,
      interest_amount: Number(interest) || 0,
      payment_date: paymentDate,
      notes: notes.trim() || null,
    })
  }

  const installmentOptions = [
    { value: '', label: 'Pago libre (sin cuota específica)' },
    ...pendingInstallments.map((i) => ({
      value: i.id,
      label: `Cuota #${i.installment_number} — ${formatCurrency(Number(i.total_amount) - Number(i.paid_amount))} — vence ${i.due_date}`,
    })),
  ]

  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }))

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.hint}>
        {isLent
          ? `${loan.person_name} te devuelve dinero. Tu cuenta aumentará.`
          : `Le pagas a ${loan.person_name}. Tu cuenta disminuirá.`}
      </p>

      {pendingInstallments.length > 0 && (
        <Select label="Cuota a pagar" options={installmentOptions} value={installmentId} onChange={handleInstallmentChange} />
      )}

      <div className={styles.row2}>
        <Input label="Capital" type="number" min="0" step="0.01" prefix="S/"
          value={principal} onChange={(e) => { setPrincipal(e.target.value); setOverpayConfirmed(false) }} />
        <Input label="Interés" type="number" min="0" step="0.01" prefix="S/"
          value={interest} onChange={(e) => { setInterest(e.target.value); setOverpayConfirmed(false) }} />
      </div>

      <div className={styles.totalRow}>
        <span>Total del pago</span>
        <strong className={errors.total ? styles.errorText : ''}>{formatCurrency(total)}</strong>
      </div>
      {errors.total && <div className={styles.errorText}>{errors.total}</div>}

      <Select label="Cuenta" options={accountOptions} value={accountId}
        onChange={(e) => setAccountId(e.target.value)} error={errors.account} required />
      <Input label="Fecha de pago" type="date" value={paymentDate}
        onChange={(e) => setPaymentDate(e.target.value)} error={errors.date} required />
      <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {isOverpay && (
        <div className={styles.overpayWarning}>
          ⚠️ El monto ({formatCurrency(total)}) supera el saldo pendiente ({formatCurrency(loanPending)}). Confirma si deseas continuar.
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando…' : isOverpay && !overpayConfirmed ? 'Confirmar pago mayor al saldo' : 'Registrar pago'}
        </Button>
      </div>
    </form>
  )
}
