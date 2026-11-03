import { Money } from '@/components/ui/Money/Money'
import { formatDate, formatSignedCurrency } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import styles from './Results.module.css'

// "¿Cuánto tendré dentro de 7, 15, 30 o 60 días?" — saldo al cierre de cada corte.
export function CheckpointStrip({ checkpoints, thresholdCents }) {
  const initial = checkpoints[0]?.balance ?? 0
  return (
    <div className={styles.checkpoints} role="table" aria-label="Saldo proyectado por período">
      <div role="rowgroup" className={styles.checkpointRow}>
        {checkpoints.map((cp) => {
          let tone
          if (cp.balance !== null && cp.balance < 0) tone = 'danger'
          else if (cp.balance !== null && cp.balance < thresholdCents) tone = 'warning'
          return (
            <div key={cp.days} role="row" className={styles.checkpoint} data-tone={tone}>
              <span role="rowheader" className={styles.cpLabel}>{cp.label}</span>
              <span role="cell" className={styles.cpValue}>
                {cp.balance === null ? '—' : <Money value={fromCents(cp.balance)} />}
              </span>
              <span role="cell" className={styles.cpMeta}>
                {cp.days === 0
                  ? 'Saldo inicial'
                  : cp.balance === null ? formatDate(cp.date) : formatSignedCurrency(fromCents(cp.balance - initial))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
