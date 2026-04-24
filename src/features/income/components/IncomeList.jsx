import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { Button }     from '@/components/ui/Button/Button'
import styles from './IncomeList.module.css'

export function IncomeList({ incomes, onEdit, onDelete }) {
  if (!incomes.length) {
    return (
      <EmptyState
        icon="💰"
        title="Sin ingresos este mes"
        description="Registra tu primer ingreso del mes"
      />
    )
  }

  return (
    <div className={styles.list}>
      {incomes.map((income) => (
        <div key={income.id} className={styles.item}>
          <div
            className={styles.iconWrap}
            style={{ background: (income.category?.color ?? '#10b981') + '20' }}
          >
            💰
          </div>
          <div className={styles.info}>
            <div className={styles.description}>
              {income.description || income.category?.name || 'Sin descripción'}
            </div>
            <div className={styles.meta}>
              <span>{formatDate(income.date)}</span>
              {income.category && (
                <Badge color={income.category.color}>{income.category.name}</Badge>
              )}
              {income.is_recurring && (
                <Badge color="var(--color-info)">Recurrente</Badge>
              )}
            </div>
          </div>
          <div className={styles.right}>
            <span className={styles.amount}>+{formatCurrency(income.amount)}</span>
            <div className={styles.actions}>
              <button className={styles.actionBtn} onClick={() => onEdit(income)}>✏️</button>
              <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(income.id)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
