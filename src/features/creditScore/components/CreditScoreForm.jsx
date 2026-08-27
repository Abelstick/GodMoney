import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import styles from './CreditScoreForm.module.css'

const EMPTY = { score: '', recorded_date: format(new Date(), 'yyyy-MM-dd'), source: '', notes: '' }

export function CreditScoreForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.score || Number(form.score) <= 0) errs.score = 'Ingresa un score válido'
    if (!form.recorded_date) errs.recorded_date = 'Obligatorio'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      score: Number(form.score),
      recorded_date: form.recorded_date,
      source: form.source.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Score" type="number" min="1" step="1"
        value={form.score} onChange={set('score')} error={errors.score} required
        placeholder="Ej: 680" />
      <Input label="Fecha de la actualización" type="date"
        value={form.recorded_date} onChange={set('recorded_date')} error={errors.recorded_date} required />
      <Input label="Fuente (opcional)" value={form.source} onChange={set('source')}
        placeholder="Ej: App del banco, Equifax" />
      <Input label="Notas (opcional)" value={form.notes} onChange={set('notes')}
        placeholder="Ej: Pagué todas mis tarjetas a tiempo este mes" />
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Registrar'}
        </Button>
      </div>
    </form>
  )
}
