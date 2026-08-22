import { useMemo, useState } from 'react'
import { useLoanAlerts } from '@/hooks/useLoanAlerts'
import { formatDate } from '@/lib/formatters'
import styles from './LoanAlerts.module.css'

const SEVERITY_ICON = { danger: '🚨', warning: '⏰', success: '🎉', info: '🔔' }

const FILTERS = [
  { value: 'unread', label: 'No leídas' },
  { value: 'all',     label: 'Todas' },
]

export function LoanAlerts() {
  const { alerts, markLoanAlertRead, markAllLoanAlertsRead } = useLoanAlerts()
  const [filter, setFilter] = useState('unread')

  const unreadCount = useMemo(() => alerts.filter((a) => !a.is_read).length, [alerts])
  const visible = filter === 'unread' ? alerts.filter((a) => !a.is_read) : alerts

  if (!alerts.length) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.icon}>🔔</span>
        <span className={styles.title}>Alertas de préstamos</span>
        <span className={styles.count}>{unreadCount}</span>
        {unreadCount > 0 && (
          <button className={styles.markAll} onClick={markAllLoanAlertsRead}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.filterChip} ${filter === f.value ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>Sin alertas pendientes</div>
      ) : (
        <div className={styles.list}>
          {visible.map((a) => (
            <div key={a.id} className={`${styles.alert} ${styles[a.severity]} ${a.is_read ? styles.read : ''}`}>
              <div className={styles.alertDot}>{SEVERITY_ICON[a.severity]}</div>
              <div className={styles.alertBody}>
                <span className={styles.alertMsg}>{a.message}</span>
                <span className={styles.alertDate}>{formatDate(a.created_at)}</span>
              </div>
              {!a.is_read && (
                <button className={styles.readBtn} onClick={() => markLoanAlertRead(a.id)}>
                  Marcar leída
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
