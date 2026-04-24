import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './ExpenseList.module.css'

export function ExpenseList({ expenses, onEdit, onDelete }) {
  if (!expenses.length) {
    return (
      <EmptyState
        icon="💸"
        title="Sin gastos este mes"
        description="Registra tu primer gasto del mes"
      />
    )
  }

  return (
    <div className={styles.list}>
      {expenses.map((expense) => (
        <div key={expense.id} className={styles.item}>
          <div
            className={styles.iconWrap}
            style={{ background: (expense.category?.color ?? '#ef4444') + '20' }}
          >
            💸
          </div>
          <div className={styles.info}>
            <div className={styles.description}>
              {expense.description || expense.category?.name || 'Sin descripción'}
            </div>
            <div className={styles.meta}>
              <span>{formatDate(expense.date)}</span>
              {expense.category && <Badge color={expense.category.color}>{expense.category.name}</Badge>}
              {expense.is_fixed && <Badge color="var(--color-warning)">Fijo</Badge>}
            </div>
          </div>
          <div className={styles.right}>
            <span className={styles.amount}>-{formatCurrency(expense.amount)}</span>
            <div className={styles.actions}>
              <button className={styles.actionBtn} onClick={() => onEdit(expense)}>✏️</button>
              <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(expense.id)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
