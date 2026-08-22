import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useAccounts } from '@/hooks/useAccounts'
import { buildInstallmentSchedule, scheduleTotals } from '@/lib/loanAmortization'
import { formatCurrency } from '@/lib/formatters'
import { LOAN_TYPE } from '@/lib/loanStatus'
import { InstallmentTable } from './InstallmentTable'
import styles from './LoanForm.module.css'

const INTEREST_TYPE_OPTIONS = [
  { value: 'NONE', label: 'Sin interés' },
  { value: 'PERCENTAGE', label: 'Con interés (%)' },
]

const EMPTY = {
  type: LOAN_TYPE.BORROWED,
  person_name: '',
  description: '',
  principal_amount: '',
  interest_type: 'NONE',
  interest_rate: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '',
  number_of_installments: '1',
  account_id: '',
  notes: '',
}

export function LoanForm({ onSubmit, onCancel, loading, existingLoans = [] }) {
  const { accounts } = useAccounts()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)

  const set = (field) => (e) => {
    setDuplicateConfirmed(false)
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const isSingleInstallment = Number(form.number_of_installments) <= 1
  const hasInterest = form.interest_type === 'PERCENTAGE'

  const preview = useMemo(() => {
    const principal = Number(form.principal_amount)
    const n = Number(form.number_of_installments)
    if (!(principal > 0) || !form.start_date || !(n > 0)) return null
    if (isSingleInstallment && !form.due_date) return null

    try {
      const installments = buildInstallmentSchedule({
        principal,
        interestRate: Number(form.interest_rate) || 0,
        interestType: form.interest_type,
        numberOfInstallments: n,
        startDate: form.start_date,
        dueDate: form.due_date,
      })
      return { installments, totals: scheduleTotals(installments) }
    } catch {
      return null
    }
  }, [form.principal_amount, form.number_of_installments, form.start_date, form.due_date, form.interest_rate, form.interest_type, isSingleInstallment])

  const duplicate = useMemo(() => existingLoans.find((l) =>
    l.type === form.type &&
    l.status === 'ACTIVE' &&
    l.person_name.trim().toLowerCase() === form.person_name.trim().toLowerCase() &&
    Number(l.principal_amount) === Number(form.principal_amount)
  ), [existingLoans, form.type, form.person_name, form.principal_amount])

  function validate() {
    const errs = {}
    if (!form.person_name.trim()) errs.person_name = 'Obligatorio'
    if (!form.principal_amount || Number(form.principal_amount) <= 0) errs.principal_amount = 'Debe ser mayor a 0'
    if (hasInterest && (form.interest_rate === '' || Number(form.interest_rate) < 0)) errs.interest_rate = 'Tasa inválida'
    if (!form.start_date) errs.start_date = 'Obligatorio'
    if (isSingleInstallment && !form.due_date) errs.due_date = 'Obligatorio'
    if (isSingleInstallment && form.due_date && form.due_date < form.start_date) errs.due_date = 'Debe ser posterior al inicio'
    if (!form.number_of_installments || Number(form.number_of_installments) <= 0) errs.number_of_installments = 'Debe ser mayor a 0'
    if (!form.account_id) errs.account_id = 'Selecciona una cuenta'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    if (duplicate && !duplicateConfirmed) {
      setDuplicateConfirmed(true)
      return
    }
    onSubmit({
      type: form.type,
      person_name: form.person_name.trim(),
      description: form.description.trim() || null,
      principal_amount: Number(form.principal_amount),
      interest_type: form.interest_type,
      interest_rate: hasInterest ? Number(form.interest_rate) : 0,
      start_date: form.start_date,
      due_date: form.due_date || null,
      number_of_installments: Number(form.number_of_installments),
      account_id: form.account_id,
      notes: form.notes.trim() || null,
    })
  }

  const accountOptions = [
    { value: '', label: accounts.length ? 'Selecciona una cuenta' : 'Crea una cuenta primero en "Cuentas"' },
    ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.typeToggle}>
        <button
          type="button"
          className={`${styles.typeBtn} ${form.type === LOAN_TYPE.BORROWED ? styles.typeActive : ''}`}
          onClick={() => setForm((f) => ({ ...f, type: LOAN_TYPE.BORROWED }))}
        >
          <span className={styles.typeIcon}>📥</span>
          <span>Me prestaron</span>
          <span className={styles.typeHint}>Recibo dinero, debo devolverlo</span>
        </button>
        <button
          type="button"
          className={`${styles.typeBtn} ${form.type === LOAN_TYPE.LENT ? styles.typeActive : ''}`}
          onClick={() => setForm((f) => ({ ...f, type: LOAN_TYPE.LENT }))}
        >
          <span className={styles.typeIcon}>📤</span>
          <span>Yo presté</span>
          <span className={styles.typeHint}>Entrego dinero, deben devolvérmelo</span>
        </button>
      </div>

      <Input
        label={form.type === LOAN_TYPE.BORROWED ? '¿Quién te prestó?' : '¿A quién le prestaste?'}
        value={form.person_name} onChange={set('person_name')} error={errors.person_name} required
        placeholder="Nombre de la persona o entidad"
      />
      <Input label="Descripción (opcional)" value={form.description} onChange={set('description')}
        placeholder="Ej: Préstamo para el carro" />

      <div className={styles.row2}>
        <Input label="Monto" type="number" min="0" step="0.01" prefix="S/"
          value={form.principal_amount} onChange={set('principal_amount')} error={errors.principal_amount} required />
        <Select label="Cuenta relacionada" options={accountOptions}
          value={form.account_id} onChange={set('account_id')} error={errors.account_id} required />
      </div>

      <div className={styles.row2}>
        <Select label="Tipo de interés" options={INTEREST_TYPE_OPTIONS} value={form.interest_type} onChange={set('interest_type')} />
        <Input label="Tasa de interés (%)" type="number" min="0" step="0.01" suffix="%"
          value={form.interest_rate} onChange={set('interest_rate')} error={errors.interest_rate}
          disabled={!hasInterest} placeholder={hasInterest ? '0.00' : '—'} />
      </div>

      <div className={styles.row2}>
        <Input label="Fecha de inicio" type="date" value={form.start_date} onChange={set('start_date')} error={errors.start_date} required />
        <Input label="Número de cuotas" type="number" min="1" step="1"
          value={form.number_of_installments} onChange={set('number_of_installments')} error={errors.number_of_installments} required />
      </div>

      {isSingleInstallment ? (
        <Input label="Fecha de devolución" type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} required />
      ) : (
        <p className={styles.autoDueHint}>
          Las cuotas se generan mensualmente desde la fecha de inicio; la fecha de vencimiento final se calcula automáticamente.
        </p>
      )}

      <Input label="Notas (opcional)" value={form.notes} onChange={set('notes')} placeholder="Notas adicionales" />

      {preview && (
        <div className={styles.previewBlock}>
          <div className={styles.previewHeader}>
            <span>Cronograma de cuotas</span>
            <span className={styles.previewTotals}>
              Capital {formatCurrency(preview.totals.principal)} · Interés {formatCurrency(preview.totals.interest)} · Total {formatCurrency(preview.totals.total)}
            </span>
          </div>
          <InstallmentTable installments={preview.installments} />
        </div>
      )}

      {duplicate && (
        <div className={styles.duplicateWarning}>
          ⚠️ Ya existe un préstamo activo con {duplicate.person_name} por {formatCurrency(duplicate.principal_amount)}. Si continúas, se creará un préstamo adicional.
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : duplicate && !duplicateConfirmed ? 'Crear de todas formas' : 'Crear préstamo'}
        </Button>
      </div>
    </form>
  )
}
