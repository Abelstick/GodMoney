import { Card } from '@/components/ui/Card/Card'
import { CollapseToggle, useCollapsed } from '@/components/common/CollapseToggle/CollapseToggle'
import styles from './SmartAlertsPanel.module.css'

export function SmartAlertsPanel({ alerts }) {
  const [collapsed, setCollapsed] = useCollapsed('alerts:insights')
  const canCollapse = alerts.length > 0

  return (
    <Card className={styles.mb}>
      <Card.Header
        action={canCollapse && (
          <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} controls="smart-alerts-body" />
        )}
      >
        Alertas inteligentes {alerts.length > 0 && <span className={styles.count}>{alerts.length}</span>}
      </Card.Header>

      {alerts.length === 0 ? (
        <div className={styles.empty}>Todo en orden — sin alertas este mes</div>
      ) : !collapsed && (
        <div className={styles.list} id="smart-alerts-body">
          {alerts.map((a) => (
            <div key={a.id} className={`${styles.alert} ${styles[a.severity]}`}>
              <div className={styles.dot} />
              <span className={styles.message}>{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
