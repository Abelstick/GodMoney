import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import {
  getEffectiveLoanStatus, getLoanProgress, LOAN_STATUS_META, LOAN_TYPE,
} from '@/lib/loanStatus'
import styles from './LoanCard.module.css'

export function LoanCard({ loan, nextInstallment, onOpenDetail, onRegisterPayment }) {
  const status = getEffectiveLoanStatus(loan)
  const statusMeta = LOAN_STATUS_META[status]
  const progress = getLoanProgress(loan)
  const pending = Number(loan.remaining_principal) + Number(loan.remaining_interest)
  const canPay = status !== 'PAID' && status !== 'CANCELLED'

  return (
    <div className={styles.card} onClick={() => onOpenDetail(loan)}>
      <div className={styles.top}>
        <div className={styles.person}>
          <span className={styles.avatar}>{loan.person_name.slice(0, 1).toUpperCase()}</span>
          <div>
            <div className={styles.name}>{loan.person_name}</div>
            {loan.description && <div className={styles.description}>{loan.description}</div>}
          </div>
        </div>
        <Badge color={statusMeta.color} withDot>{statusMeta.label}</Badge>
      </div>

      <div className={styles.amounts}>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Monto original</span>
          <span className={styles.amountValue}>{formatCurrency(loan.principal_amount)}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Saldo pendiente</span>
          <span className={`${styles.amountValue} ${styles.emphasis}`}>{formatCurrency(pending)}</span>
        </div>
        <div className={styles.amountItem}>
          <span className={styles.amountLabel}>Próxima cuota</span>
          <span className={styles.amountValue}>
            {nextInstallment
              ? `${formatCurrency(nextInstallment.total_amount - nextInstallment.paid_amount)} · ${formatDate(nextInstallment.due_date)}`
              : '—'}
          </span>
        </div>
      </div>

      <ProgressBar
        percent={progress}
        color={loan.type === LOAN_TYPE.LENT ? 'var(--color-success)' : undefined}
        leftLabel={`${progress}% ${loan.type === LOAN_TYPE.LENT ? 'cobrado' : 'pagado'}`}
        rightLabel={formatDate(loan.due_date)}
      />

      {canPay && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => onRegisterPayment(loan)}>Registrar pago</Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenDetail(loan)}>Ver detalle</Button>
        </div>
      )}
    </div>
  )
}
