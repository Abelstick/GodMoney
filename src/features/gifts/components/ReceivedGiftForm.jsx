import { useState } from 'react'
import { format } from 'date-fns'
import { Switch } from '@mantine/core'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { GiftCategorySelect } from './GiftCategorySelect'
import styles from './GiftForms.module.css'

// Regalo que recibes. Si fue dinero se puede registrar como ingreso.
export function ReceivedGiftForm({ people, occasions, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    is_money: true,
    title: '',
    person_id: '',
    occasion_id: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    createIncome: true,
    category_id: '',
  })
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.is_money && !form.title.trim()) errs.title = 'Obligatorio'
    if (form.is_money && (!form.amount || Number(form.amount) <= 0)) errs.amount = 'Debe ser mayor a 0'
    if (!form.is_money && form.amount !== '' && Number(form.amount) <= 0) errs.amount = 'Debe ser mayor a 0'
    if (!form.date) errs.date = 'Obligatorio'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({
      gift: {
        is_money: form.is_money,
        title: form.title.trim() || 'Dinero',
        person_id: form.person_id || null,
        occasion_id: form.occasion_id || null,
        year: Number(form.date.slice(0, 4)),
        amount: form.amount !== '' ? Number(form.amount) : null,
        date: form.date,
        notes: form.notes.trim() || null,
      },
      createIncome: form.is_money && form.createIncome,
      category_id: form.category_id || null,
    })
  }

  const personOptions = [{ value: '', label: 'Sin especificar' }, ...people.map((p) => ({ value: p.id, label: p.name }))]
  const occasionOptions = [{ value: '', label: 'Sin ocasión' }, ...occasions.map((o) => ({ value: o.id, label: o.name }))]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.toggle} role="radiogroup" aria-label="Tipo de regalo recibido">
        {[{ v: true, label: 'Dinero', hint: 'Puede sumarse a tus ingresos' }, { v: false, label: 'Objeto', hint: 'Solo queda en el historial' }].map((o) => (
          <button key={o.label} type="button" role="radio" aria-checked={form.is_money === o.v}
            className={`${styles.toggleBtn} ${form.is_money === o.v ? styles.toggleActive : ''}`}
            onClick={() => setForm((f) => ({ ...f, is_money: o.v }))}>
            {o.label}
            <span className={styles.toggleHint}>{o.hint}</span>
          </button>
        ))}
      </div>

      <Input label={form.is_money ? 'Descripción (opcional)' : '¿Qué te regalaron?'} value={form.title}
        onChange={set('title')} error={errors.title} required={!form.is_money}
        placeholder={form.is_money ? 'Ej: Sobre de cumpleaños' : 'Ej: Reloj, polo, libro'} />

      <div className={styles.row2}>
        <Select label="De parte de" options={personOptions} value={form.person_id} onChange={set('person_id')} />
        <Select label="Ocasión" options={occasionOptions} value={form.occasion_id} onChange={set('occasion_id')} />
      </div>

      <div className={styles.row2}>
        <Input label={form.is_money ? 'Monto' : 'Valor aproximado (opcional)'} type="number" min="0" step="0.01"
          prefix="S/" value={form.amount} onChange={set('amount')} error={errors.amount} required={form.is_money} />
        <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      </div>

      {form.is_money && (
        <>
          <Switch label="Registrar como ingreso" description="Suma al mes como cualquier otro ingreso"
            checked={form.createIncome} onChange={(e) => setForm((f) => ({ ...f, createIncome: e.currentTarget.checked }))} />
          {form.createIncome && (
            <GiftCategorySelect type="income" value={form.category_id}
              onChange={(v) => setForm((f) => ({ ...f, category_id: v }))} />
          )}
        </>
      )}

      <Input label="Notas (opcional)" value={form.notes} onChange={set('notes')} />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar regalo recibido'}</Button>
      </div>
    </form>
  )
}
