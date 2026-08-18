import { useMemo, useState } from 'react'
import {
  BUDGET_STATUS,
  budgetStatusSeverity,
  getBudgetAlertMessage,
  getBudgetBadgeLabel,
} from '@/lib/budgetStatus'
import styles from './BudgetAlerts.module.css'

const FILTERS = [
  { value: 'all',                  label: 'Todas' },
  { value: BUDGET_STATUS.WARNING,  label: 'Cerca' },
  { value: BUDGET_STATUS.REACHED,  label: 'Alcanzadas' },
  { value: BUDGET_STATUS.EXCEEDED, label: 'Excedidas' },
]

export function BudgetAlerts({ budgets }) {
  const [filter, setFilter] = useState('all')

  const alerts = useMemo(() => (
    budgets
      .filter((b) => b.status !== BUDGET_STATUS.NORMAL)
      .sort((a, b) => budgetStatusSeverity(b.status) - budgetStatusSeverity(a.status) || b.percent - a.percent)
  ), [budgets])

  const counts = useMemo(() => {
    const acc = { [BUDGET_STATUS.WARNING]: 0, [BUDGET_STATUS.REACHED]: 0, [BUDGET_STATUS.EXCEEDED]: 0 }
    alerts.forEach((b) => { acc[b.status] += 1 })
    return acc
  }, [alerts])

  if (!alerts.length) return null

  const visible = filter === 'all' ? alerts : alerts.filter((b) => b.status === filter)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.icon}>🔔</span>
        <span className={styles.title}>Alertas de gasto</span>
        <span className={styles.count}>{alerts.length}</span>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => {
          const count = f.value === 'all' ? alerts.length : counts[f.value]
          return (
            <button
              key={f.value}
              className={`${styles.filterChip} ${filter === f.value ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              <span className={styles.filterCount}>{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>Sin alertas en esta categoría</div>
      ) : (
        <div className={styles.list}>
          {visible.map((b) => (
            <div key={b.id} className={`${styles.alert} ${styles[b.status]}`}>
              <div className={styles.alertDot} />
              <div className={styles.alertBody}>
                <span className={styles.alertName}>{b.name}</span>
                <span className={styles.alertMsg}>{getBudgetAlertMessage(b)}</span>
              </div>
              <span className={styles.badge}>{getBudgetBadgeLabel(b)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
