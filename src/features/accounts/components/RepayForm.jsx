import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { toCents } from '@/lib/simulation/money'
import { autoAllocate, checkAllocation, toggleDebt } from '@/lib/repayAllocation'
import styles from './AccountForm.module.css'

const round2 = (n) => String(Math.round(n * 100) / 100)

// Reparto automático como texto de los campos (las deudas sin monto quedan vacías).
function autoValues(debts, amount) {
  const auto = autoAllocate(debts, amount)
  return Object.fromEntries(debts.map((d) => [d.id, auto[d.id] > 0 ? String(auto[d.id]) : '']))
}

// Reponer a una cuenta: cualquier monto. Por defecto se reparte entre las
// deudas abiertas de la más antigua a la más nueva; con "Elegir a qué deudas
// va" el usuario marca las deudas (y ajusta cuánto recibe cada una) y el monto
// a reponer es la suma de las marcadas, comparada con el saldo de origen.
// debts: [{ id, pending, label, target_date }] de la más antigua a la más nueva.
// focusId: deuda desde la que se abrió el formulario (arranca ya elegida).
export function RepayForm({ savingsAccount, accounts, pending, debts = [], focusId = null, onSubmit, onCancel, loading }) {
  const focus = debts.length > 1 ? debts.find((d) => d.id === focusId) : null
  const sources = accounts.filter((a) => !a.is_archived && a.id !== savingsAccount.id)
  const [form, setForm] = useState({
    from_account_id: sources.find((a) => !a.is_savings)?.id ?? sources[0]?.id ?? '',
    amount: focus ? round2(focus.pending) : pending > 0 ? round2(pending) : '',
    date: toInputDate(new Date()),
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [manual, setManual] = useState(Boolean(focus))
  const [values, setValues] = useState(() => (focus ? { [focus.id]: round2(focus.pending) } : {}))
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const from = sources.find((a) => a.id === form.from_account_id)
  const canChoose = debts.length > 1
  const auto = autoAllocate(debts, form.amount)
  // A mano, el monto no se escribe: es la suma de las deudas marcadas.
  const selected = manual ? checkAllocation(debts, values, 0).assigned : 0
  const check = manual ? checkAllocation(debts, values, selected) : null
  const amount = manual ? selected : Number(form.amount)
  const balance = Number(from?.balance ?? 0)

  function toggleManual(on) {
    setManual(on)
    if (on) setValues(autoValues(debts, form.amount))
    else if (selected > 0) setForm((f) => ({ ...f, amount: round2(selected) }))
    setErrors((e) => ({ ...e, amount: undefined, alloc: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.from_account_id) errs.from = 'Elige de qué cuenta sale el dinero'
    if (manual) {
      if (!check.allocations.length) errs.alloc = 'Marca al menos una deuda para reponer'
      else if (!check.valid) errs.alloc = 'Corrige los montos marcados en rojo'
    } else if (!amount || amount <= 0) errs.amount = 'Ingresa un monto válido'
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
      ...(check ? { allocations: check.allocations, extra: check.extra } : {}),
    })
  }

  let hint = `Falta reponer ${formatCurrency(pending)} a ${savingsAccount.name}. Puedes reponer solo una parte.`
  if (amount > 0 && amount < pending) hint = `Quedarán ${formatCurrency(pending - amount)} por reponer.`
  if (amount > 0 && amount >= pending && pending > 0) hint = amount > pending
    ? `Cubre toda la deuda y ${formatCurrency(amount - pending)} queda como aporte extra.`
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
      {!manual && (
        <Input label="Monto a reponer" type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
          value={form.amount} onChange={set('amount')} error={errors.amount} required
          hint={from && amount > balance ? `Supera el saldo de ${from.name} (quedará en negativo)` : hint} />
      )}

      {canChoose && (
        <div className={styles.allocBox}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={manual} onChange={(e) => toggleManual(e.target.checked)} />
            Elegir a qué deudas va
          </label>
          <ul className={styles.allocList}>
            {debts.map((d) => {
              const checked = toCents(values[d.id]) > 0
              const over = check?.overIds.includes(d.id)
              const inputId = `alloc-${d.id}`
              return (
                <li key={d.id} className={styles.allocRow}>
                  {manual && (
                    <input type="checkbox" id={inputId} checked={checked}
                      onChange={(e) => setValues((v) => toggleDebt(debts, v, d.id, e.target.checked))} />
                  )}
                  <label className={styles.allocInfo} htmlFor={manual ? inputId : undefined}>
                    <span className={styles.allocTitle}>{d.label}</span>
                    <span className={styles.allocMeta}>
                      Falta {formatCurrency(d.pending)}
                      {d.target_date && ` · antes del ${formatDate(d.target_date)}`}
                    </span>
                  </label>
                  {manual ? (
                    <Input className={styles.allocInput} type="number" min="0" step="0.01" prefix="S/" placeholder="0.00"
                      aria-label={`Monto para ${d.label}`}
                      value={values[d.id] ?? ''} error={over ? `Máx. ${formatCurrency(d.pending)}` : undefined}
                      onChange={(e) => setValues((v) => ({ ...v, [d.id]: e.target.value }))} />
                  ) : (
                    <span className={`${styles.allocAmount} ${auto[d.id] > 0 ? '' : styles.allocNone}`}>
                      {auto[d.id] > 0 ? formatCurrency(auto[d.id]) : '—'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {manual ? (
            <div className={styles.allocSummary} role="status">
              <div className={styles.allocTotal}>
                <span>
                  Total a reponer
                  <small> · {check.allocations.length} de {debts.length} deudas</small>
                </span>
                <strong>{formatCurrency(selected)}</strong>
              </div>
              {from && selected > 0 && (
                <p className={`${styles.allocStatus} ${selected > balance ? styles.allocError : styles.allocOk}`}>
                  {selected > balance
                    ? `No te alcanza: ${from.name} tiene ${formatCurrency(balance)}, te faltan ${formatCurrency(selected - balance)} (quedaría en negativo).`
                    : `Te alcanza: ${from.name} tiene ${formatCurrency(balance)} y le quedarían ${formatCurrency(balance - selected)}.`}
                </p>
              )}
              {selected > 0 && selected < pending && (
                <p className={styles.allocStatus}>Quedarán {formatCurrency(pending - selected)} por reponer.</p>
              )}
              {errors.alloc && <p className={`${styles.allocStatus} ${styles.allocError}`}>{errors.alloc}</p>}
            </div>
          ) : <p className={styles.allocStatus}>Se reparte de la más antigua a la más nueva.</p>}
        </div>
      )}
      <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      <Input label="Nota (opcional)" value={form.note} onChange={set('note')} placeholder="Ej: Repongo con el sueldo" />
      <p className={styles.hint}>
        Pasa dinero a {savingsAccount.name} y descuenta de lo pendiente{manual ? '' : ', empezando por lo más antiguo'}. No cuenta como gasto.
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" variant="success" disabled={loading}>{loading ? 'Guardando…' : 'Reponer'}</Button>
      </div>
    </form>
  )
}
