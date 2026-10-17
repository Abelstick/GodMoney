import { useState } from 'react'
import { IconX, IconTrash, IconTag, IconFolder } from '@tabler/icons-react'
import { formatCurrency } from '@/lib/formatters'
import styles from './BulkBar.module.css'

// Barra de acciones para varios movimientos seleccionados: cambiar categoría,
// agregar etiqueta o eliminar. `onChangeCategory` / `onAddTag` / `onDelete`
// reciben el trabajo ya resuelto; el padre decide cómo confirmar y deshacer.
export function BulkBar({ count, total, totalCount, sign, categories, busy, onSelectAll, onClear, onChangeCategory, onAddTag, onDelete }) {
  const [tag, setTag] = useState('')

  function submitTag(e) {
    e.preventDefault()
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    if (!clean) return
    onAddTag(clean)
    setTag('')
  }

  return (
    <div className={styles.bar} role="region" aria-label="Acciones sobre la selección">
      <div className={styles.summary}>
        <strong>{count} seleccionado{count !== 1 ? 's' : ''}</strong>
        <span className={styles.total}>{sign}{formatCurrency(total)}</span>
        {count < totalCount && (
          <button type="button" className={styles.link} onClick={onSelectAll}>Seleccionar los {totalCount}</button>
        )}
      </div>

      <div className={styles.actions}>
        <label className={styles.field}>
          <IconFolder size={14} stroke={1.75} aria-hidden="true" />
          <select
            className={styles.select}
            value=""
            disabled={busy || count === 0}
            aria-label="Cambiar categoría"
            onChange={(e) => e.target.value !== '' && onChangeCategory(e.target.value === '__none__' ? null : e.target.value)}
          >
            <option value="" disabled>Cambiar categoría…</option>
            <option value="__none__">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <form className={styles.field} onSubmit={submitTag}>
          <IconTag size={14} stroke={1.75} aria-hidden="true" />
          <input
            className={styles.input}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Agregar etiqueta…"
            aria-label="Agregar etiqueta"
            disabled={busy || count === 0}
          />
        </form>

        <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={onDelete} disabled={busy || count === 0}>
          <IconTrash size={14} stroke={1.75} /> Eliminar
        </button>
        <button type="button" className={styles.btn} onClick={onClear} aria-label="Cancelar selección">
          <IconX size={14} stroke={2} /> Cancelar
        </button>
      </div>
    </div>
  )
}
