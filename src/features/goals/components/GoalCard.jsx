import { useState } from 'react'
import { ActionIcon, Menu, NumberInput, RingProgress } from '@mantine/core'
import {
  IconBulb, IconChevronDown, IconX, IconDots, IconPencil, IconTrash, IconCalendarEvent, IconTrendingUp,
} from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button }      from '@/components/ui/Button/Button'
import { Money }       from '@/components/ui/Money/Money'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
import { LOAN_TYPE } from '@/lib/loanStatus'
import { getGoalForecast } from '@/lib/goalForecast'
import { GoalAccountLinks } from './GoalAccountLinks'
import styles from './GoalCard.module.css'

// Estado visible: combina el estado guardado con si va a tiempo para su fecha.
function goalBadge(goal, forecast) {
  if (goal.status === 'completed' || forecast.done) return { tone: 'ok', label: 'Completado' }
  if (goal.status === 'paused') return { tone: 'neutral', label: 'Pausado' }
  if (forecast.targetPassed) return { tone: 'danger', label: 'Fecha vencida' }
  if (forecast.onTrack === false) return { tone: 'warning', label: 'Atrasado' }
  if (forecast.onTrack === true) return { tone: 'ok', label: 'A tiempo' }
  return { tone: 'info', label: 'En curso' }
}

const monthYear = (date) => format(date, "MMMM 'de' yyyy", { locale: es })

export function GoalCard({ goal, onEdit, onDelete, onAddProgress, accounts, goalAccountLinks, onLinkAccount, onUnlinkAccount }) {
  const [addingProgress, setAddingProgress] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [managingAccounts, setManagingAccounts] = useState(false)
  const [showLoanDetail, setShowLoanDetail] = useState(false)

  const forecast = getGoalForecast(goal)
  const { current: currentAmount, percent: pct, remaining } = forecast
  const potentialAmount = goal.potentialAmount ?? currentAmount
  const badge = goalBadge(goal, forecast)
  const isLinked = goal.isAccountLinked
  const isActive = goal.status === 'active'
  const pendingLoans = goal.pendingLoans ?? []
  const hasPotential = isLinked && (potentialAmount > currentAmount + 0.005 || pendingLoans.length > 0)
  const ringColor = goal.color || 'var(--color-savings)'

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
    <article
      className={`${styles.card} ${goal.status !== 'active' ? styles.inactive : ''}`}
      style={{ '--goal-color': ringColor }}
    >
      <div className={styles.top}>
        <RingProgress
          size={72}
          thickness={7}
          roundCaps
          sections={[{ value: pct, color: ringColor }]}
          label={<span className={styles.pct}>{pct}%</span>}
          aria-label={`${pct}% completado`}
        />
        <div className={styles.heading}>
          <h3 className={styles.name}>{goal.name}</h3>
          <StatusBadge tone={badge.tone} size="sm">{badge.label}</StatusBadge>
        </div>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Más acciones para ${goal.name}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(goal)}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconTrash size={16} />} color="expense" onClick={() => onDelete(goal.id)}>Eliminar</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      <div className={styles.amounts}>
        <div>
          <Money value={currentAmount} className={styles.current} />
          <span className={styles.of}> de <Money value={goal.target_amount} /></span>
        </div>
        {remaining > 0 && (
          <span className={styles.remaining}>Faltan <Money value={remaining} /></span>
        )}
      </div>

      {/* ── Proyección ── */}
      {isActive && !forecast.done && (
        <ul className={styles.forecast}>
          {forecast.estimatedDate && (
            <li>
              <IconTrendingUp size={16} stroke={1.75} aria-hidden="true" />
              <span>A tu ritmo lo lograrías en <strong>{monthYear(forecast.estimatedDate)}</strong></span>
            </li>
          )}
          {forecast.monthlyNeeded !== null && (
            <li>
              <IconCalendarEvent size={16} stroke={1.75} aria-hidden="true" />
              <span>
                Ahorra <strong><Money value={forecast.monthlyNeeded} />/mes</strong> para llegar al {formatDate(goal.target_date)}
              </span>
            </li>
          )}
          {forecast.targetPassed && (
            <li className={styles.forecastDanger}>
              <IconCalendarEvent size={16} stroke={1.75} aria-hidden="true" />
              <span>La fecha límite era el {formatDate(goal.target_date)}. Edítala para recalcular.</span>
            </li>
          )}
          {!forecast.estimatedDate && forecast.monthlyNeeded === null && !forecast.targetPassed && (
            <li>
              <IconCalendarEvent size={16} stroke={1.75} aria-hidden="true" />
              <span>Ponle fecha límite o registra aportes para estimar cuándo lo lograrás.</span>
            </li>
          )}
        </ul>
      )}

      {hasPotential && (
        <div className={styles.potential}>
          <button className={styles.potentialHeader} onClick={() => setShowLoanDetail((v) => !v)} aria-expanded={showLoanDetail}>
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
                const amount = Number(l.remaining_principal) + Number(l.remaining_interest)
                const isLent = l.type === LOAN_TYPE.LENT
                return (
                  <div key={l.id} className={styles.loanRow}>
                    <span>{isLent ? 'Te debe' : 'Debes a'} {l.person_name} · {l.account?.name ?? '—'}</span>
                    <Money value={amount} tone={isLent ? 'income' : 'expense'} signed className={styles.loanAmount} />
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
          <NumberInput
            aria-label="Monto a añadir"
            placeholder="Monto a añadir"
            leftSection="S/"
            value={manualAmount}
            onChange={setManualAmount}
            allowNegative={false}
            min={0}
            autoFocus
            className={styles.progressField}
            onKeyDown={(e) => e.key === 'Enter' && handleProgress()}
          />
          <Button size="sm" onClick={handleProgress}>Añadir</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingProgress(false)} aria-label="Cancelar">
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
            <Button size="sm" onClick={() => setAddingProgress(true)}>
              + Añadir aporte
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setManagingAccounts(true)}>
            {isLinked ? 'Cuentas vinculadas' : 'Vincular cuenta'}
          </Button>
        </div>
      )}

      {managingAccounts && (
        <Button size="sm" variant="ghost" onClick={() => setManagingAccounts(false)}>Cerrar</Button>
      )}
    </article>
  )
}
