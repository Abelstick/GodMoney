import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { getCreditScoreCategory } from '@/lib/creditScoreStatus'
import styles from './CreditScoreList.module.css'

export function CreditScoreList({ entries, onEdit, onDelete }) {
  // Más reciente primero para la lista (el gráfico usa orden ascendente aparte)
  const sorted = [...entries].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date))

  return (
    <div className={styles.list}>
      {sorted.map((entry, i) => {
        const older = sorted[i + 1]
        const delta = older ? entry.score - older.score : null
        const category = getCreditScoreCategory(entry.score)
        return (
          <div key={entry.id} className={styles.row}>
            <div className={styles.info}>
              <div className={styles.scoreLine}>
                <span className={styles.score} style={{ color: category.color }}>{entry.score}</span>
                <Badge color={category.color}>{category.label}</Badge>
                {delta !== null && delta !== 0 && (
                  <span className={`${styles.delta} ${delta > 0 ? styles.up : styles.down}`}>
                    {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
                  </span>
                )}
              </div>
              <div className={styles.meta}>
                <span>{formatDate(entry.recorded_date)}</span>
                {entry.source && <span> · {entry.source}</span>}
              </div>
              {entry.notes && <div className={styles.notes}>{entry.notes}</div>}
            </div>
            <div className={styles.actions}>
              <Button size="sm" variant="secondary" onClick={() => onEdit(entry)}>Editar</Button>
              <Button size="sm" variant="danger"    onClick={() => onDelete(entry.id)}>Eliminar</Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
