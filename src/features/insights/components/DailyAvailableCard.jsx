import { formatCurrency } from '@/lib/formatters'
import styles from './DailyAvailableCard.module.css'

export function DailyAvailableCard({ dailyAvailable }) {
  const { availablePerDay, daysRemaining, moneyLeft, budgetsRemaining } = dailyAvailable
  const negative = availablePerDay < 0

  return (
    <div className={`${styles.card} ${negative ? styles.negative : ''}`}>
      <div className={styles.label}>Disponible para gastar por día</div>
      <div className={styles.amount}>{formatCurrency(availablePerDay)}</div>
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
