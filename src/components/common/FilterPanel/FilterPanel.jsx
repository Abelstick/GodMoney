import { IconAdjustmentsHorizontal, IconChevronDown } from '@tabler/icons-react'
import { useCollapsed } from '@/components/common/CollapseToggle/CollapseToggle'
import styles from './FilterPanel.module.css'

/**
 * Bloque de filtros plegable. Arranca contraído y recuerda (por dispositivo) si
 * se dejó abierto. Contraído sigue mostrando cuántos filtros hay activos, para
 * que una lista filtrada nunca parezca completa.
 * - id: clave única de la pantalla ('movements', 'expenses'…)
 * - activeCount: filtros activos · summary: texto corto (p. ej. el periodo)
 * - onClear: si se indica, ofrece «Limpiar» también con el bloque contraído
 */
export function FilterPanel({ id, activeCount = 0, summary, onClear, children, className = '' }) {
  const [collapsed, setCollapsed] = useCollapsed(`filters:${id}`, true)
  const bodyId = `filters-${id}`

  return (
    <div className={`${styles.panel} ${className}`}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
        >
          <IconAdjustmentsHorizontal size={16} stroke={1.75} aria-hidden="true" />
          <span className={styles.title}>Filtros</span>
          {activeCount > 0 && (
            <span className={styles.count}>
              {activeCount}
              <span className={styles.srOnly}> {activeCount === 1 ? 'activo' : 'activos'}</span>
            </span>
          )}
          {summary && <span className={styles.summary}>{summary}</span>}
          <IconChevronDown
            size={16} stroke={2} aria-hidden="true"
            className={`${styles.chevron} ${collapsed ? '' : styles.open}`}
          />
        </button>
        {collapsed && activeCount > 0 && onClear && (
          <button type="button" className={styles.clear} onClick={onClear}>Limpiar</button>
        )}
      </div>
      {!collapsed && <div id={bodyId} className={styles.body}>{children}</div>}
    </div>
  )
}
