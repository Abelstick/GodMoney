import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { CATEGORY_COLORS } from '@/lib/constants'
import { toInputDate } from '@/lib/formatters'
import styles from './GoalForm.module.css'

const EMPTY = { name: '', target_amount: '', current_amount: '0', target_date: '', color: '#6366f1' }

export function GoalForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (!form.target_amount || Number(form.target_amount) <= 0)
      errs.target_amount = 'El monto objetivo debe ser mayor a 0'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name:           form.name.trim(),
      target_amount:  Number(form.target_amount),
      current_amount: Number(form.current_amount) || 0,
      target_date:    form.target_date || null,
      color:          form.color,
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre del objetivo" value={form.name} onChange={set('name')}
        error={errors.name} required placeholder="Ej: Inicial de casa" />
      <Input label="Monto objetivo" type="number" min="0" step="0.01" prefix="$"
        value={form.target_amount} onChange={set('target_amount')}
        error={errors.target_amount} required placeholder="0.00" />
      <Input label="Monto actual (ahorro acumulado)" type="number" min="0" step="0.01" prefix="$"
        value={form.current_amount} onChange={set('current_amount')} placeholder="0.00" />
      <Input label="Fecha límite (opcional)" type="date"
        value={form.target_date} onChange={set('target_date')} />
      <div>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
          Color
        </label>
        <div className={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <div
              key={c}
              className={`${styles.colorSwatch} ${form.color === c ? styles.selected : ''}`}
              style={{ background: c }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear objetivo'}
        </Button>
      </div>
    </form>
  )
}
