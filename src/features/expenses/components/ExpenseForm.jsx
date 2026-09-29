import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts }   from '@/hooks/useAccounts'
import { toInputDate, formatCurrency } from '@/lib/formatters'
import styles from './ExpenseForm.module.css'

const EMPTY = { amount: '', description: '', category_id: '', date: toInputDate(new Date()), is_fixed: false, savings_account_id: '' }

export function ExpenseForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})
  const { categories } = useCategories('expense')
  const { accounts } = useAccounts()

  const selectedCategory = categories.find((c) => c.id === form.category_id)
  const isSavings = Boolean(selectedCategory?.is_savings)

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function validate() {
    const errs = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      errs.amount = 'Ingresa un monto válido'
    if (!form.date) errs.date = 'La fecha es obligatoria'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      amount:      Number(form.amount),
      description: form.description || null,
      category_id: form.category_id || null,
      date:        form.date,
      is_fixed:    form.is_fixed,
      // Solo los gastos de ahorro mueven dinero a una cuenta; si se cambia a
      // otra categoría se limpia para que el trigger revierta el saldo.
      savings_account_id: isSavings ? (form.savings_account_id || null) : null,
    })
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
      <Select
        label="Categoría"
        options={catOptions}
        value={form.category_id}
        onChange={set('category_id')}
      />
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
      <Input
        label="Fecha"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
        required
      />
      <label className={styles.checkRow}>
        <input type="checkbox" checked={form.is_fixed} onChange={set('is_fixed')} />
        Gasto fijo (recurrente mensual)
      </label>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
