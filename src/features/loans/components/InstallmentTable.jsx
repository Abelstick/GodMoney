import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/Badge/Badge'
import { getEffectiveInstallmentStatus, INSTALLMENT_STATUS_META } from '@/lib/loanStatus'
import styles from './InstallmentTable.module.css'

// Se usa tanto para la vista previa del cronograma al crear un préstamo
// (showStatus=false, sin datos de pago porque el préstamo no existe aún)
// como para el cronograma real de un préstamo existente (showStatus=true).
export function InstallmentTable({ installments, showStatus = false }) {
  if (!installments?.length) return null

  return (
    <div className={styles.wrapper}>
      {installments.map((inst) => {
        const status = showStatus ? getEffectiveInstallmentStatus(inst) : null
        const meta = status ? INSTALLMENT_STATUS_META[status] : null
        return (
          <div key={inst.id ?? inst.installment_number} className={styles.row}>
            <div className={styles.number}>#{inst.installment_number}</div>
            <div className={styles.due}>{formatDate(inst.due_date)}</div>
            <div className={styles.amounts}>
              <span className={styles.amountItem}>
                <span className={styles.amountLabel}>Capital</span>
                {formatCurrency(inst.principal_amount)}
              </span>
              <span className={styles.amountItem}>
                <span className={styles.amountLabel}>Interés</span>
                {formatCurrency(inst.interest_amount)}
              </span>
              <span className={styles.amountItem}>
                <span className={styles.amountLabel}>Total</span>
                <strong>{formatCurrency(inst.total_amount)}</strong>
              </span>
              {showStatus && (
                <span className={styles.amountItem}>
                  <span className={styles.amountLabel}>Pagado</span>
                  {formatCurrency(inst.paid_amount)}
                </span>
              )}
            </div>
            {meta && <Badge color={meta.color}>{meta.label}</Badge>}
          </div>
        )
      })}
    </div>
  )
}
