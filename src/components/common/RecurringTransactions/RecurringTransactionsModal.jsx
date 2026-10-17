import { useState, useEffect, useCallback } from 'react'
import { IconEdit, IconTrash, IconPlayerPause, IconPlayerPlay, IconRepeat } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useCategories } from '@/hooks/useCategories'
import { recurringTransactionService } from '@/services/recurringTransactionService'
import { runRecurringGeneration } from '@/lib/runRecurringGeneration'
import { nextOccurrence } from '@/lib/recurringSchedule'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { Modal }   from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { Input }   from '@/components/ui/Input/Input'
import { Select }  from '@/components/ui/Select/Select'
import { Button }  from '@/components/ui/Button/Button'
import styles from './RecurringTransactionsModal.module.css'

const emptyForm = () => ({ description: '', amount: '', category_id: '', day_of_month: '1', start_date: toInputDate(new Date()) })

function nextRunLabel(item) {
  const start = new Date(`${item.start_date}T00:00:00`)
  return formatDate(nextOccurrence(item.day_of_month, start > new Date() ? start : new Date()))
}

// Administra las plantillas que crean un gasto o ingreso solos cada mes.
export function RecurringTransactionsModal({ isOpen, onClose, kind }) {
  const noun = kind === 'expense' ? 'gasto' : 'ingreso'
  const showToast = useStore((s) => s.showToast)
  const { categories } = useCategories(kind)

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)       // null = lista; objeto = formulario
  const [editingId, setEditingId] = useState(null)
  const [errors,  setErrors]  = useState({})
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await recurringTransactionService.getAll(kind))
    } catch (err) {
      showToast(`No se pudieron cargar los ${noun}s automáticos: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [kind, noun, showToast])

  useEffect(() => {
    if (isOpen) { load(); setForm(null) }
  }, [isOpen, load])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function openForm(item) {
    setEditingId(item?.id ?? null)
    setErrors({})
    setForm(item ? {
      description:  item.description ?? '',
      amount:       String(item.amount),
      category_id:  item.category_id ?? '',
      day_of_month: String(item.day_of_month),
      start_date:   item.start_date,
    } : emptyForm())
  }

  function validate() {
    const errs = {}
    const day = Number(form.day_of_month)
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Ingresa un monto válido'
    if (!Number.isInteger(day) || day < 1 || day > 31) errs.day_of_month = 'Un día entre 1 y 31'
    if (!form.start_date) errs.start_date = 'La fecha es obligatoria'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      description:  form.description.trim() || null,
      amount:       Number(form.amount),
      category_id:  form.category_id || null,
      day_of_month: Number(form.day_of_month),
      start_date:   form.start_date,
    }
    setSaving(true)
    try {
      if (editingId) await recurringTransactionService.update(editingId, payload)
      else           await recurringTransactionService.create({ ...payload, type: kind })
      showToast(editingId ? 'Cambios guardados' : `${noun[0].toUpperCase()}${noun.slice(1)} automático creado`, 'success')
      setForm(null)
      await load()
      // Si ya toca este mes, el movimiento se crea al instante en vez de esperar a la próxima visita.
      await runRecurringGeneration()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item) {
    try {
      const updated = await recurringTransactionService.update(item.id, { is_active: !item.is_active })
      setItems((list) => list.map((i) => (i.id === item.id ? updated : i)))
      if (updated.is_active) await runRecurringGeneration()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function confirmDelete() {
    try {
      await recurringTransactionService.remove(deleting.id)
      setItems((list) => list.filter((i) => i.id !== deleting.id))
      showToast('Eliminado. Los movimientos ya creados se conservan.', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  const catOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const title = form
    ? `${editingId ? 'Editar' : 'Nuevo'} ${noun} automático`
    : `${noun[0].toUpperCase()}${noun.slice(1)}s automáticos`

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {form ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input label="Monto" type="number" min="0" step="0.01" prefix="S/" required
            value={form.amount} onChange={set('amount')} error={errors.amount} placeholder="0.00" />
          <Input label="Descripción" value={form.description} onChange={set('description')}
            placeholder={kind === 'expense' ? 'Ej: Alquiler' : 'Ej: Sueldo'} />
          <Select label="Categoría" options={catOptions} value={form.category_id} onChange={set('category_id')} />
          <Input label="Día del mes" type="number" min="1" max="31" step="1" required
            value={form.day_of_month} onChange={set('day_of_month')} error={errors.day_of_month} />
          <Input label="Empieza el" type="date" required
            value={form.start_date} onChange={set('start_date')} error={errors.start_date} />
          <p className={styles.hint}>
            Se crea un {noun} el día {form.day_of_month || '…'} de cada mes (si el mes es más corto, el último día).
            No se rellenan meses anteriores a la fecha de inicio: empieza hoy para no duplicar lo que ya registraste.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => setForm(null)}>Volver</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      ) : (
        <div className={styles.body}>
          <p className={styles.intro}>
            Registran solos un {noun} cada mes, sin que tengas que cargarlo. Se crean al abrir la app (o a diario si el cron está activo).
          </p>

          {!loading && items.length === 0 && (
            <EmptyState icon={<IconRepeat size={40} stroke={1.5} />} title={`Sin ${noun}s automáticos`}
              description={`Crea uno para tu ${kind === 'expense' ? 'alquiler, suscripciones…' : 'sueldo, renta…'}`} />
          )}

          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={`${styles.item} ${item.is_active ? '' : styles.paused}`}>
                <div className={styles.info}>
                  <div className={styles.name}>{item.description || item.category?.name || 'Sin descripción'}</div>
                  <div className={styles.meta}>
                    Día {item.day_of_month} de cada mes
                    {item.category && <> · {item.category.name}</>}
                    {' · '}
                    {item.is_active ? `Próximo: ${nextRunLabel(item)}` : 'En pausa'}
                  </div>
                </div>
                <span className={styles.amount}>{kind === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}</span>
                <div className={styles.actionsRow}>
                  <button className={styles.iconBtn} onClick={() => toggleActive(item)}
                    aria-label={item.is_active ? 'Pausar' : 'Reanudar'} title={item.is_active ? 'Pausar' : 'Reanudar'}>
                    {item.is_active ? <IconPlayerPause size={15} stroke={1.75} /> : <IconPlayerPlay size={15} stroke={1.75} />}
                  </button>
                  <button className={styles.iconBtn} onClick={() => openForm(item)} aria-label="Editar">
                    <IconEdit size={15} stroke={1.75} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleting(item)} aria-label="Eliminar">
                    <IconTrash size={15} stroke={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Button onClick={() => openForm(null)}>+ Nuevo {noun} automático</Button>
        </div>
      )}
    </Modal>

    <ConfirmDialog
      isOpen={!!deleting}
      onClose={() => setDeleting(null)}
      onConfirm={confirmDelete}
      title={`Eliminar ${noun} automático`}
      description={`Dejará de crearse cada mes. Los ${noun}s que ya se registraron no se borran.`}
    />
    </>
  )
}
