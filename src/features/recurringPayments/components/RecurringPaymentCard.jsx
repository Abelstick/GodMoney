import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { currentPeriodDueDate } from '@/lib/recurringPaymentSchedule'
import { getEffectiveRecurringStatus, RECURRING_STATUS, RECURRING_STATUS_META } from '@/lib/recurringPaymentStatus'
import styles from './RecurringPaymentCard.module.css'

export function RecurringPaymentCard({ payment, ledger, onOpenDetail, onMarkPaid }) {
  const status = getEffectiveRecurringStatus(payment, ledger)
  const statusMeta = RECURRING_STATUS_META[status]
  const dueDate = currentPeriodDueDate(payment)
  const canPay = status !== RECURRING_STATUS.PAUSED && status !== RECURRING_STATUS.UP_TO_DATE

  return (
    <div className={styles.card} onClick={() => onOpenDetail(payment)}>
      <div className={styles.top}>
        <div className={styles.info}>
          <span className={styles.avatar}>{payment.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <div className={styles.name}>{payment.name}</div>
            {payment.description && <div className={styles.description}>{payment.description}</div>}
          </div>
        </div>
        <Badge color={statusMeta.color} withDot>{statusMeta.label}</Badge>
      </div>

      <div className={styles.amounts}>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Monto</span>
          <span className={styles.amountValue}>{payment.amount ? formatCurrency(payment.amount) : 'Variable'}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Vencimiento</span>
          <span className={`${styles.amountValue} ${styles.emphasis}`}>{formatDate(dueDate)}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Programación</span>
          <span className={styles.amountValue}>
            {payment.schedule_type === 'FIXED_DAY' ? `Día ${payment.due_day_of_month}` : 'Manual'}
          </span>
        </div>
      </div>

      {canPay && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => onMarkPaid(payment)}>Marcar pagado</Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenDetail(payment)}>Ver detalle</Button>
        </div>
      )}
    </div>
  )
}
