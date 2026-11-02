import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import cardStyles from './GiftCards.module.css'
import styles from './GiftsSkeleton.module.css'

function Lines({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.row}>
      <Skeleton className={styles.dot} />
      <div className={styles.rowText}>
        <Skeleton className={styles.line} style={{ width: `${55 + ((i * 17) % 30)}%` }} />
        <Skeleton className={styles.lineSm} />
      </div>
      <Skeleton className={styles.amount} />
    </div>
  ))
}

// Hueco de la barra de cada pestaña (botón "+ Nueva…" y filtros del historial).
function Toolbar({ withFilters = false }) {
  return (
    <div className={styles.toolbar} aria-hidden="true">
      {withFilters && <Skeleton className={styles.filters} />}
      <Skeleton className={styles.toolbarButton} />
    </div>
  )
}

// Tarjeta de fecha o de persona: misma cabecera, bloque de presupuesto y filas.
function CardSkeleton({ variant }) {
  return (
    <div className={cardStyles.card} aria-hidden="true">
      <div className={cardStyles.top}>
        <div className={cardStyles.info}>
          <Skeleton className={variant === 'person' ? styles.avatar : styles.dateBox} />
          <div className={styles.titleBlock}>
            <Skeleton className={styles.title} />
            <Skeleton className={styles.pill} />
          </div>
        </div>
      </div>
      {variant === 'occasion' && (
        <>
          <Skeleton className={styles.progress} />
          <Skeleton className={styles.saving} />
        </>
      )}
      <Lines count={variant === 'person' ? 1 : 2} />
      <Skeleton className={styles.button} />
    </div>
  )
}

// Esqueleto de la página Regalos según la pestaña abierta.
export function GiftsSkeleton({ tab, gridClassName, panelClassName }) {
  const label = 'Cargando regalos'
  if (tab === 'ideas' || tab === 'history') {
    return (
      <div role="status" aria-label={label} aria-busy="true" className={styles.stack}>
        {tab === 'history' && <Toolbar withFilters />}
        {(tab === 'history' ? [5, 3] : [6]).map((count, i) => (
          <div key={i} className={panelClassName} aria-hidden="true">
            {tab === 'history' && <Skeleton className={styles.yearHeader} />}
            <Lines count={count} />
          </div>
        ))}
      </div>
    )
  }
  const variant = tab === 'people' ? 'person' : 'occasion'
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <Toolbar />
      <div className={gridClassName}>
        <CardSkeleton variant={variant} />
        <CardSkeleton variant={variant} />
        <CardSkeleton variant={variant} />
      </div>
    </div>
  )
}
