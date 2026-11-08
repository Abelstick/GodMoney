import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts }   from '@/hooks/useAccounts'
import { toInputDate, formatCurrency } from '@/lib/formatters'
import { PaidFromField } from '@/components/common/PaidFromField/PaidFromField'
import { SplitEditor, initialSplit } from '@/components/common/SplitEditor/SplitEditor'
import { buildSplitExpenses, resolveSplit } from '@/lib/expenseSplit'
import { TransactionExtras, EMPTY_EXTRAS, extrasFrom, extrasPayload } from '@/components/common/TransactionExtras/TransactionExtras'
import styles from './ExpenseForm.module.css'

const EMPTY = { amount: '', description: '', category_id: '', date: toInputDate(new Date()), is_fixed: false, savings_account_id: '', paid_from_account_id: '', repay_to_savings: true, ...EMPTY_EXTRAS }

// `allowSplit`: se puede repartir el monto entre varias categorías; entonces
// onSubmit recibe además las partes listas para guardar. `initial.split` trae
// las partes de un gasto ya dividido; `editingId`, el gasto que se edita.
export function ExpenseForm({ initial, editingId, submitLabel, onSubmit, onCancel, loading, allowSplit = false }) {
  const [form, setForm] = useState(() => {
    const { split: _split, ...rest } = initial ?? {}
    return { ...EMPTY, ...rest }
  })
  const [errors, setErrors] = useState({})
  // null = gasto en una sola categoría; si no, { mode, parts, groupId? }.
  const [split, setSplit] = useState(() => initial?.split ?? null)
  const { categories } = useCategories('expense')
  const { accounts } = useAccounts()

  const isSavingsCategory = (id) => Boolean(categories.find((c) => c.id === id)?.is_savings)
  const isSavings = split
    ? split.parts.some((p) => isSavingsCategory(p.category_id))
    : isSavingsCategory(form.category_id)

  const patchExtras = (patch) => setForm((f) => ({ ...f, ...patch }))

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function validate() {
    const errs = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      errs.amount = 'Ingresa un monto válido'
    if (!form.date) errs.date = 'La fecha es obligatoria'
    if (split && !errs.amount) {
      const status = resolveSplit(form.amount, split.parts, split.mode)
      if (!status.valid) errs.split = status.error
    }
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      amount:      Number(form.amount),
      description: form.description || null,
      category_id: form.category_id || null,
      date:        form.date,
      is_fixed:    form.is_fixed,
      // Solo los gastos de ahorro mueven dinero a una cuenta; si se cambia a
      // otra categoría se limpia para que el trigger revierta el saldo.
      ...extrasPayload(form),
      savings_account_id: isSavings ? (form.savings_account_id || null) : null,
      paid_from_account_id: form.paid_from_account_id || null,
      repay_to_savings: form.repay_to_savings !== false,
    }
    if (!split) return onSubmit(payload)
    onSubmit(payload, buildSplitExpenses(
      { ...payload, savings_account_id: form.savings_account_id || null },
      split.parts,
      split.mode,
      { groupId: split.groupId ?? crypto.randomUUID(), newId: (p) => p.id ?? crypto.randomUUID(), isSavingsCategory },
    ))
  }

  const accountOptions = [
    { value: '', label: 'Ninguna (solo registrar el gasto)' },
    ...accounts
      .filter((a) => !a.is_archived || a.id === form.savings_account_id)
      .map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  const catOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Monto"
        type="number"
        min="0"
        step="0.01"
        prefix="S/"
        data-autofocus={initial ? undefined : true}
        value={form.amount}
        onChange={set('amount')}
        error={errors.amount}
        required
        placeholder="0.00"
      />
      <Input
        label="Descripción"
        value={form.description}
        onChange={set('description')}
        placeholder="Ej: Supermercado"
      />
      {split ? (
        <div className={styles.splitWrap}>
          <SplitEditor
            total={form.amount}
            value={split}
            onChange={(next) => { setSplit(next); setErrors((e) => ({ ...e, split: undefined })) }}
            categories={categories}
          />
          {errors.split && <p className={styles.error}>{errors.split}</p>}
          <button type="button" className={styles.linkBtn} onClick={() => setSplit(null)}>
            No dividir: usar una sola categoría
          </button>
        </div>
      ) : (
        <div className={styles.splitWrap}>
          <Select
            label="Categoría"
            options={catOptions}
            value={form.category_id}
            onChange={set('category_id')}
          />
          {allowSplit && (
            <button type="button" className={styles.linkBtn} onClick={() => setSplit(initialSplit(form.category_id, editingId))}>
              Dividir entre varias categorías (p. ej. una parte para ti y otra para tu pareja)
            </button>
          )}
        </div>
      )}
      {isSavings && (
        <div className={styles.savingsBox}>
          <Select
            label="¿A qué cuenta va este ahorro?"
            options={accountOptions}
            value={form.savings_account_id}
            onChange={set('savings_account_id')}
          />
          <p className={styles.savingsHint}>
            {form.savings_account_id
              ? 'El monto se sumará al saldo de esa cuenta y los objetivos vinculados avanzarán solos.'
              : 'Sin cuenta, solo cuenta como salida del mes: ningún saldo cambia.'}
          </p>
        </div>
      )}
      <PaidFromField
        accounts={accounts}
        value={form.paid_from_account_id}
        onChange={(v) => setForm((f) => ({ ...f, paid_from_account_id: v }))}
        repay={form.repay_to_savings !== false}
        onRepayChange={(v) => setForm((f) => ({ ...f, repay_to_savings: v }))}
        amount={form.amount}
      />
      <Input
        label="Fecha"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
        required
      />
      <TransactionExtras value={form} onChange={patchExtras} />
      <label className={styles.checkRow}>
        <input type="checkbox" checked={form.is_fixed} onChange={set('is_fixed')} />
        Gasto fijo (recurrente mensual)
      </label>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : submitLabel ?? (initial ? 'Actualizar' : 'Guardar')}
        </Button>
      </div>
    </form>
  )
}
