import { Paper } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'
import styles from './StatCard.module.css'

// `children` va debajo de la cifra (barra de progreso, detalle, enlace).
export function StatCard({
  label, amount, icon, iconBg, iconColor, trend, trendUp, trendLabel, invertTrendColor = false,
  valueColor, badge, className = '', children,
}) {
  // trendUp controla la flecha (dirección real); invertTrendColor permite que
  // métricas donde "subir" es negativo (p. ej. gasto) se pinten en rojo aunque suban.
  const isFavorable = invertTrendColor ? !trendUp : trendUp

  return (
    <Paper className={`${styles.card} ${className}`}>
      <div className={styles.top}>
        <div className={styles.labelRow}>
          {icon && (
            <div
              className={styles.iconWrap}
              style={{ background: iconBg ?? 'var(--color-primary-alpha)', color: iconColor }}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <span className={styles.label}>{label}</span>
        </div>
        {badge && (
          <span className={`${styles.badge} ${styles['badge-' + (badge.tone ?? 'neutral')]}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.amount} style={valueColor ? { color: valueColor } : undefined}>{amount}</div>
        {trend !== undefined && (
          <div className={`${styles.trend} ${isFavorable ? styles.up : styles.down}`}>
            {trendUp
              ? <IconArrowUpRight size={14} stroke={2.25} aria-hidden="true" />
              : <IconArrowDownRight size={14} stroke={2.25} aria-hidden="true" />}
            <span>{trendUp ? 'Sube' : 'Baja'} {trend}{trendLabel ? ` ${trendLabel}` : ''}</span>
          </div>
        )}
      </div>
      {children && <div className={styles.extra}>{children}</div>}
    </Paper>
  )
}
