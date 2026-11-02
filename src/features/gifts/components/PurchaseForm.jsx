import { useState } from 'react'
import { format } from 'date-fns'
import { Switch } from '@mantine/core'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { GiftCategorySelect } from './GiftCategorySelect'
import styles from './GiftForms.module.css'

// "Ya lo compré" desde una idea o un regalo planificado.
export function PurchaseForm({ gift, onSubmit, onCancel, loading }) {
  const [amount, setAmount] = useState(gift.estimated_amount ? String(gift.estimated_amount) : '')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState('')
  const [createExpense, setCreateExpense] = useState(true)
  const [errors, setErrors] = useState({})

  function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!amount || Number(amount) <= 0) errs.amount = 'Debe ser mayor a 0'
    if (!date) errs.date = 'Obligatorio'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({ amount: Number(amount), date, category_id: categoryId || null, createExpense })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.hint}>
        <strong>{gift.title}</strong>
        {gift.person?.name && <> para {gift.person.name}</>}
        {gift.occasion?.name && <> · {gift.occasion.name} {gift.year ?? ''}</>}
      </p>
      <div className={styles.row2}>
        <Input label="Monto pagado" type="number" min="0" step="0.01" prefix="S/" value={amount}
          onChange={(e) => setAmount(e.target.value)} error={errors.amount} required data-autofocus />
        <Input label="Fecha de compra" type="date" value={date} onChange={(e) => setDate(e.target.value)}
          error={errors.date} required />
      </div>
      <Switch label="Registrar como gasto" description="Descuenta del mes y cuenta en tus presupuestos"
        checked={createExpense} onChange={(e) => setCreateExpense(e.currentTarget.checked)} />
      {createExpense && <GiftCategorySelect type="expense" value={categoryId} onChange={setCategoryId} />}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Registrando…' : 'Marcar como comprado'}</Button>
      </div>
    </form>
  )
}
