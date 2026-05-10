import { getDaysInMonth } from 'date-fns'
import { formatCurrency } from '@/lib/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Badge }       from '@/components/ui/Badge/Badge'
import { Button }      from '@/components/ui/Button/Button'
import { BUDGET_PERIODS } from '@/lib/constants'
import styles from './BudgetCard.module.css'

function getMonthProjection(budget) {
  if (budget.period !== 'monthly' || budget.spent === 0) return null
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = getDaysInMonth(today)
  return (budget.spent / dayOfMonth) * daysInMonth
}

export function BudgetCard({ budget, onEdit, onDelete, isCurrentMonth }) {
  const periodLabel = BUDGET_PERIODS.find((p) => p.value === budget.period)?.label ?? budget.period
  const isOver = budget.percent >= 100

  const projected = isCurrentMonth ? getMonthProjection(budget) : null
  const projectedOver = projected !== null && projected > budget.amount

  return (
    <div className={styles.card} style={{ '--budget-color': budget.color }}>
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{budget.name}</div>
          <div className={styles.period}>{periodLabel}</div>
        </div>
        {budget.category && (
          <Badge color={budget.category.color}>{budget.category.name}</Badge>
        )}
      </div>

      <ProgressBar
        percent={budget.percent}
        color={isOver ? undefined : budget.color}
        leftLabel={`${budget.percent}% usado`}
        rightLabel={isOver ? '¡Excedido!' : `${formatCurrency(budget.remaining)} disponible`}
      />

      <div className={styles.amounts}>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Límite</span>
          <span className={styles.amountValue}>{formatCurrency(budget.amount)}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Gastado</span>
          <span className={`${styles.amountValue} ${isOver ? styles.over : ''}`}>
            {formatCurrency(budget.spent)}
          </span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Restante</span>
          <span className={`${styles.amountValue} ${isOver ? styles.over : ''}`}>
            {isOver ? `-${formatCurrency(budget.spent - budget.amount)}` : formatCurrency(budget.remaining)}
          </span>
        </div>
      </div>

      {projected !== null && (
        <div className={`${styles.prediction} ${projectedOver ? styles.predictionOver : styles.predictionOk}`}>
          <span className={styles.predictionIcon}>{projectedOver ? '⚠️' : '📈'}</span>
          <span className={styles.predictionText}>
            Proyección fin de mes:{' '}
            <strong>{formatCurrency(projected)}</strong>
            {projectedOver && ` · excedería en ${formatCurrency(projected - budget.amount)}`}
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <Button size="sm" variant="secondary" onClick={() => onEdit(budget)}>Editar</Button>
        <Button size="sm" variant="danger"    onClick={() => onDelete(budget.id)}>Eliminar</Button>
      </div>
    </div>
  )
}
