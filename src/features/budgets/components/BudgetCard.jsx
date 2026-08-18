import { getDaysInMonth } from 'date-fns'
import { formatCurrency } from '@/lib/formatters'
import { BUDGET_STATUS, BUDGET_STATUS_META } from '@/lib/budgetStatus'
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

  const isExceeded = budget.status === BUDGET_STATUS.EXCEEDED
  const isReached  = budget.status === BUDGET_STATUS.REACHED
  const statusMeta = BUDGET_STATUS_META[budget.status]

  const projected = isCurrentMonth ? getMonthProjection(budget) : null
  const projectedOver = projected !== null && projected > budget.amount

  let progressRightLabel = `${formatCurrency(budget.remaining)} disponible`
  if (isExceeded) progressRightLabel = `Excedido en ${formatCurrency(budget.overBy)}`
  else if (isReached) progressRightLabel = 'Presupuesto alcanzado'

  const spentClass = isExceeded ? styles.over : ''

  return (
    <div className={styles.card} style={{ '--budget-color': budget.color }}>
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{budget.name}</div>
          <div className={styles.period}>{periodLabel}</div>
        </div>
        <div className={styles.badges}>
          {budget.category && (
            <Badge color={budget.category.color}>{budget.category.name}</Badge>
          )}
          {budget.status !== BUDGET_STATUS.NORMAL && (
            <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
          )}
        </div>
      </div>

      <ProgressBar
        percent={budget.percent}
        color={isExceeded ? undefined : budget.color}
        leftLabel={`${budget.percent}% usado`}
        rightLabel={progressRightLabel}
      />

      <div className={styles.amounts}>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Límite</span>
          <span className={styles.amountValue}>{formatCurrency(budget.amount)}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Gastado</span>
          <span className={`${styles.amountValue} ${spentClass}`}>
            {formatCurrency(budget.spent)}
          </span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Restante</span>
          <span className={`${styles.amountValue} ${isExceeded ? styles.over : ''}`}>
            {isExceeded ? `-${formatCurrency(budget.overBy)}` : formatCurrency(budget.remaining)}
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
