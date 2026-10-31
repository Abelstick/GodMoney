import { formatCurrency } from '@/lib/formatters'
import styles from './ChartTooltip.module.css'

// Props comunes de los gráficos Recharts: ejes de 12px en texto atenuado,
// grilla horizontal sutil. Los colores salen de los tokens del theme.
export const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-muted)' }
export const AXIS_PROPS = { tick: AXIS_TICK, axisLine: false, tickLine: false }
export const GRID_PROPS = { stroke: 'var(--color-border)', vertical: false }
export const CURSOR = { fill: 'var(--color-surface-2)', radius: 4 }

// Tooltip único para los gráficos: título, una fila por serie con su color
// y el valor completo en soles. `getBadge(payload)` añade una etiqueta al título.
export function ChartTooltip({ active, payload, label, formatValue = formatCurrency, getBadge, labelFormatter }) {
  if (!active || !payload?.length) return null
  const badge = getBadge?.(payload)
  const rows = payload.filter((p) => p.value != null)

  return (
    <div className={styles.tooltip}>
      <p className={styles.title}>
        {labelFormatter ? labelFormatter(label) : label}
        {badge && <span className={styles.badge}>{badge}</span>}
      </p>
      {rows.map((p) => (
        <div key={p.dataKey ?? p.name} className={styles.row}>
          <span className={styles.dot} style={{ background: p.color ?? p.fill ?? p.payload?.fill }} />
          <span className={styles.name}>{p.name}</span>
          <span className={styles.value}>{formatValue(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
