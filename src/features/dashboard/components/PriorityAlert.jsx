import { Link } from 'react-router-dom'
import { Button } from '@mantine/core'
import { IconAlertTriangle, IconClock } from '@tabler/icons-react'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
import { CollapseToggle, useCollapsed } from '@/components/common/CollapseToggle/CollapseToggle'
import styles from './PriorityAlert.module.css'

// Una sola alerta arriba del dashboard (la más urgente). Las demás quedan a un
// toque: el contador lleva a la sección correspondiente. Se puede plegar a una
// línea para que no ocupe espacio; la preferencia se recuerda.
export function PriorityAlert({ alert, total, onDismiss }) {
  const [collapsed, setCollapsed] = useCollapsed('alerts:dashboard')
  if (!alert) return null
  const Icon = alert.tone === 'danger' ? IconAlertTriangle : IconClock
  const others = total - 1
  const toggle = (
    <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} controls="priority-alert-body" />
  )

  if (collapsed) {
    return (
      <section
        className={`${styles.compact} ${styles[alert.tone]}`}
        aria-label="Alerta prioritaria (plegada)"
      >
        <Icon size={16} stroke={2} className={styles.compactIcon} aria-hidden="true" />
        <span className={styles.compactText}>
          {total} {total === 1 ? 'alerta' : 'alertas'}
          <span className={styles.compactTitle}> · {alert.title}</span>
        </span>
        {toggle}
      </section>
    )
  }

  return (
    <section
      className={`${styles.alert} ${styles[alert.tone]}`}
      role={alert.tone === 'danger' ? 'alert' : 'status'}
      aria-label="Alerta prioritaria"
      id="priority-alert-body"
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
        {toggle}
      </div>
    </section>
  )
}
