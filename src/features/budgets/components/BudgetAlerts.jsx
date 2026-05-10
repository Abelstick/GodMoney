import { formatCurrency } from '@/lib/formatters'
import styles from './BudgetAlerts.module.css'

export function BudgetAlerts({ budgets }) {
  const alerts = budgets
    .filter((b) => b.percent >= 80)
    .sort((a, b) => b.percent - a.percent)

  if (!alerts.length) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.icon}>🔔</span>
        <span className={styles.title}>Alertas de gasto</span>
        <span className={styles.count}>{alerts.length}</span>
      </div>
      <div className={styles.list}>
        {alerts.map((b) => {
          const isOver = b.percent >= 100
          return (
            <div key={b.id} className={`${styles.alert} ${isOver ? styles.danger : styles.warning}`}>
              <div className={styles.alertDot} />
              <div className={styles.alertBody}>
                <span className={styles.alertName}>{b.name}</span>
                <span className={styles.alertMsg}>
                  {isOver
                    ? `Excedido — gastaste ${formatCurrency(b.spent - b.amount)} de más`
                    : `${b.percent}% usado — quedan ${formatCurrency(b.remaining)}`}
                </span>
              </div>
              <span className={styles.badge}>
                {isOver ? '¡Excedido!' : `${b.percent}%`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
