import styles from './EmptyState.module.css'

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{icon}</div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.desc}>{description}</p>}
      {action}
    </div>
  )
}
