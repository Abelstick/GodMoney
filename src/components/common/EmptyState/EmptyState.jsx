import { IconInbox } from '@tabler/icons-react'
import styles from './EmptyState.module.css'

// Estado vacío único: ícono, qué pasa y qué hacer (action = botón sugerido).
export function EmptyState({ icon, title, description, action, compact = false }) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div className={styles.icon} aria-hidden="true">
        {icon ?? <IconInbox size={32} stroke={1.5} />}
      </div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
