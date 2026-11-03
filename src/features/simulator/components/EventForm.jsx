import { useMemo, useState } from 'react'
import { Chip } from '@mantine/core'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories } from '@/hooks/useCategories'
import { EVENT_TYPES, EVENT_TYPE_KEYS, createEvent, validateEvent } from '@/lib/simulation/scenarioModel'
import { REPEAT_OPTIONS, repeatLabel } from '@/lib/simulation/recurrence'
import { EVENT_META } from './eventMeta'
import styles from './EventForm.module.css'

// Alta/edición de un movimiento hipotético. No crea nada real: devuelve el
// evento al simulador con onSubmit(event, { addAnother }).
export function EventForm({ initial, defaultDate, accounts = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initial ?? createEvent({ date: defaultDate }))
  const [errors, setErrors] = useState({})

  const typeInfo = EVENT_TYPES[form.type]
  const { categories } = useCategories(typeInfo.categoryType ?? 'expense')
  const isTransfer = form.type === 'transfer'

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const patch = (values) => setForm((f) => ({ ...f, ...values }))

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ], [categories])

  const accountOptions = useMemo(() => [
    { value: '', label: isTransfer ? 'Elige una cuenta' : 'Sin cuenta (saldo general)' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ], [accounts, isTransfer])

  function changeType(type) {
    // Al cambiar de tipo, la categoría anterior ya no aplica.
    patch({ type, categoryId: null, categoryName: null, toAccountId: type === 'transfer' ? form.toAccountId : null })
  }

  function submit(addAnother) {
    const event = {
      ...form,
      description: form.description.trim(),
      amount: String(form.amount).trim(),
      until: form.repeat === 'once' ? null : form.until || null,
      categoryName: categories.find((c) => c.id === form.categoryId)?.name ?? null,
      accountId: form.accountId || null,
      toAccountId: isTransfer ? form.toAccountId || null : null,
    }
    const errs = validateEvent(event)
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit(event, { addAnother })
    if (addAnother) {
      // Siguiente movimiento: mismo tipo y fecha, campos limpios.
      setForm(createEvent({ type: event.type, date: event.date }))
      setErrors({})
      document.getElementById('sim-event-amount')?.focus()
    }
  }

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); submit(false) }}>
      <fieldset className={styles.types}>
        <legend className={styles.legend}>Tipo de movimiento</legend>
        {EVENT_TYPE_KEYS.map((key) => {
          const meta = EVENT_META[key]
          const Icon = meta.icon
          const active = form.type === key
          return (
            <label key={key} className={`${styles.type} ${active ? styles.typeActive : ''}`} data-tone={meta.tone}>
              <input
                type="radio"
                name="sim-event-type"
                value={key}
                checked={active}
                onChange={() => changeType(key)}
                className={styles.srOnly}
              />
              <span className={styles.typeIcon} aria-hidden="true"><Icon size={18} stroke={1.9} /></span>
              <span className={styles.typeLabel}>{EVENT_TYPES[key].label}</span>
            </label>
          )
        })}
      </fieldset>

      <div className={styles.row2}>
        <Input
          id="sim-event-amount"
          label="Monto"
          type="number"
          min="0"
          step="0.01"
          prefix="S/"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
          required
          data-autofocus
          classNames={{ input: styles.amountInput }}
        />
        <Input label="Fecha" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
      </div>

      <Input
        label="Descripción"
        value={form.description}
        onChange={set('description')}
        placeholder={EVENT_META[form.type].placeholder}
        maxLength={80}
      />

      <div className={styles.field}>
        <span className={styles.legend} id="sim-repeat-label">Repetición</span>
        <Chip.Group value={form.repeat} onChange={(repeat) => patch({ repeat })}>
          <div className={styles.chips} role="radiogroup" aria-labelledby="sim-repeat-label">
            {REPEAT_OPTIONS.map((o) => (
              <Chip key={o.value} value={o.value} size="sm" variant="light">{o.label}</Chip>
            ))}
          </div>
        </Chip.Group>
        {form.repeat !== 'once' && form.date && (
          <p className={styles.hint}>{repeatLabel(form.repeat, form.date)}, desde la fecha elegida.</p>
        )}
      </div>

      {form.repeat !== 'once' && (
        <Input
          label="Repetir hasta (opcional)"
          type="date"
          value={form.until ?? ''}
          min={form.date}
          onChange={set('until')}
          error={errors.until}
          hint="Vacío: hasta el final de la proyección"
        />
      )}

      {isTransfer ? (
        <div className={styles.row2}>
          <Select label="Desde la cuenta" options={accountOptions} value={form.accountId ?? ''} onChange={set('accountId')} error={errors.accountId} />
          <Select label="Hacia la cuenta" options={accountOptions} value={form.toAccountId ?? ''} onChange={set('toAccountId')} error={errors.toAccountId} />
        </div>
      ) : (
        <div className={styles.row2}>
          <Select label="Categoría" options={categoryOptions} value={form.categoryId ?? ''} onChange={(e) => patch({ categoryId: e.target.value || null })} />
          {accounts.length > 0 && (
            <Select label="Cuenta" options={accountOptions} value={form.accountId ?? ''} onChange={set('accountId')} />
          )}
        </div>
      )}
      {isTransfer && accounts.length < 2 && (
        <p className={styles.hint}>Necesitas al menos dos cuentas para simular una transferencia.</p>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        {!initial && <Button variant="secondary" onClick={() => submit(true)}>Agregar y otro</Button>}
        <Button type="submit">{initial ? 'Guardar cambios' : 'Agregar'}</Button>
      </div>
    </form>
  )
}
