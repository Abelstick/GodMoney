import { useState } from 'react'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import styles from './GiftForms.module.css'

const MONTH_OPTIONS = [
  { value: '', label: 'No sé / no aplica' },
  ...['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((label, i) => ({ value: String(i + 1), label })),
]

export { MONTH_OPTIONS }

const EMPTY = { name: '', relationship: '', birth_month: '', birth_day: '', notes: '' }

export function PersonForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(initial && {
      name: initial.name,
      relationship: initial.relationship ?? '',
      birth_month: initial.birth_month ? String(initial.birth_month) : '',
      birth_day: initial.birth_day ? String(initial.birth_day) : '',
      notes: initial.notes ?? '',
    }),
  }))
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Obligatorio'
    if (form.birth_month && !form.birth_day) errs.birth_day = 'Indica el día'
    if (form.birth_day) {
      const max = new Date(2024, Number(form.birth_month || 1), 0).getDate()
      const d = Number(form.birth_day)
      if (!form.birth_month) errs.birth_month = 'Indica el mes'
      else if (!d || d < 1 || d > max) errs.birth_day = `Entre 1 y ${max}`
    }
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const hasBirthday = form.birth_month && form.birth_day
    onSubmit({
      name: form.name.trim(),
      relationship: form.relationship.trim() || null,
      birth_month: hasBirthday ? Number(form.birth_month) : null,
      birth_day: hasBirthday ? Number(form.birth_day) : null,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre" value={form.name} onChange={set('name')} error={errors.name} required
        placeholder="Ej: Mamá, Lucía, Tío Jorge" data-autofocus />
      <Input label="Relación (opcional)" value={form.relationship} onChange={set('relationship')}
        placeholder="Familia, pareja, amigo, trabajo…" />

      <div className={styles.row2}>
        <Select label="Mes de cumpleaños" options={MONTH_OPTIONS} value={form.birth_month}
          onChange={set('birth_month')} error={errors.birth_month} />
        <Input label="Día" type="number" min="1" max="31" step="1" value={form.birth_day}
          onChange={set('birth_day')} error={errors.birth_day} disabled={!form.birth_month} />
      </div>

      <Input label="Notas (opcional)" value={form.notes} onChange={set('notes')}
        placeholder="Talla, gustos, cosas que ya tiene…" />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar persona'}
        </Button>
      </div>
    </form>
  )
}
