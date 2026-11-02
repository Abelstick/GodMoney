import { Money } from '@/components/ui/Money/Money'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { formatDate, toInputDate } from '@/lib/formatters'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import styles from './SavingsDebtPreview.module.css'

// Lo que le debes a tu ahorro + cuánto sacaste y repusiste en el mes elegido.
// flow: savingsFlow() del mes → { withdrawn, repaid }
export function SavingsDebtPreview({ debts, flow = { withdrawn: 0, repaid: 0 }, monthLabel }) {
  const open = debts.filter((d) => d.status === 'OPEN')
  const total   = open.reduce((acc, d) => acc + Number(d.amount), 0)
  const repaid  = open.reduce((acc, d) => acc + Math.min(Number(d.repaid_amount), Number(d.amount)), 0)
  const pending = open.reduce((acc, d) => acc + pendingAmount(d), 0)
  const today   = toInputDate(new Date())
  const next    = open
    .filter((d) => d.target_date)
    .sort((a, b) => a.target_date.localeCompare(b.target_date))[0]
  const overdue = next && next.target_date < today

  return (
    <div className={styles.wrap}>
      {pending > 0 ? (
        <>
          <div className={styles.amount}>
            <Money value={pending} tone="warning" size="lg" />
            <span className={styles.caption}>por reponer</span>
          </div>
          <ProgressBar
            percent={total > 0 ? (repaid / total) * 100 : 0}
            size="sm"
            leftLabel={<>Repuesto <Money value={repaid} /></>}
            rightLabel={total > 0 ? `${Math.round((repaid / total) * 100)}%` : undefined}
          />
        </>
      ) : (
        <p className={styles.caption}>No le debes nada a tu ahorro.</p>
      )}

      {(flow.withdrawn > 0 || flow.repaid > 0) && (
        <div className={styles.month}>
          <span className={styles.monthTitle}>En {monthLabel}</span>
          <div className={styles.monthRow}>
            <span>Sacaste del ahorro</span>
            <Money value={flow.withdrawn} tone="expense" />
          </div>
          <div className={styles.monthRow}>
            <span>Repusiste</span>
            <Money value={flow.repaid} tone="income" />
          </div>
        </div>
      )}

      {next && (
        <p className={overdue ? styles.overdue : styles.caption}>
          {overdue ? 'Venció el' : 'Próxima meta:'} {formatDate(next.target_date)}
        </p>
      )}
    </div>
  )
}
