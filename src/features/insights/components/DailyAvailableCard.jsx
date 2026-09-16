import { formatCurrency } from '@/lib/formatters'
import styles from './DailyAvailableCard.module.css'

export function DailyAvailableCard({ dailyAvailable }) {
  const { availablePerDay, daysRemaining, moneyLeft, budgetsRemaining } = dailyAvailable
  const negative = availablePerDay < 0

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <span className={`${styles.dot} ${negative ? styles.dotDown : styles.dotUp}`} />
        Disponible para gastar por día
      </div>
      <div className={`${styles.amount} ${negative ? styles.negative : styles.positive}`}>
        {formatCurrency(availablePerDay)}
      </div>
      <div className={styles.meta}>
        {daysRemaining > 0
          ? `${formatCurrency(moneyLeft)} restantes · ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'} por delante`
          : 'Último día del mes'}
      </div>
      {budgetsRemaining > 0 && (
        <div className={styles.budgetsRemaining}>
          + {formatCurrency(budgetsRemaining)} disponibles en presupuestos activos
        </div>
      )}
    </div>
  )
}
