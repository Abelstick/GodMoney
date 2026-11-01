import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import styles from './DashboardSkeleton.module.css'

// Misma silueta que el dashboard: saldo + periodo, listas y gráfico.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando resumen" aria-busy="true">
      <div className={styles.row}>
        <Skeleton className={styles.hero} />
        <Skeleton className={styles.month} />
      </div>
      <div className={styles.row}>
        <Skeleton className={styles.list} />
        <Skeleton className={styles.list} />
      </div>
      <Skeleton className={styles.chart} />
    </div>
  )
}
