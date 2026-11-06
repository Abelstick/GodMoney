import { Money } from '@/components/ui/Money/Money'
import { formatDate } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import styles from './Builder.module.css'

// La "fórmula" al pie de la lista: lo que tienes, más lo que entra, menos lo que sale.
export function ListTotals({ summary, windowEnd }) {
  const { initial, income, outflow, final } = summary
  return (
    <dl className={styles.totals} aria-label={`Cómo quedarías al ${formatDate(windowEnd)}`}>
      <div className={styles.totalsRow}>
        <dt>{initial === 0 ? 'Saldo inicial (indícalo arriba)' : 'Saldo inicial'}</dt>
        <dd><Money value={fromCents(initial)} /></dd>
      </div>
      <div className={styles.totalsRow}>
        <dt>Entradas</dt>
        <dd><Money value={fromCents(income)} tone="income" signed /></dd>
      </div>
      <div className={styles.totalsRow}>
        <dt>Salidas</dt>
        <dd><Money value={fromCents(outflow)} tone="expense" signed /></dd>
      </div>
      <div className={`${styles.totalsRow} ${styles.totalsFinal}`}>
        <dt>Te quedaría al {formatDate(windowEnd)}</dt>
        <dd><Money value={fromCents(final)} tone={final < 0 ? 'expense' : 'neutral'} /></dd>
      </div>
    </dl>
  )
}
