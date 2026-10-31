import { getDaysInMonth } from 'date-fns'
import { ActionIcon, Badge, Menu, Progress } from '@mantine/core'
import { IconAlertTriangle, IconTrendingUp, IconDots, IconPencil, IconTrash } from '@tabler/icons-react'
import { BUDGET_STATUS, BUDGET_STATUS_TONE } from '@/lib/budgetStatus'
import { Money }       from '@/components/ui/Money/Money'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
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
  const statusUi = BUDGET_STATUS_TONE[budget.status] ?? BUDGET_STATUS_TONE[BUDGET_STATUS.NORMAL]

  const projected = isCurrentMonth ? getMonthProjection(budget) : null
  const projectedOver = projected !== null && projected > budget.amount

  return (
    <article
      className={`${styles.card} ${styles[statusUi.tone] ?? ''}`}
      style={{ '--budget-color': budget.color }}
    >
      <div className={styles.top}>
        <div className={styles.heading}>
          <h3 className={styles.name}>
            <span className={styles.dot} aria-hidden="true" />
            {budget.name}
          </h3>
          <span className={styles.period}>{periodLabel}</span>
        </div>
        <StatusBadge tone={statusUi.tone} size="sm">{statusUi.label}</StatusBadge>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Más acciones para ${budget.name}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(budget)}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconTrash size={16} />} color="expense" onClick={() => onDelete(budget.id)}>Eliminar</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* ── Cifra principal: cuánto queda (o cuánto se pasó) ── */}
      <div className={styles.main}>
        {isExceeded ? (
          <>
            <Money value={-budget.overBy} tone="expense" className={styles.mainValue} />
            <span className={styles.mainLabel}>por encima del límite</span>
          </>
        ) : (
          <>
            <Money value={budget.remaining} className={styles.mainValue} />
            <span className={styles.mainLabel}>disponibles</span>
          </>
        )}
      </div>

      <div className={styles.progress}>
        <Progress
          value={Math.min(budget.percent, 100)}
          color={statusUi.progress}
          size="md"
          aria-label={`${budget.percent}% del presupuesto usado`}
        />
        <div className={styles.progressInfo}>
          <span>
            Gastado <Money value={budget.spent} className={isExceeded ? styles.over : undefined} /> de <Money value={budget.amount} />
          </span>
          <span className={styles.pct}>{budget.percent}%</span>
        </div>
      </div>

      {budget.categories?.length > 0 && (
        <div className={styles.categories}>
          {budget.categories.map((c) => (
            <Badge
              key={c.id}
              size="sm"
              variant="dot"
              color="gray"
              styles={{ root: { '--badge-dot-color': c.color } }}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      )}

      {projected !== null && (
        <div className={`${styles.prediction} ${projectedOver ? styles.predictionOver : styles.predictionOk}`}>
          <span className={styles.predictionIcon} aria-hidden="true">
            {projectedOver ? <IconAlertTriangle size={15} stroke={1.75} /> : <IconTrendingUp size={15} stroke={1.75} />}
          </span>
          <span className={styles.predictionText}>
            A este ritmo cerrarías el mes en{' '}
            <strong><Money value={projected} /></strong>
            {projectedOver
              ? <> · te pasarías por <strong><Money value={projected - budget.amount} /></strong></>
              : ' · dentro del límite'}
          </span>
        </div>
      )}
    </article>
  )
}
