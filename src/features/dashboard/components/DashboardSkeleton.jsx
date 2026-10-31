import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import styles from './DashboardSkeleton.module.css'

// Misma silueta que el dashboard: hero, 3 indicadores, listas y gráfico.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando resumen" aria-busy="true">
      <Skeleton className={styles.hero} />

      <div className={styles.kpis}>
        <Skeleton className={`${styles.kpi} ${styles.kpiMain}`} />
        <Skeleton className={styles.kpi} />
        <Skeleton className={styles.kpi} />
      </div>

      <div className={styles.twoCol}>
        <Skeleton className={styles.list} />
        <Skeleton className={styles.list} />
      </div>

      <Skeleton className={styles.chart} />
    </div>
  )
}
