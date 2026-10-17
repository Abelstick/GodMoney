import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories }  from '@/hooks/useCategories'
import { BUDGET_PERIODS, CATEGORY_COLORS } from '@/lib/constants'
import styles from './BudgetForm.module.css'

const EMPTY = { name: '', amount: '', category_ids: [], period: 'monthly', color: '#6366f1' }

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
      category_ids: form.category_ids,
      period:      form.period,
      color:       form.color,
    })
  }

  function toggleCategory(id) {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter((c) => c !== id)
        : [...f.category_ids, id],
    }))
  }

  const count = form.category_ids.length
  let catHint = 'Elige una o más categorías; sin ninguna, el presupuesto no se actualiza solo.'
  if (count === 1) catHint = '1 categoría en este presupuesto'
  else if (count > 1) catHint = `${count} categorías en este presupuesto`

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre del presupuesto" value={form.name} onChange={set('name')}
        error={errors.name} required placeholder="Ej: Ocio mensual" />
      <Input label="Monto límite" type="number" min="0" step="0.01" prefix="S/"
        value={form.amount} onChange={set('amount')} error={errors.amount} required placeholder="0.00" />
      <div>
        <label className={styles.fieldLabel}>
          Categorías del grupo (suman al seguimiento automático)
        </label>
        <div className={styles.catRow}>
          {categories.map((c) => {
            const active = form.category_ids.includes(c.id)
            return (
              <button
                type="button"
                key={c.id}
                aria-pressed={active}
                onClick={() => toggleCategory(c.id)}
                className={`${styles.catChip} ${active ? styles.catChipActive : ''}`}
                style={active ? { borderColor: c.color, background: `color-mix(in srgb, ${c.color} 15%, transparent)` } : undefined}
              >
                <span className={styles.catDot} style={{ background: c.color }} />
                {c.name}
              </button>
            )
          })}
        </div>
        <p className={styles.hint}>
          {catHint}
        </p>
      </div>
      <Select label="Periodo" options={BUDGET_PERIODS} value={form.period} onChange={set('period')} />
      <div>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
        <div className={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <button type="button" key={c} aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm((f) => ({ ...f, color: c }))}
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
