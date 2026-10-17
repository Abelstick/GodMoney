import { useState } from 'react'
import { RANGE_PRESETS, buildRange, isValidRange } from '@/lib/dateRanges'
import styles from './RangeFilter.module.css'

// Atajos de rango (últimos 30 días, año, personalizado) para usar junto al
// filtro de mes. `range` es null mientras manda el mes seleccionado; tocar el
// atajo activo vuelve al mes.
export function RangeFilter({ range, onChange }) {
  const today = new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState({ from: '', to: '' })

  function selectPreset(type) {
    if (range?.type === type) return onChange(null)
    const next = buildRange(type)
    setDraft({ from: next.from, to: next.to })
    onChange(next)
  }

  function setBound(field, value) {
    const next = { from: draft.from || range.from, to: draft.to || range.to, [field]: value }
    setDraft({ from: next.from, to: next.to })
    if (isValidRange(next.from, next.to)) onChange({ type: 'custom', from: next.from, to: next.to })
  }

  // Rango invertido: se avisa y no se aplica hasta que se corrija.
  const invalid = range?.type === 'custom' && !isValidRange(draft.from || range.from, draft.to || range.to)

  return (
    <div className={styles.wrap}>
      <div className={styles.chips}>
        <span className={styles.label}>Rango</span>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={range?.type === p.value}
            className={`${styles.chip} ${range?.type === p.value ? styles.active : ''}`}
            onClick={() => selectPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {range?.type === 'custom' && (
        <div className={styles.custom}>
          <label className={styles.field}>
            <span>Desde</span>
            <input type="date" className={styles.date} value={draft.from || range.from} max={today}
              onChange={(e) => setBound('from', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Hasta</span>
            <input type="date" className={styles.date} value={draft.to || range.to} max={today}
              onChange={(e) => setBound('to', e.target.value)} />
          </label>
          {invalid && <span className={styles.error} role="alert">La fecha inicial debe ser anterior a la final</span>}
        </div>
      )}
    </div>
  )
}
