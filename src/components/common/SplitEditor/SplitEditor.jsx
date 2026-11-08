import { ActionIcon, Button, NumberInput, SegmentedControl, Select } from '@mantine/core'
import { IconPlus, IconX } from '@tabler/icons-react'
import { SPLIT_MODES, evenPercents, resolveSplit, fillRemaining, convertParts } from '@/lib/expenseSplit'
import { formatCurrency } from '@/lib/formatters'
import styles from './SplitEditor.module.css'

const MODES = [
  { value: SPLIT_MODES.PERCENT, label: 'Porcentaje' },
  { value: SPLIT_MODES.AMOUNT,  label: 'Monto' },
]

const newKey = () => crypto.randomUUID()

// Estado inicial al activar "Dividir": la categoría ya elegida + otra, mitad y mitad.
// `firstId`: al editar un gasto que no estaba dividido, la primera parte es ese gasto.
export function initialSplit(categoryId = '', firstId) {
  const [a, b] = evenPercents(2)
  return {
    mode: SPLIT_MODES.PERCENT,
    parts: [
      { key: newKey(), id: firstId, category_id: categoryId || '', value: a },
      { key: newKey(), category_id: '', value: b },
    ],
  }
}

/**
 * Reparte el total de un gasto entre varias categorías, por porcentaje o por
 * monto. `value` = { mode, parts: [{ key, category_id, value }] }.
 */
export function SplitEditor({ total, value, onChange, categories }) {
  const { mode, parts } = value
  const isPercent = mode === SPLIT_MODES.PERCENT
  const status = resolveSplit(total, parts, mode)
  const hasTotal = Number(total) > 0

  const setParts = (next) => onChange({ mode, parts: next })
  const patchPart = (key, patch) => setParts(parts.map((p) => (p.key === key ? { ...p, ...patch } : p)))

  function changeMode(next) {
    onChange({ mode: next, parts: convertParts(total, parts, mode, next) })
  }

  function addPart() {
    const next = [...parts, { key: newKey(), category_id: '', value: '' }]
    // En porcentaje, si aún estaba en partes iguales, se reparte de nuevo en partes iguales.
    const wasEven = evenPercents(parts.length).every((v, i) => v === parts[i].value)
    setParts(isPercent && wasEven ? next.map((p, i) => ({ ...p, value: evenPercents(next.length)[i] })) : next)
  }

  function removePart(key) {
    setParts(parts.filter((p) => p.key !== key))
  }

  function fillPart(index) {
    patchPart(parts[index].key, { value: fillRemaining(total, parts, mode, index) })
  }

  // La parte a completar: la primera vacía, o la última.
  const emptyIndex = parts.findIndex((p) => p.value === '' || Number(p.value) === 0)
  const fillIndex = emptyIndex >= 0 ? emptyIndex : parts.length - 1
  const canFill = hasTotal && status.remaining > 0

  const used = new Set(parts.map((p) => p.category_id))
  const options = (current) => [
    { value: '', label: 'Sin categoría', disabled: current !== '' && used.has('') },
    ...categories.map((c) => ({ value: c.id, label: c.name, disabled: c.id !== current && used.has(c.id) })),
  ]

  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <span className={styles.title}>Dividir entre categorías</span>
        <SegmentedControl size="xs" value={mode} onChange={changeMode} data={MODES} aria-label="Dividir por" />
      </div>

      <ul className={styles.parts}>
        {parts.map((p, i) => (
          <li key={p.key} className={styles.part}>
            <Select
              className={styles.category}
              aria-label={`Categoría de la parte ${i + 1}`}
              data={options(p.category_id)}
              value={p.category_id}
              onChange={(v) => patchPart(p.key, { category_id: v ?? '' })}
              allowDeselect={false}
              searchable
              comboboxProps={{ withinPortal: false }}
            />
            <NumberInput
              className={styles.value}
              aria-label={`${isPercent ? 'Porcentaje' : 'Monto'} de la parte ${i + 1}`}
              value={p.value}
              onChange={(v) => patchPart(p.key, { value: v === '' ? '' : String(v) })}
              allowNegative={false}
              decimalScale={2}
              min={0}
              max={isPercent ? 100 : undefined}
              hideControls
              placeholder="0"
              leftSection={isPercent ? undefined : <span className={styles.affix}>S/</span>}
              rightSection={isPercent ? <span className={styles.affix}>%</span> : undefined}
              inputMode="decimal"
            />
            {parts.length > 2 ? (
              <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => removePart(p.key)} aria-label={`Quitar parte ${i + 1}`}>
                <IconX size={16} />
              </ActionIcon>
            ) : <span className={styles.spacer} aria-hidden />}
            {isPercent && hasTotal && (
              <span className={styles.partAmount}>{formatCurrency(status.amounts[i] / 100)}</span>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Button variant="subtle" size="compact-sm" leftSection={<IconPlus size={14} />} onClick={addPart} disabled={parts.length >= categories.length + 1}>
          Agregar categoría
        </Button>
        {canFill && (
          <Button variant="light" size="compact-sm" onClick={() => fillPart(fillIndex)}>
            Asignar lo que falta ({status.remainingLabel})
          </Button>
        )}
      </div>

      <p className={status.valid ? styles.ok : styles.pending} role="status">
        {status.valid ? `Listo: se guardarán ${parts.length} gastos que suman ${formatCurrency(Number(total))}.` : status.error}
      </p>
    </div>
  )
}
