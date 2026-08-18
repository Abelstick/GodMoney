import { Card } from '@/components/ui/Card/Card'
import styles from './SmartAlertsPanel.module.css'

export function SmartAlertsPanel({ alerts }) {
  return (
    <Card className={styles.mb}>
      <Card.Header>
        Alertas inteligentes {alerts.length > 0 && <span className={styles.count}>{alerts.length}</span>}
      </Card.Header>

      {alerts.length === 0 ? (
        <div className={styles.empty}>Todo en orden — sin alertas este mes</div>
      ) : (
        <div className={styles.list}>
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
