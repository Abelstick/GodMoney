import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Switch } from '@mantine/core'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency } from '@/lib/formatters'
import { GIFT_STATUS, occasionCycle } from '@/lib/giftPlanning'
import { GiftCategorySelect } from './GiftCategorySelect'
import styles from './GiftForms.module.css'

const STATUS_OPTIONS = [
  { value: GIFT_STATUS.IDEA,    label: 'Idea',          hint: 'Algo que podría gustarle' },
  { value: GIFT_STATUS.PLANNED, label: 'Planificado',   hint: 'Lo vas a regalar en una ocasión' },
  { value: GIFT_STATUS.DONE,    label: 'Ya lo compré',  hint: 'Se registra el gasto' },
]

const today = () => format(new Date(), 'yyyy-MM-dd')

// Regalo que das: idea, planificado o ya comprado.
// onSubmit({ gift, purchase }) — purchase solo si se marca "Ya lo compré".
export function GiftForm({ initial, defaults, people, occasions, onSubmit, onCancel, loading }) {
  const isEdit = !!initial?.id
  const isDone = initial?.status === GIFT_STATUS.DONE
  const base = initial ?? defaults ?? {}

  const [form, setForm] = useState({
    title: base.title ?? '',
    person_id: base.person_id ?? '',
    occasion_id: base.occasion_id ?? '',
    status: base.status ?? (base.occasion_id ? GIFT_STATUS.PLANNED : GIFT_STATUS.IDEA),
    estimated_amount: base.estimated_amount ? String(base.estimated_amount) : '',
    url: base.url ?? '',
    notes: base.notes ?? '',
    amount: base.estimated_amount ? String(base.estimated_amount) : '',
    date: today(),
    category_id: '',
    createExpense: true,
  })
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const occasion = occasions.find((o) => o.id === form.occasion_id)
  const cycle = useMemo(() => (occasion ? occasionCycle(occasion) : null), [occasion])
  // Al editar se respeta el año ya guardado (un regalo de Navidad pasada sigue en su año).
  const year = isEdit && initial.occasion_id === form.occasion_id && initial.year ? initial.year : cycle?.year ?? null
  const needsOccasion = form.status === GIFT_STATUS.PLANNED

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Obligatorio'
    if (needsOccasion && !form.occasion_id) errs.occasion_id = 'Elige la ocasión'
    if (form.estimated_amount !== '' && Number(form.estimated_amount) <= 0) errs.estimated_amount = 'Debe ser mayor a 0'
    if (form.status === GIFT_STATUS.DONE && !isDone) {
      if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Debe ser mayor a 0'
      if (!form.date) errs.date = 'Obligatorio'
    }
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const gift = {
      direction: 'GIVEN',
      title: form.title.trim(),
      person_id: form.person_id || null,
      occasion_id: form.occasion_id || null,
      year: form.occasion_id ? year : null,
      estimated_amount: form.estimated_amount !== '' ? Number(form.estimated_amount) : null,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
    }
    const purchase = form.status === GIFT_STATUS.DONE && !isDone
      ? { amount: Number(form.amount), date: form.date, category_id: form.category_id || null, createExpense: form.createExpense }
      : null
    if (!isDone && !purchase) gift.status = form.status
    onSubmit({ gift, purchase })
  }

  const personOptions = [{ value: '', label: 'Sin persona' }, ...people.map((p) => ({ value: p.id, label: p.name }))]
  const occasionOptions = [
    { value: '', label: needsOccasion ? 'Elige una ocasión' : 'Sin ocasión' },
    ...occasions.map((o) => ({ value: o.id, label: o.name })),
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="¿Qué regalo?" value={form.title} onChange={set('title')} error={errors.title} required
        placeholder="Ej: Perfume, libro, cena" data-autofocus />

      <div className={styles.row2}>
        <Select label="Para" options={personOptions} value={form.person_id} onChange={set('person_id')} />
        <Select label="Ocasión" options={occasionOptions} value={form.occasion_id} onChange={set('occasion_id')}
          error={errors.occasion_id} />
      </div>
      {occasion && year && (
        <p className={styles.hint}>Cuenta para el presupuesto de <strong>{occasion.name} {year}</strong>.</p>
      )}

      {!isDone && (
        <div className={styles.toggle} style={{ '--cols': 3 }} role="radiogroup" aria-label="Estado del regalo">
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={form.status === s.value}
              className={`${styles.toggleBtn} ${form.status === s.value ? styles.toggleActive : ''}`}
              onClick={() => setForm((f) => ({ ...f, status: s.value }))}>
              {s.label}
              <span className={styles.toggleHint}>{s.hint}</span>
            </button>
          ))}
        </div>
      )}

      {form.status === GIFT_STATUS.DONE && !isDone ? (
        <>
          <div className={styles.row2}>
            <Input label="Monto pagado" type="number" min="0" step="0.01" prefix="S/" value={form.amount}
              onChange={set('amount')} error={errors.amount} required />
            <Input label="Fecha de compra" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
          </div>
          <Switch label="Registrar como gasto" description="Descuenta del mes y cuenta en tus presupuestos"
            checked={form.createExpense} onChange={(e) => setForm((f) => ({ ...f, createExpense: e.currentTarget.checked }))} />
          {form.createExpense && (
            <GiftCategorySelect type="expense" value={form.category_id}
              onChange={(v) => setForm((f) => ({ ...f, category_id: v }))} />
          )}
        </>
      ) : (
        <Input label="Precio estimado (opcional)" type="number" min="0" step="0.01" prefix="S/"
          value={form.estimated_amount} onChange={set('estimated_amount')} error={errors.estimated_amount}
          hint={isDone ? `Pagaste ${formatCurrency(initial.amount)}. Para cambiar el monto, edita el gasto en Gastos.` : 'Se descuenta del presupuesto de la ocasión mientras no lo compres'} />
      )}

      <Input label="Enlace (opcional)" type="url" value={form.url} onChange={set('url')} placeholder="https://…" />
      <Input label="Notas (opcional)" value={form.notes} onChange={set('notes')} placeholder="Talla, color, dónde comprarlo…" />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : form.status === GIFT_STATUS.DONE ? 'Guardar compra' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
