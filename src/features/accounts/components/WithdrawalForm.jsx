import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency } from '@/lib/formatters'
import styles from './AccountForm.module.css'

const ORIGINS = [
  { value: 'DEFICIT', label: 'Un periodo que cerré en negativo' },
  { value: 'MANUAL',  label: 'Un retiro anterior que no registré' },
]

// Deudas con el ahorro que no nacen de una transferencia registrada en la app
// (los retiros nuevos se marcan con "Lo voy a reponer" al transferir).
// initial: valores de partida (p. ej. desde la tarjeta de déficit de Movimientos).
export function WithdrawalForm({ accounts, onSubmit, onCancel, loading, initial = {} }) {
  const active  = accounts.filter((a) => !a.is_archived)
  const savings = active.filter((a) => a.is_savings)
  const choices = savings.length ? savings : active

  const [form, setForm] = useState(() => ({
    savings_account_id: choices[0]?.id ?? '',
    origin: 'DEFICIT',
    period_label: String(new Date().getFullYear() - 1),
    amount: '',
    reason: '',
    target_date: '',
    deduct: false,
    ...initial,
  }))
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const isDeficit = form.origin === 'DEFICIT'

  function validate() {
    const errs = {}
    if (!form.savings_account_id) errs.account = 'Elige la cuenta de ahorro'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Ingresa un monto válido'
    if (isDeficit && !form.period_label.trim()) errs.period = 'Indica el periodo (ej. 2025)'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const period = isDeficit ? form.period_label.trim() : null
    onSubmit({
      savings_account_id: form.savings_account_id,
      origin: form.origin,
      amount: Number(form.amount),
      period_label: period,
      reason: form.reason.trim() || (period ? `Déficit ${period}` : null),
      target_date: form.target_date || null,
      deduct_from_balance: Boolean(form.deduct),
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Select label="¿De dónde viene?" options={ORIGINS} value={form.origin} onChange={set('origin')} />
      <Select
        label="Cuenta de ahorro"
        options={[{ value: '', label: 'Selecciona cuenta' }, ...choices.map((a) => ({ value: a.id, label: a.name }))]}
        value={form.savings_account_id} onChange={set('savings_account_id')} error={errors.account}
        description={savings.length ? undefined : 'Tip: marca tus cuentas de ahorro en "Editar" para verlas solo a ellas aquí'}
      />
      {isDeficit && (
        <Input label="Periodo" value={form.period_label} onChange={set('period_label')}
          error={errors.period} placeholder="Ej: 2025 o 2026-03" />
      )}
      <Input label={isDeficit ? 'Monto que cubrí con el ahorro' : 'Monto que saqué'}
        type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
        value={form.amount} onChange={set('amount')} error={errors.amount} required />
      <Input label="Motivo (opcional)" value={form.reason} onChange={set('reason')}
        placeholder={isDeficit ? `Déficit ${form.period_label || ''}`.trim() : 'Ej: Reparación del auto'} />
      <Input label="Reponer antes de (opcional)" type="date"
        value={form.target_date} onChange={set('target_date')} />
      <label className={styles.checkRow}>
        <input type="checkbox" checked={form.deduct}
          onChange={(e) => setForm((f) => ({ ...f, deduct: e.target.checked }))} />
        Descontar también del saldo de la cuenta
      </label>
      <p className={styles.hint}>
        {form.deduct
          ? `Se restará ${Number(form.amount) > 0 ? formatCurrency(Number(form.amount)) : 'el monto'} del saldo de ${choices.find((a) => a.id === form.savings_account_id)?.name ?? 'la cuenta'}. Márcalo solo si el saldo que ves en la app aún no refleja ese dinero que salió.`
          : 'Solo registra lo que falta reponer; el saldo no cambia (úsalo si el saldo ya refleja ese dinero que salió). El saldo vuelve a subir cuando registras reposiciones.'}
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Registrar deuda'}</Button>
      </div>
    </form>
  )
}
