import { formatCurrency, formatDate } from '@/lib/formatters'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './RecentTransactions.module.css'

export function RecentTransactions({ incomes = [], expenses = [], limit = 8 }) {
  const all = [
    ...incomes.map((i)  => ({ ...i, _type: 'income' })),
    ...expenses.map((e) => ({ ...e, _type: 'expense' })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)

  if (!all.length) {
    return <EmptyState icon="📊" title="Sin movimientos" description="Registra un ingreso o gasto para empezar" />
  }

  return (
    <div className={styles.list}>
      {all.map((tx) => (
        <div key={`${tx._type}-${tx.id}`} className={styles.item}>
          <div
            className={styles.dot}
            style={{ background: (tx.category?.color ?? '#6366f1') + '20' }}
          >
            {tx._type === 'income' ? '💰' : '💸'}
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{tx.description || tx.category?.name || '—'}</div>
            <div className={styles.cat}>{formatDate(tx.date)}</div>
          </div>
          <div className={`${styles.amount} ${styles[tx._type]}`}>
            {tx._type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </div>
        </div>
      ))}
    </div>
  )
}
