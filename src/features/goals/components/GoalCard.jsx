import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Badge }       from '@/components/ui/Badge/Badge'
import { Button }      from '@/components/ui/Button/Button'
import { GOAL_STATUSES } from '@/lib/constants'
import styles from './GoalCard.module.css'

export function GoalCard({ goal, onEdit, onDelete, onAddProgress }) {
  const [addingProgress, setAddingProgress] = useState(false)
  const [progressAmount, setProgressAmount] = useState('')

  const pct    = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100)
  const status = GOAL_STATUSES[goal.status] ?? GOAL_STATUSES.active

  async function handleProgress() {
    const amount = Number(progressAmount)
    if (!amount || amount <= 0) return
    await onAddProgress(goal.id, amount)
    setProgressAmount('')
    setAddingProgress(false)
  }

  return (
    <div
      className={`${styles.card} ${goal.status === 'completed' ? styles.completed : ''}`}
      style={{ '--goal-color': goal.color }}
    >
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{goal.name}</div>
          {goal.target_date && (
            <div className={styles.daysLeft}>Fecha límite: {formatDate(goal.target_date)}</div>
          )}
        </div>
        <Badge color={status.color} withDot>{status.label}</Badge>
      </div>

      <ProgressBar
        percent={pct}
        color={goal.color}
        leftLabel={`${pct}%`}
        rightLabel={formatCurrency(goal.target_amount - goal.current_amount) + ' restante'}
        size="thick"
      />

      <div className={styles.amounts}>
        <span>
          <span className={styles.current}>{formatCurrency(goal.current_amount)}</span>
          <span> de {formatCurrency(goal.target_amount)}</span>
        </span>
      </div>

      {addingProgress ? (
        <div className={styles.progressInput}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto a añadir"
            value={progressAmount}
            onChange={(e) => setProgressAmount(e.target.value)}
            autoFocus
          />
          <Button size="sm" onClick={handleProgress}>Añadir</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingProgress(false)}>✕</Button>
        </div>
      ) : (
        <div className={styles.actions}>
          {goal.status !== 'completed' && (
            <Button size="sm" variant="success" onClick={() => setAddingProgress(true)}>
              + Añadir
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => onEdit(goal)}>Editar</Button>
          <Button size="sm" variant="danger"    onClick={() => onDelete(goal.id)}>Eliminar</Button>
        </div>
      )}
    </div>
  )
}
