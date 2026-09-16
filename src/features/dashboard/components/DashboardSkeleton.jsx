import styles from './DashboardSkeleton.module.css'

function Block({ className }) {
  return <div className={`${styles.block} ${className ?? ''}`} />
}

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" aria-label="Cargando dashboard">
      <Block className={styles.hero} />

      <div className={styles.grid}>
        <Block className={styles.stat} />
        <Block className={styles.stat} />
        <Block className={styles.stat} />
        <Block className={styles.stat} />
      </div>

      <div className={styles.grid}>
        <Block className={styles.stat} />
        <Block className={styles.stat} />
        <Block className={styles.stat} />
        <Block className={styles.stat} />
      </div>

      <div className={styles.twoCol}>
        <Block className={styles.chart} />
        <Block className={styles.list} />
      </div>
    </div>
  )
}
