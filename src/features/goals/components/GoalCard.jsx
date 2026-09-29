import { useState } from 'react'
import { IconBulb, IconChevronDown, IconX } from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Badge }       from '@/components/ui/Badge/Badge'
import { Button }      from '@/components/ui/Button/Button'
import { GOAL_STATUSES } from '@/lib/constants'
import { LOAN_TYPE } from '@/lib/loanStatus'
import { GoalAccountLinks } from './GoalAccountLinks'
import styles from './GoalCard.module.css'

export function GoalCard({ goal, onEdit, onDelete, onAddProgress, accounts, goalAccountLinks, onLinkAccount, onUnlinkAccount }) {
  const [addingProgress, setAddingProgress] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [managingAccounts, setManagingAccounts] = useState(false)
  const [showLoanDetail, setShowLoanDetail] = useState(false)

  const currentAmount = goal.progressAmount ?? goal.current_amount
  const potentialAmount = goal.potentialAmount ?? currentAmount
  const pct    = Math.min(Math.round((currentAmount / goal.target_amount) * 100), 100)
  const status = GOAL_STATUSES[goal.status] ?? GOAL_STATUSES.active
  const isLinked = goal.isAccountLinked
  const pendingLoans = goal.pendingLoans ?? []
  const hasPotential = isLinked && (potentialAmount > currentAmount + 0.005 || pendingLoans.length > 0)

  // Si lo que te deben supera lo que sube el potencial, es porque algún
  // vínculo de monto fijo pone tope: se avisa para que no parezca un error.
  const lentTotal = pendingLoans
    .filter((l) => l.type === LOAN_TYPE.LENT)
    .reduce((sum, l) => sum + Number(l.remaining_principal) + Number(l.remaining_interest), 0)
  const cappedByFixed = goal.hasFixedLinks && lentTotal > potentialAmount - currentAmount + 0.005

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
          <button className={styles.potentialHeader} onClick={() => setShowLoanDetail((v) => !v)}>
            <IconBulb size={15} stroke={1.75} className={styles.potentialIcon} />
            <span>
              Potencial si se liquidan los préstamos: <strong>{formatCurrency(potentialAmount)}</strong>
            </span>
            <IconChevronDown
              size={14} stroke={1.75}
              className={`${styles.chevron} ${showLoanDetail ? styles.chevronOpen : ''}`}
            />
          </button>

          {showLoanDetail && (
            <div className={styles.loanDetail}>
              {pendingLoans.map((l) => {
                const remaining = Number(l.remaining_principal) + Number(l.remaining_interest)
                const isLent = l.type === LOAN_TYPE.LENT
                return (
                  <div key={l.id} className={styles.loanRow}>
                    <span>{isLent ? 'Te debe' : 'Debes a'} {l.person_name} · {l.account?.name ?? '—'}</span>
                    <span className={isLent ? styles.loanPlus : styles.loanMinus}>
                      {isLent ? '+' : '−'}{formatCurrency(remaining)}
                    </span>
                  </div>
                )
              })}
              {cappedByFixed && (
                <p className={styles.loanNote}>
                  Parte de lo que te deben no suma porque una cuenta está vinculada con monto fijo.
                  Cámbiala a "Toda la cuenta" en Cuentas → Editar para que cuente completo.
                </p>
              )}
            </div>
          )}
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
          <Button size="sm" variant="ghost" onClick={() => setAddingProgress(false)}>
            <IconX size={15} stroke={1.75} />
          </Button>
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
