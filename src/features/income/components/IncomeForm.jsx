import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories } from '@/hooks/useCategories'
import { toInputDate }   from '@/lib/formatters'
import styles from './IncomeForm.module.css'

const EMPTY = { amount: '', description: '', category_id: '', date: toInputDate(new Date()), is_recurring: false }

export function IncomeForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})
  const { categories } = useCategories('income')

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
      amount:       Number(form.amount),
      description:  form.description || null,
      category_id:  form.category_id || null,
      date:         form.date,
      is_recurring: form.is_recurring,
    })
  }

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
        prefix="$"
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
        placeholder="Ej: Salario mayo"
      />
      <Select
        label="Categoría"
        options={catOptions}
        value={form.category_id}
        onChange={set('category_id')}
      />
      <Input
        label="Fecha"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
        required
      />
      <label className={styles.checkRow}>
        <input type="checkbox" checked={form.is_recurring} onChange={set('is_recurring')} />
        Ingreso recurrente (mensual)
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
