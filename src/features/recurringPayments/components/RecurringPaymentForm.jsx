import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories } from '@/hooks/useCategories'
import styles from './RecurringPaymentForm.module.css'

const SCHEDULE_TYPE = { FIXED_DAY: 'FIXED_DAY', MANUAL: 'MANUAL' }

const EMPTY = {
  name: '',
  description: '',
  amount: '',
  category_id: '',
  schedule_type: SCHEDULE_TYPE.FIXED_DAY,
  due_day_of_month: '',
  next_due_date: format(new Date(), 'yyyy-MM-dd'),
  reminder_days_before: '3',
}

export function RecurringPaymentForm({ initial, onSubmit, onCancel, loading }) {
  const { categories } = useCategories('expense')
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const isFixedDay = form.schedule_type === SCHEDULE_TYPE.FIXED_DAY

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Obligatorio'
    if (form.amount !== '' && Number(form.amount) <= 0) errs.amount = 'Debe ser mayor a 0'
    if (isFixedDay) {
      const day = Number(form.due_day_of_month)
      if (!day || day < 1 || day > 31) errs.due_day_of_month = 'Debe estar entre 1 y 31'
    } else if (!form.next_due_date) {
      errs.next_due_date = 'Obligatorio'
    }
    if (form.reminder_days_before === '' || Number(form.reminder_days_before) < 0) errs.reminder_days_before = 'Inválido'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || null,
      amount: form.amount !== '' ? Number(form.amount) : null,
      category_id: form.category_id || null,
      schedule_type: form.schedule_type,
      due_day_of_month: isFixedDay ? Number(form.due_day_of_month) : null,
      next_due_date: isFixedDay ? null : form.next_due_date,
      reminder_days_before: Number(form.reminder_days_before),
    })
  }

  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre" value={form.name} onChange={set('name')} error={errors.name} required
        placeholder="Ej: Seguro de vida, Internet, Agua" />
      <Input label="Descripción (opcional)" value={form.description} onChange={set('description')}
        placeholder="Notas adicionales" />

      <div className={styles.row2}>
        <Input label="Monto aproximado (opcional)" type="number" min="0" step="0.01" prefix="S/"
          value={form.amount} onChange={set('amount')} error={errors.amount}
          hint="Déjalo vacío si el monto varía cada mes" />
        <Select label="Categoría" options={categoryOptions} value={form.category_id} onChange={set('category_id')} />
      </div>

      <div className={styles.scheduleToggle}>
        <button
          type="button"
          className={`${styles.scheduleBtn} ${isFixedDay ? styles.scheduleActive : ''}`}
          onClick={() => setForm((f) => ({ ...f, schedule_type: SCHEDULE_TYPE.FIXED_DAY }))}
        >
          <span>📅 Día fijo del mes</span>
          <span className={styles.scheduleHint}>Ej: siempre vence el día 15</span>
        </button>
        <button
          type="button"
          className={`${styles.scheduleBtn} ${!isFixedDay ? styles.scheduleActive : ''}`}
          onClick={() => setForm((f) => ({ ...f, schedule_type: SCHEDULE_TYPE.MANUAL }))}
        >
          <span>✍️ Fecha manual</span>
          <span className={styles.scheduleHint}>Tú actualizas la fecha cada vez que pagas</span>
        </button>
      </div>

      {isFixedDay ? (
        <Input label="Día del mes" type="number" min="1" max="31" step="1"
          value={form.due_day_of_month} onChange={set('due_day_of_month')} error={errors.due_day_of_month} required
          hint="Si el mes no tiene ese día (ej. 31 en febrero), se usa el último día del mes" />
      ) : (
        <Input label="Próxima fecha de vencimiento" type="date"
          value={form.next_due_date} onChange={set('next_due_date')} error={errors.next_due_date} required />
      )}

      <Input label="Avisar con cuántos días de anticipación" type="number" min="0" step="1"
        value={form.reminder_days_before} onChange={set('reminder_days_before')} error={errors.reminder_days_before} required />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar pago' : 'Crear pago recurrente'}
        </Button>
      </div>
    </form>
  )
}
