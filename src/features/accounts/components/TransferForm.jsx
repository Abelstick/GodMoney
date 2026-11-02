import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency, toInputDate } from '@/lib/formatters'
import styles from './AccountForm.module.css'

/**
 * Transferencia entre cuentas. Si el origen es una cuenta de ahorro, ofrece
 * "Lo voy a reponer": onSubmit recibe { willRepay, target_date } como 2º argumento.
 * preset: { from_account_id, willRepay } — p. ej. "Saqué dinero" desde una cuenta de ahorro.
 */
export function TransferForm({ accounts, onSubmit, onCancel, loading, preset = null }) {
  const active = accounts.filter((a) => !a.is_archived)
  const initialFrom = preset?.from_account_id ?? active[0]?.id ?? ''
  const [form, setForm] = useState({
    from_account_id: initialFrom,
    to_account_id: active.find((a) => a.id !== initialFrom && !a.is_savings)?.id
                   ?? active.find((a) => a.id !== initialFrom)?.id ?? '',
    amount: '',
    date: toInputDate(new Date()),
    note: '',
  })
  const [willRepay, setWillRepay]   = useState(preset?.willRepay ?? false)
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const from = active.find((a) => a.id === form.from_account_id)
  const canRepay = Boolean(from?.is_savings)

  function validate() {
    const errs = {}
    if (!form.from_account_id) errs.from = 'Elige la cuenta de origen'
    if (!form.to_account_id)   errs.to   = 'Elige la cuenta de destino'
    if (form.from_account_id && form.from_account_id === form.to_account_id)
      errs.to = 'El destino debe ser distinto al origen'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Ingresa un monto válido'
    if (!form.date) errs.date = 'La fecha es obligatoria'
    if (canRepay && willRepay && targetDate && targetDate < form.date)
      errs.target = 'Debe ser posterior a la fecha del retiro'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      from_account_id: form.from_account_id,
      to_account_id:   form.to_account_id,
      amount: Number(form.amount),
      date:   form.date,
      note:   form.note.trim() || null,
    }, {
      willRepay: canRepay && willRepay,
      target_date: targetDate || null,
    })
  }

  const options = (placeholder) => [
    { value: '', label: placeholder },
    ...active.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Select label="Desde" options={options('Selecciona cuenta')} value={form.from_account_id}
        onChange={set('from_account_id')} error={errors.from} />
      <Select label="Hacia" options={options('Selecciona cuenta')} value={form.to_account_id}
        onChange={set('to_account_id')} error={errors.to} />
      <Input label="Monto" type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
        value={form.amount} onChange={set('amount')} error={errors.amount} required
        hint={from && Number(form.amount) > Number(from.balance) ? 'Supera el saldo actual de la cuenta de origen (quedará en negativo)' : undefined} />
      <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      <Input label="Nota (opcional)" value={form.note} onChange={set('note')}
        placeholder={canRepay ? 'Ej: Para el alquiler' : 'Ej: Pasar a ahorros'} />

      {canRepay && (
        <div className={styles.repayBox}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={willRepay} onChange={(e) => setWillRepay(e.target.checked)} />
            Lo voy a reponer
          </label>
          {willRepay && (
            <>
              <Input label="Reponer antes de (opcional)" type="date" min={form.date}
                value={targetDate} onChange={(e) => setTargetDate(e.target.value)} error={errors.target} />
              <p className={styles.hint}>
                Se sumará a lo que le debes a «{from.name}». Podrás reponerlo por partes cuando quieras.
              </p>
            </>
          )}
        </div>
      )}

      <p className={styles.hint}>
        Una transferencia mueve saldo entre tus cuentas y no cuenta como gasto ni como ingreso.
        {canRepay && ' Si lo gastaste directamente, mejor registra el gasto con «Pagado desde» esta cuenta.'}
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Transferir'}</Button>
      </div>
    </form>
  )
}
