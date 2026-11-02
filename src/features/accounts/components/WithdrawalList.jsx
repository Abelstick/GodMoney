import { IconTrash } from '@tabler/icons-react'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import styles from './WithdrawalList.module.css'

const STATUS = {
  OPEN:     { label: 'Pendiente',  color: 'var(--color-warning)' },
  REPAID:   { label: 'Repuesto',   color: 'var(--color-success)' },
  FORGIVEN: { label: 'No repuesto', color: 'var(--color-text-muted)' },
}

function title(w) {
  if (w.reason) return w.reason
  if (w.origin === 'DEFICIT') return `Déficit ${w.period_label ?? ''}`.trim()
  if (w.origin === 'MANUAL') return 'Retiro anterior'
  return 'Retiro del ahorro'
}

const today = () => toInputDate(new Date())

export function WithdrawalList({ withdrawals, onRepay, onForgive, onReopen, onDelete }) {
  return (
    <ul className={styles.list}>
      {withdrawals.map((w) => {
        const amount  = Number(w.amount)
        const repaid  = Number(w.repaid_amount)
        const pending = pendingAmount(w)
        const status  = STATUS[w.status]
        const overdue = w.status === 'OPEN' && w.target_date && w.target_date < today()
        return (
          <li key={w.id} className={`${styles.item} ${w.status !== 'OPEN' ? styles.closed : ''}`}>
            <div className={styles.head}>
              <div className={styles.info}>
                <div className={styles.title}>{title(w)}</div>
                <div className={styles.meta}>
                  {w.savings_account?.name ?? 'Cuenta eliminada'}
                  {w.target_date && (
                    <span className={overdue ? styles.overdue : undefined}>
                      {' · '}{overdue ? 'Venció el' : 'Reponer antes del'} {formatDate(w.target_date)}
                    </span>
                  )}
                </div>
              </div>
              <Badge color={status.color}>{status.label}</Badge>
            </div>

            <ProgressBar
              percent={amount > 0 ? (repaid / amount) * 100 : 0}
              color={w.status === 'REPAID' ? 'income' : undefined}
              size="sm"
              leftLabel={`Repuesto ${formatCurrency(repaid)} de ${formatCurrency(amount)}`}
              rightLabel={pending > 0 ? `Falta ${formatCurrency(pending)}` : undefined}
            />

            <div className={styles.actions}>
              {w.status === 'OPEN' && (
                <>
                  <Button size="sm" variant="success" onClick={() => onRepay(w)}>Reponer</Button>
                  <Button size="sm" variant="ghost" onClick={() => onForgive(w)}>Ya no lo repongo</Button>
                </>
              )}
              {w.status === 'FORGIVEN' && (
                <Button size="sm" variant="ghost" onClick={() => onReopen(w)}>Reabrir</Button>
              )}
              <button className={styles.delete} onClick={() => onDelete(w)} aria-label="Eliminar deuda">
                <IconTrash size={15} stroke={1.75} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
