import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react'
import styles from './Trend.module.css'

// Variación contra el periodo anterior. Nunca solo color: flecha + texto.
// pct: entero con signo (null = sin base de comparación → no se muestra).
// invert: en métricas donde subir es malo (gasto) el verde/rojo se invierte.
export function Trend({ pct, label, invert = false }) {
  if (pct === null || pct === undefined) return null

  const flat = pct === 0
  const up = pct > 0
  const favorable = flat ? null : invert ? !up : up
  const Icon = flat ? IconMinus : up ? IconArrowUpRight : IconArrowDownRight
  const tone = favorable === null ? styles.flat : favorable ? styles.good : styles.bad
  const verb = flat ? 'Igual' : up ? 'Sube' : 'Baja'

  return (
    <span className={`${styles.trend} ${tone}`}>
      <Icon size={14} stroke={2.25} aria-hidden="true" />
      <span>
        {flat ? verb : `${verb} ${Math.abs(pct)}%`}
        {label && <span className={styles.label}> {label}</span>}
      </span>
    </span>
  )
}
