import { IconChevronDown } from '@tabler/icons-react'
import { usePersistentState } from '@/hooks/usePersistentState'
import styles from './CollapseToggle.module.css'

/**
 * Recuerda (por dispositivo) si un bloque de alertas está plegado.
 *   const [collapsed, setCollapsed] = useCollapsed('loans')
 */
export function useCollapsed(key, initial = false) {
  return usePersistentState(`godmoney:collapsed:${key}`, initial, (v) => typeof v === 'boolean')
}

/** Botón "Ocultar / Mostrar" para plegar un bloque. controls: id del contenido. */
export function CollapseToggle({ collapsed, onToggle, controls, className = '' }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={controls}
    >
      {collapsed ? 'Mostrar' : 'Ocultar'}
      <IconChevronDown
        size={14}
        stroke={2}
        aria-hidden="true"
        className={`${styles.chevron} ${collapsed ? '' : styles.open}`}
      />
    </button>
  )
}
