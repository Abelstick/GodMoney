import { useState } from 'react'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { OCCASION_KIND, OCCASION_KIND_META, formatDayMonth } from '@/lib/giftPlanning'
import { MONTH_OPTIONS } from './PersonForm'
import styles from './GiftForms.module.css'

const KIND_OPTIONS = Object.entries(OCCASION_KIND_META).map(([value, m]) => ({ value, label: m.label }))

function defaultsFor(kind) {
  if (kind === OCCASION_KIND.CHRISTMAS) return { name: 'Navidad', month: '12', day: '25' }
  return {}
}

export function OccasionForm({ initial, people, onSubmit, onCancel, onAddPerson, loading }) {
  const [form, setForm] = useState(() => initial ? {
    kind: initial.kind,
    name: initial.name,
    person_id: initial.person_id ?? '',
    month: String(initial.month),
    day: String(initial.day),
    budget: initial.budget ? String(initial.budget) : '',
    reminder_days_before: String(initial.reminder_days_before ?? 14),
  } : {
    kind: OCCASION_KIND.CHRISTMAS,
    name: 'Navidad', person_id: '', month: '12', day: '25', budget: '', reminder_days_before: '30',
  })
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const isBirthday = form.kind === OCCASION_KIND.BIRTHDAY
  const person = people.find((p) => p.id === form.person_id)
  const peopleWithBirthday = people.filter((p) => p.birth_month && p.birth_day)

  function changeKind(e) {
    const kind = e.target.value
    setForm((f) => ({
      ...f, kind, ...defaultsFor(kind),
      ...(kind !== OCCASION_KIND.CHRISTMAS && f.kind === OCCASION_KIND.CHRISTMAS && { name: '' }),
      reminder_days_before: kind === OCCASION_KIND.CHRISTMAS ? '30' : f.reminder_days_before === '30' ? '14' : f.reminder_days_before,
    }))
  }

  function changePerson(e) {
    const p = people.find((x) => x.id === e.target.value)
    setForm((f) => ({
      ...f,
      person_id: e.target.value,
      name: p ? `Cumpleaños de ${p.name}` : f.name,
      month: p?.birth_month ? String(p.birth_month) : f.month,
      day: p?.birth_day ? String(p.birth_day) : f.day,
    }))
  }

  function validate() {
    const errs = {}
    if (isBirthday && !form.person_id) errs.person_id = 'Elige a la persona'
    if (!form.name.trim()) errs.name = 'Obligatorio'
    if (!isBirthday) {
      const max = new Date(2024, Number(form.month), 0).getDate()
      const d = Number(form.day)
      if (!form.month) errs.month = 'Obligatorio'
      if (!d || d < 1 || d > max) errs.day = `Entre 1 y ${max}`
    }
    if (form.budget !== '' && Number(form.budget) <= 0) errs.budget = 'Debe ser mayor a 0'
    if (form.reminder_days_before === '' || Number(form.reminder_days_before) < 0) errs.reminder_days_before = 'Inválido'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      kind: form.kind,
      name: form.name.trim(),
      person_id: form.person_id || null,
      month: Number(isBirthday ? person.birth_month : form.month),
      day: Number(isBirthday ? person.birth_day : form.day),
      budget: form.budget !== '' ? Number(form.budget) : null,
      reminder_days_before: Number(form.reminder_days_before),
    })
  }

  const personOptions = [
    { value: '', label: peopleWithBirthday.length ? 'Elige una persona' : 'Nadie tiene cumpleaños registrado' },
    ...peopleWithBirthday.map((p) => ({ value: p.id, label: `${p.name} · ${formatDayMonth(p.birth_month, p.birth_day)}` })),
  ]
  const otherPeople = [{ value: '', label: 'Para varias personas' }, ...people.map((p) => ({ value: p.id, label: p.name }))]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Select label="Tipo de ocasión" options={KIND_OPTIONS} value={form.kind} onChange={changeKind}
        disabled={!!initial} />

      {isBirthday ? (
        <>
          <Select label="¿De quién?" options={personOptions} value={form.person_id} onChange={changePerson}
            error={errors.person_id} required />
          {!peopleWithBirthday.length && onAddPerson && (
            <Button variant="ghost" size="sm" onClick={onAddPerson}>+ Agregar persona con su cumpleaños</Button>
          )}
          {person && (
            <p className={styles.hint}>
              Se repite cada año el <strong>{formatDayMonth(person.birth_month, person.birth_day)}</strong>.
              Si cambias el cumpleaños de {person.name}, esta ocasión se actualiza sola.
            </p>
          )}
        </>
      ) : (
        <>
          <Input label="Nombre" value={form.name} onChange={set('name')} error={errors.name} required
            placeholder="Ej: Aniversario, Día de la Madre, Amigo secreto" />
          <div className={styles.row2}>
            <Select label="Mes" options={MONTH_OPTIONS.slice(1)} value={form.month} onChange={set('month')} error={errors.month} />
            <Input label="Día" type="number" min="1" max="31" step="1" value={form.day} onChange={set('day')} error={errors.day} required />
          </div>
          {form.kind !== OCCASION_KIND.CHRISTMAS && (
            <Select label="Persona (opcional)" options={otherPeople} value={form.person_id} onChange={set('person_id')} />
          )}
        </>
      )}

      <div className={styles.row2}>
        <Input label="Presupuesto por año (opcional)" type="number" min="0" step="0.01" prefix="S/"
          value={form.budget} onChange={set('budget')} error={errors.budget}
          hint="Lo máximo que quieres gastar en esta ocasión" />
        <Input label="Avisarme con cuántos días" type="number" min="0" step="1"
          value={form.reminder_days_before} onChange={set('reminder_days_before')} error={errors.reminder_days_before} required />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear ocasión'}
        </Button>
      </div>
    </form>
  )
}
