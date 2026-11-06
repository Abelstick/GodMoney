import { useEffect, useRef, useState } from 'react'
import { ActionIcon, SegmentedControl, TextInput } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { readAmountInput } from '@/lib/simulation/scenarioModel'
import { isPositiveAmount } from '@/lib/simulation/money'
import styles from './Builder.module.css'

const TYPES = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income',  label: 'Ingreso' },
]
const canSwitchType = (type) => type === 'expense' || type === 'income'

// Edición en la propia fila: se guarda con Enter, con ✓ o al salir de ella;
// Escape descarta. El resto de los campos sigue en "Más detalles".
export function EventInlineEdit({ event, focusField = 'description', onSave, onCancel, onMore }) {
  const [description, setDescription] = useState(event.description ?? '')
  const [amount, setAmount] = useState(String(event.amount))
  const [type, setType] = useState(event.type)
  const [error, setError] = useState(null)
  const descriptionRef = useRef(null)
  const amountRef = useRef(null)
  // iOS no da foco a los botones al tocarlos: sin esto, tocar "Ingreso" contaría
  // como salir de la fila y guardaría antes de tiempo.
  const pressing = useRef(false)

  useEffect(() => {
    const field = focusField === 'amount' ? amountRef.current : descriptionRef.current
    field?.focus()
    field?.select()
  }, [])

  const current = () => {
    const { sign, amount: clean } = readAmountInput(amount)
    let nextType = type
    if (canSwitchType(event.type) && sign === '+') nextType = 'income'
    if (canSwitchType(event.type) && sign === '-') nextType = 'expense'
    return { ...event, description: description.trim(), amount: clean, type: nextType }
  }

  function commit() {
    const next = current()
    if (!isPositiveAmount(next.amount)) {
      setError('Escribe un monto mayor a 0')
      return
    }
    const changed = next.description !== (event.description ?? '')
      || next.amount !== String(event.amount)
      || next.type !== event.type
    if (changed) onSave(next)
    else onCancel()
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.currentTarget === descriptionRef.current) amountRef.current?.focus()
      else commit()
    }
  }

  return (
    <div
      className={styles.inlineEdit}
      onPointerDownCapture={() => {
        pressing.current = true
        setTimeout(() => { pressing.current = false }, 300)
      }}
      onBlur={(e) => {
        if (pressing.current || e.currentTarget.contains(e.relatedTarget)) return
        commit()
      }}
    >
      <div className={styles.quickRow}>
        <TextInput
          ref={descriptionRef}
          className={styles.quickConcept}
          classNames={{ input: styles.touchInput }}
          aria-label="Concepto"
          placeholder="Concepto"
          value={description}
          maxLength={80}
          enterKeyHint="next"
          autoComplete="off"
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <TextInput
          ref={amountRef}
          className={styles.quickAmount}
          classNames={{ input: styles.touchInput }}
          aria-label="Monto"
          leftSection={<span className={styles.quickCurrency}>S/</span>}
          value={amount}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          error={Boolean(error)}
          onChange={(e) => { setAmount(e.target.value); setError(null) }}
          onKeyDown={onKeyDown}
        />
        <ActionIcon className={styles.touchIcon} size={36} variant="filled" aria-label="Guardar cambios" onClick={commit}>
          <IconCheck size={18} />
        </ActionIcon>
      </div>
      <div className={styles.inlineFoot}>
        {canSwitchType(event.type) && (
          <SegmentedControl size="xs" value={type} onChange={setType} data={TYPES} aria-label="Tipo de movimiento" />
        )}
        <button type="button" className={styles.inlineMore} onClick={() => onMore(current())}>
          Más detalles
        </button>
      </div>
      {error && <p className={styles.quickError} role="alert">{error}</p>}
    </div>
  )
}
