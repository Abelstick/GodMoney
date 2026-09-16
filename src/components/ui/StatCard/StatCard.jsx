import { Paper } from '@mantine/core'
import styles from './StatCard.module.css'

export function StatCard({ label, amount, icon, iconBg, trend, trendUp, invertTrendColor = false, valueColor, badge, className = '' }) {
  // trendUp controla la flecha (dirección real); invertTrendColor permite que
  // métricas donde "subir" es negativo (p. ej. gasto) se pinten en rojo aunque suban.
  const isFavorable = invertTrendColor ? !trendUp : trendUp

  return (
    <Paper shadow="xs" className={`${styles.card} ${className}`}>
      <div className={styles.top}>
        {icon && (
          <div className={styles.iconWrap} style={{ background: iconBg ?? 'var(--color-primary-alpha)' }}>
            {icon}
          </div>
        )}
        {badge && (
          <span className={`${styles.badge} ${styles['badge-' + (badge.tone ?? 'neutral')]}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <div className={styles.amount} style={valueColor ? { color: valueColor } : undefined}>{amount}</div>
        {trend !== undefined && (
          <div className={`${styles.trend} ${isFavorable ? styles.up : styles.down}`}>
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
    </Paper>
  )
}
