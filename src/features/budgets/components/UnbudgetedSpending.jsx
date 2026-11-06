import { IconPlus } from '@tabler/icons-react'
import { formatCurrency } from '@/lib/formatters'
import styles from './UnbudgetedSpending.module.css'

const VISIBLE = 4

// Lo que se gastó fuera de cualquier presupuesto. Cada categoría abre el
// formulario ya rellenado; "Sin categoría" no, porque no hay nada que vincular.
export function UnbudgetedSpending({ data, monthLabel, onCreate }) {
  if (!data) return null

  const visible = data.categories.slice(0, VISIBLE)
  const hidden = data.categories.length - visible.length

  return (
    <section className={styles.wrapper} aria-labelledby="unbudgeted-title">
      <h2 id="unbudgeted-title" className={styles.title}>
        {formatCurrency(data.total)} sin presupuesto en {monthLabel}
      </h2>
      <p className={styles.desc}>No cuentan para ningún límite. Toca una categoría para crearle uno.</p>
      <div className={styles.list}>
        {visible.map((c) => (c.id ? (
          <button
            type="button"
            key={c.id}
            className={styles.chip}
            onClick={() => onCreate(c)}
            aria-label={`Crear presupuesto para ${c.name}, ${formatCurrency(c.total)} gastados`}
          >
            <span className={styles.dot} style={{ background: c.color ?? undefined }} aria-hidden="true" />
            <span>{c.name}</span>
            <span className={styles.amount}>{formatCurrency(c.total)}</span>
            <IconPlus size={14} stroke={2} aria-hidden="true" className={styles.plus} />
          </button>
        ) : (
          <span key="none" className={`${styles.chip} ${styles.static}`}>
            <span className={styles.dot} aria-hidden="true" />
            <span>{c.name}</span>
            <span className={styles.amount}>{formatCurrency(c.total)}</span>
          </span>
        )))}
        {hidden > 0 && <span className={styles.more}>y {hidden} más</span>}
      </div>
    </section>
  )
}
