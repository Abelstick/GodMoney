import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency, toInputDate } from '@/lib/formatters'
import styles from './AccountForm.module.css'

/**
 * - repaying: deuda con el ahorro que se está reponiendo. Fija el destino en su
 *   cuenta de ahorro y propone el monto pendiente.
 * - Si el origen es una cuenta de ahorro (y no se está reponiendo), ofrece
 *   "Lo voy a reponer": onSubmit recibe { willRepay, target_date } como 2º argumento.
 */
export function TransferForm({ accounts, onSubmit, onCancel, loading, repaying = null, pending = 0 }) {
  const active = accounts.filter((a) => !a.is_archived)
  const firstNotTo = (toId) => active.find((a) => a.id !== toId)?.id ?? ''

  const [form, setForm] = useState(() => repaying ? {
    from_account_id: active.find((a) => a.id !== repaying.savings_account_id && !a.is_savings)?.id
                     ?? firstNotTo(repaying.savings_account_id),
    to_account_id:   repaying.savings_account_id,
    amount: pending > 0 ? String(pending) : '',
    date: toInputDate(new Date()),
    note: `Reposición${repaying.reason ? `: ${repaying.reason}` : ' de ahorro'}`,
  } : {
    from_account_id: active[0]?.id ?? '',
    to_account_id:   active[1]?.id ?? '',
    amount: '',
    date: toInputDate(new Date()),
    note: '',
  })
  const [willRepay, setWillRepay]   = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const from = active.find((a) => a.id === form.from_account_id)
  const canRepay = !repaying && Boolean(from?.is_savings)

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
        onChange={set('to_account_id')} error={errors.to} disabled={Boolean(repaying)} />
      <Input label="Monto" type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
        value={form.amount} onChange={set('amount')} error={errors.amount} required
        hint={from && Number(form.amount) > Number(from.balance)
          ? 'Supera el saldo actual de la cuenta de origen (quedará en negativo)'
          : repaying && pending > 0 ? `Falta reponer ${formatCurrency(pending)}` : undefined} />
      <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      <Input label="Nota (opcional)" value={form.note} onChange={set('note')} placeholder="Ej: Pasar a ahorros" />

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
                Quedará como deuda con tu ahorro en «{from.name}» y podrás ir reponiéndola desde Cuentas.
              </p>
            </>
          )}
        </div>
      )}

      <p className={styles.hint}>
        {repaying
          ? 'La reposición devuelve dinero a tu ahorro: no cuenta como gasto ni como ahorro nuevo.'
          : 'Una transferencia mueve saldo entre tus cuentas y no cuenta como gasto ni como ingreso.'}
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : repaying ? 'Reponer' : 'Transferir'}
        </Button>
      </div>
    </form>
  )
}
