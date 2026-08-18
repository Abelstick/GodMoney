import { Card } from '@/components/ui/Card/Card'
import styles from './AutoInsightsList.module.css'

export function AutoInsightsList({ insights }) {
  return (
    <Card>
      <Card.Header>Insights automáticos</Card.Header>

      {insights.length === 0 ? (
        <div className={styles.empty}>Registra más movimientos para ver insights sobre tus hábitos</div>
      ) : (
        <ul className={styles.list}>
          {insights.map((i) => (
            <li key={i.id} className={styles.item}>
              <span className={styles.icon}>💡</span>
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
