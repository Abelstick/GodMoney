import { Paper } from '@mantine/core'
import styles from './StatCard.module.css'

export function StatCard({ label, amount, icon, iconBg, trend, trendUp, invertTrendColor = false, className = '' }) {
  // trendUp controla la flecha (dirección real); invertTrendColor permite que
  // métricas donde "subir" es negativo (p. ej. gasto) se pinten en rojo aunque suban.
  const isFavorable = invertTrendColor ? !trendUp : trendUp

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
        <div className={`${styles.trend} ${isFavorable ? styles.up : styles.down}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </Paper>
  )
}
