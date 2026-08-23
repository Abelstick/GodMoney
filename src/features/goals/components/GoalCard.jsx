import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Badge }       from '@/components/ui/Badge/Badge'
import { Button }      from '@/components/ui/Button/Button'
import { GOAL_STATUSES } from '@/lib/constants'
import { GoalAccountLinks } from './GoalAccountLinks'
import styles from './GoalCard.module.css'

export function GoalCard({ goal, onEdit, onDelete, onAddProgress, accounts, goalAccountLinks, onLinkAccount, onUnlinkAccount }) {
  const [addingProgress, setAddingProgress] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [managingAccounts, setManagingAccounts] = useState(false)

  const currentAmount = goal.progressAmount ?? goal.current_amount
  const potentialAmount = goal.potentialAmount ?? currentAmount
  const pct    = Math.min(Math.round((currentAmount / goal.target_amount) * 100), 100)
  const status = GOAL_STATUSES[goal.status] ?? GOAL_STATUSES.active
  const isLinked = goal.isAccountLinked
  const hasPotential = isLinked && potentialAmount > currentAmount + 0.005

  async function handleProgress() {
    const amount = Number(manualAmount)
    if (!amount || amount <= 0) return
    await onAddProgress(goal.id, amount)
    setManualAmount('')
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
        rightLabel={formatCurrency(goal.target_amount - currentAmount) + ' restante'}
        size="thick"
      />

      <div className={styles.amounts}>
        <span>
          <span className={styles.current}>{formatCurrency(currentAmount)}</span>
          <span> de {formatCurrency(goal.target_amount)}</span>
        </span>
        {isLinked && <span className={styles.linkedTag}>vinculado a cuentas</span>}
      </div>

      {hasPotential && (
        <div className={styles.potential}>
          💡 Potencial si se liquidan los préstamos: <strong>{formatCurrency(potentialAmount)}</strong>
        </div>
      )}

      {addingProgress && (
        <div className={styles.progressInput}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto a añadir"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            autoFocus
          />
          <Button size="sm" onClick={handleProgress}>Añadir</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingProgress(false)}>✕</Button>
        </div>
      )}

      {managingAccounts && (
        <GoalAccountLinks
          goal={goal}
          accounts={accounts}
          allLinks={goalAccountLinks}
          onLink={onLinkAccount}
          onUnlink={onUnlinkAccount}
        />
      )}

      {!addingProgress && !managingAccounts && (
        <div className={styles.actions}>
          {!isLinked && goal.status !== 'completed' && (
            <Button size="sm" variant="success" onClick={() => setAddingProgress(true)}>
              + Añadir
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setManagingAccounts(true)}>
            {isLinked ? 'Cuentas' : 'Vincular cuenta'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(goal)}>Editar</Button>
          <Button size="sm" variant="danger"    onClick={() => onDelete(goal.id)}>Eliminar</Button>
        </div>
      )}

      {managingAccounts && (
        <Button size="sm" variant="ghost" onClick={() => setManagingAccounts(false)}>Cerrar</Button>
      )}
    </div>
  )
}
