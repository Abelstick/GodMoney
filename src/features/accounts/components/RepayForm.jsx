import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency, toInputDate } from '@/lib/formatters'
import styles from './AccountForm.module.css'

// Reponer a una cuenta de ahorro: cualquier monto, la BD lo reparte entre las
// deudas abiertas (la más antigua primero).
export function RepayForm({ savingsAccount, accounts, pending, onSubmit, onCancel, loading }) {
  const sources = accounts.filter((a) => !a.is_archived && a.id !== savingsAccount.id)
  const [form, setForm] = useState({
    from_account_id: sources.find((a) => !a.is_savings)?.id ?? sources[0]?.id ?? '',
    amount: pending > 0 ? String(Math.round(pending * 100) / 100) : '',
    date: toInputDate(new Date()),
    note: '',
  })
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const from = sources.find((a) => a.id === form.from_account_id)
  const amount = Number(form.amount)

  function validate() {
    const errs = {}
    if (!form.from_account_id) errs.from = 'Elige de qué cuenta sale el dinero'
    if (!amount || amount <= 0) errs.amount = 'Ingresa un monto válido'
    if (!form.date) errs.date = 'La fecha es obligatoria'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      savings_account_id: savingsAccount.id,
      from_account_id: form.from_account_id,
      amount,
      date: form.date,
      note: form.note.trim() || null,
    })
  }

  let hint = `Le debes ${formatCurrency(pending)} a ${savingsAccount.name}. Puedes reponer solo una parte.`
  if (amount > 0 && amount < pending) hint = `Quedarán ${formatCurrency(pending - amount)} por reponer.`
  if (amount > 0 && amount >= pending && pending > 0) hint = amount > pending
    ? `Cubre toda la deuda y ${formatCurrency(amount - pending)} queda como ahorro extra.`
    : 'Con esto repones todo lo que debías.'

  if (!sources.length) {
    return <p className={styles.hint}>Necesitas otra cuenta (de donde saldrá el dinero) para reponer.</p>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Select
        label="¿De qué cuenta sale el dinero?"
        options={sources.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }))}
        value={form.from_account_id} onChange={set('from_account_id')} error={errors.from}
      />
      <Input label="Monto a reponer" type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
        value={form.amount} onChange={set('amount')} error={errors.amount} required
        hint={from && amount > Number(from.balance) ? `Supera el saldo de ${from.name} (quedará en negativo)` : hint} />
      <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      <Input label="Nota (opcional)" value={form.note} onChange={set('note')} placeholder="Ej: Repongo con el sueldo" />
      <p className={styles.hint}>
        Pasa dinero a tu ahorro y descuenta de tus deudas, empezando por la más antigua. No cuenta como gasto.
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" variant="success" disabled={loading}>{loading ? 'Guardando…' : 'Reponer'}</Button>
      </div>
    </form>
  )
}
