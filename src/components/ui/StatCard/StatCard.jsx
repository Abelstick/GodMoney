import { Paper } from '@mantine/core'
import styles from './StatCard.module.css'

export function StatCard({ label, amount, icon, iconBg, trend, trendUp, className = '' }) {
  return (
    <Paper shadow="xs" className={`${styles.card} ${className}`}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <div className={styles.iconWrap} style={{ background: iconBg ?? 'var(--color-primary-alpha)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className={styles.amount}>{amount}</div>
      {trend !== undefined && (
        <div className={`${styles.trend} ${trendUp ? styles.up : styles.down}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </Paper>
  )
}
