import { useRef, useState } from 'react'
import { ActionIcon, SegmentedControl, TextInput } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { createEvent, parseQuickEntries } from '@/lib/simulation/scenarioModel'
import { isPositiveAmount } from '@/lib/simulation/money'
import styles from './Builder.module.css'

const TYPES = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income',  label: 'Ingreso' },
]

const looksLikeTable = (text) => /[\r\n\t]/.test(text.trim())

// Agregar como en una hoja de cálculo: concepto, monto, Enter y al siguiente.
// Fecha y categoría se ajustan después, abriendo el movimiento.
export function QuickEntry({ defaultDate, onAdd, onPasted }) {
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [error, setError] = useState(null)
  const conceptRef = useRef(null)
  const amountRef = useRef(null)

  const toEvents = (entries) => entries.map((e) => createEvent({ ...e, date: defaultDate }))

  function changeAmount(value) {
    setError(null)
    // Un signo escrito a mano decide el tipo, como en una fórmula.
    if (/^\s*\+/.test(value)) setType('income')
    else if (/^\s*-/.test(value)) setType('expense')
    setAmount(value.replace(/^\s*[+-]\s*/, ''))
  }

  function submit() {
    const description = concept.trim()
    // Todo en el primer campo: "Alquiler 800".
    if (!amount.trim() && description) {
      const { entries } = parseQuickEntries(description)
      if (entries.length) {
        onAdd(toEvents(entries.map((e) => (type === 'income' ? { ...e, type } : e))))
        setConcept('')
        setType('expense')
        return
      }
      amountRef.current?.focus()
      return
    }
    const value = amount.trim()
    const normalized = /^\d+,\d{1,2}$/.test(value) ? value.replace(',', '.') : value
    if (!isPositiveAmount(normalized)) {
      setError('Escribe un monto mayor a 0')
      amountRef.current?.focus()
      return
    }
    onAdd(toEvents([{ description, amount: normalized.replace(/,/g, ''), type }]))
    setConcept('')
    setAmount('')
    setError(null)
    // Vuelve a gasto: si "Ingreso" se quedara marcado, el siguiente concepto se
    // sumaría en vez de restarse y el resultado saldría mal sin que se note.
    setType('expense')
    conceptRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData('text')
    if (!looksLikeTable(text)) return
    e.preventDefault()
    const { entries, skipped } = parseQuickEntries(text)
    if (entries.length) onAdd(toEvents(entries))
    onPasted(entries.length, skipped.length)
  }

  return (
    <div className={styles.quick}>
      <div className={styles.quickRow}>
        <TextInput
          ref={conceptRef}
          className={styles.quickConcept}
          aria-label="Concepto"
          placeholder="Concepto"
          value={concept}
          maxLength={80}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          autoComplete="off"
        />
        <TextInput
          ref={amountRef}
          className={styles.quickAmount}
          aria-label="Monto"
          placeholder="0.00"
          leftSection={<span className={styles.quickCurrency}>S/</span>}
          value={amount}
          inputMode="decimal"
          error={Boolean(error)}
          onChange={(e) => changeAmount(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          autoComplete="off"
        />
        <ActionIcon size={36} aria-label="Agregar a la lista" onClick={submit}>
          <IconPlus size={18} />
        </ActionIcon>
      </div>
      <div className={styles.quickFoot}>
        <SegmentedControl size="xs" value={type} onChange={setType} data={TYPES} aria-label="Tipo de movimiento" />
        {error
          ? <span className={styles.quickError} role="alert">{error}</span>
          : <span className={styles.quickHint}>Enter para agregar. También puedes pegar tu lista de Excel.</span>}
      </div>
    </div>
  )
}
