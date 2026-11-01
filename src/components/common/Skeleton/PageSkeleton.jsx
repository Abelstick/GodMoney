import { Skeleton } from './Skeleton'
import styles from './Skeleton.module.css'

// Silueta genérica mientras llega el chunk de una pantalla: título, bloque
// destacado y filas. Evita el salto de un spinner centrado a la página real.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando pantalla" aria-busy="true" className={styles.page}>
      <Skeleton className={styles.pageTitle} />
      <Skeleton className={styles.pageHero} />
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className={styles.pageRow} />)}
    </div>
  )
}
