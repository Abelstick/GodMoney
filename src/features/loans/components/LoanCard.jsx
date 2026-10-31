import { Progress } from '@mantine/core'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/Button/Button'
import { Money } from '@/components/ui/Money/Money'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
import {
  getEffectiveLoanStatus, getLoanDisplayStatus, getLoanProgress, LOAN_TYPE,
} from '@/lib/loanStatus'
import styles from './LoanCard.module.css'

export function LoanCard({ loan, nextInstallment, onOpenDetail, onRegisterPayment }) {
  const status = getEffectiveLoanStatus(loan)
  const display = getLoanDisplayStatus(loan, nextInstallment)
  const progress = getLoanProgress(loan)
  const pending = Number(loan.remaining_principal) + Number(loan.remaining_interest)
  const canPay = status !== 'PAID' && status !== 'CANCELLED'
  const isLent = loan.type === LOAN_TYPE.LENT
  const nextAmount = nextInstallment ? nextInstallment.total_amount - nextInstallment.paid_amount : null

  return (
    <article className={`${styles.card} ${styles[display.tone] ?? ''}`}>
      <div className={styles.top}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">{loan.person_name.slice(0, 1).toUpperCase()}</span>
          <div className={styles.personText}>
            <button type="button" className={styles.name} onClick={() => onOpenDetail(loan)}>{loan.person_name}</button>
            {loan.description && <div className={styles.description}>{loan.description}</div>}
          </div>
        </div>
        <StatusBadge tone={display.tone} size="sm">{display.label}</StatusBadge>
      </div>

      <div className={styles.pendingRow}>
        <span className={styles.pendingLabel}>{isLent ? 'Te debe' : 'Debes'}</span>
        <Money value={pending} tone={canPay ? (isLent ? 'income' : 'expense') : 'neutral'} className={styles.pendingValue} />
        <span className={styles.original}>de <Money value={loan.principal_amount} /></span>
      </div>

      {canPay && (
        <div className={styles.next}>
          <span className={styles.nextLabel}>Próxima cuota</span>
          <span className={`${styles.nextValue} ${styles['next-' + display.tone] ?? ''}`}>
            {nextInstallment
              ? <><Money value={nextAmount} /> · {formatDate(nextInstallment.due_date)}</>
              : <>Vence el {formatDate(loan.due_date)}</>}
          </span>
        </div>
      )}

      <div className={styles.progress}>
        <Progress
          value={progress}
          color={isLent ? 'income' : 'brand'}
          size="sm"
          aria-label={`${progress}% ${isLent ? 'cobrado' : 'pagado'}`}
        />
        <div className={styles.progressInfo}>
          <span>{progress}% {isLent ? 'cobrado' : 'pagado'}</span>
          <span>Fin: {formatDate(loan.due_date)}</span>
        </div>
      </div>

      {canPay && (
        <div className={styles.actions}>
          <Button size="sm" onClick={() => onRegisterPayment(loan)}>
            {isLent ? 'Registrar cobro' : 'Registrar pago'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenDetail(loan)}>Ver detalle</Button>
        </div>
      )}
    </article>
  )
}
