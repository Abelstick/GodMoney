import { useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { CATEGORY_COLORS } from '@/lib/constants'
import styles from './AccountForm.module.css'

const EMPTY = { name: '', balance: '0', color: '#6366f1', icon: 'wallet' }

export function AccountForm({ initial, isEditing = false, onSubmit, onCancel, loading }) {
  const [form, setForm]     = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (form.balance === '' || Number.isNaN(Number(form.balance))) errs.balance = 'Saldo inválido'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const payload = { name: form.name.trim(), color: form.color, icon: form.icon }
    if (!isEditing) payload.balance = Number(form.balance)
    onSubmit(payload)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre de la cuenta" value={form.name} onChange={set('name')}
        error={errors.name} required placeholder="Ej: Efectivo, BCP Ahorros" />
      <Input
        label="Saldo inicial" type="number" step="0.01" prefix="S/"
        value={form.balance} onChange={set('balance')} error={errors.balance}
        disabled={isEditing}
        hint={isEditing ? 'El saldo solo cambia mediante préstamos y pagos registrados' : undefined}
      />
      <div>
        <label className={styles.label}>Color</label>
        <div className={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`${styles.colorSwatch} ${form.color === c ? styles.selected : ''}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : isEditing ? 'Actualizar' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )
}
