import { Link } from 'react-router-dom'
import { Button } from '@mantine/core'
import { IconAlertTriangle, IconClock } from '@tabler/icons-react'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
import styles from './PriorityAlert.module.css'

// Una sola alerta arriba del dashboard (la más urgente). Las demás quedan a un
// toque: el contador lleva a la sección correspondiente.
export function PriorityAlert({ alert, total, onDismiss }) {
  if (!alert) return null
  const Icon = alert.tone === 'danger' ? IconAlertTriangle : IconClock
  const others = total - 1

  return (
    <section
      className={`${styles.alert} ${styles[alert.tone]}`}
      role={alert.tone === 'danger' ? 'alert' : 'status'}
      aria-label="Alerta prioritaria"
    >
      <div className={styles.icon} aria-hidden="true">
        <Icon size={20} stroke={2} />
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <StatusBadge tone={alert.tone} size="sm">{alert.status}</StatusBadge>
          <span className={styles.context}>{alert.context}</span>
        </div>
        <p className={styles.title}>{alert.title}</p>
        {others > 0 && (
          <p className={styles.more}>
            y {others} {others === 1 ? 'alerta más' : 'alertas más'}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <Button component={Link} to={alert.to} size="xs" variant="light" color={alert.tone === 'danger' ? 'expense' : 'warning'}>
          Revisar
        </Button>
        {onDismiss && (
          <Button size="xs" variant="subtle" color="gray" onClick={onDismiss}>
            Marcar leída
          </Button>
        )}
      </div>
    </section>
  )
}
