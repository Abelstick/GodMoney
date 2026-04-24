import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories }  from '@/hooks/useCategories'
import { BUDGET_PERIODS, CATEGORY_COLORS } from '@/lib/constants'
import styles from './BudgetForm.module.css'

const EMPTY = { name: '', amount: '', category_id: '', period: 'monthly', color: '#6366f1' }

export function BudgetForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})
  const { categories } = useCategories('expense')

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'El monto debe ser mayor a 0'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name:        form.name.trim(),
      amount:      Number(form.amount),
      category_id: form.category_id || null,
      period:      form.period,
      color:       form.color,
    })
  }

  const catOptions = [
    { value: '', label: 'Sin categoría vinculada' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre del presupuesto" value={form.name} onChange={set('name')}
        error={errors.name} required placeholder="Ej: Ocio mensual" />
      <Input label="Monto límite" type="number" min="0" step="0.01" prefix="$"
        value={form.amount} onChange={set('amount')} error={errors.amount} required placeholder="0.00" />
      <Select label="Categoría de gasto (para seguimiento automático)"
        options={catOptions} value={form.category_id} onChange={set('category_id')} />
      <Select label="Periodo" options={BUDGET_PERIODS} value={form.period} onChange={set('period')} />
      <div>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
        <div className={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`${styles.colorSwatch} ${form.color === c ? styles.selected : ''}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear presupuesto'}
        </Button>
      </div>
    </form>
  )
}
