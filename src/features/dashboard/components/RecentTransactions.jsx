import { formatCurrency, formatDate } from '@/lib/formatters'
import { CATEGORY_ICON_COMPONENTS } from '@/lib/constants'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { IconCoin, IconReceipt2 } from '@tabler/icons-react'
import styles from './RecentTransactions.module.css'

function iconFor(tx) {
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[tx.category?.icon]
  if (CategoryIcon) return CategoryIcon
  return tx._type === 'income' ? IconCoin : IconReceipt2
}

export function RecentTransactions({ incomes = [], expenses = [], limit = 8, hasAnyHistory = true, activeMonthLabel }) {
  const all = [
    ...incomes.map((i)  => ({ ...i, _type: 'income' })),
    ...expenses.map((e) => ({ ...e, _type: 'expense' })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)

  if (!all.length) {
    return hasAnyHistory
      ? (
        <EmptyState
          icon={<IconReceipt2 size={44} stroke={1.5} />}
          title="Sin movimientos este mes"
          description={activeMonthLabel ? `No registraste ingresos ni gastos en ${activeMonthLabel}` : 'No hay ingresos ni gastos registrados en este mes'}
        />
      )
      : (
        <EmptyState icon={<IconReceipt2 size={44} stroke={1.5} />} title="Sin movimientos" description="Registra un ingreso o gasto para empezar" />
      )
  }

  return (
    <div className={styles.list}>
      {all.map((tx) => {
        const TxIcon = iconFor(tx)
        return (
        <div key={`${tx._type}-${tx.id}`} className={styles.item}>
          <div
            className={styles.dot}
            style={{
              background: (tx.category?.color ?? '#6366f1') + '26',
              color: tx.category?.color ?? 'var(--color-text-secondary)',
            }}
          >
            <TxIcon size={19} stroke={1.75} />
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{tx.description || tx.category?.name || '—'}</div>
            <div className={styles.cat}>
              {formatDate(tx.date)}
              {tx.category?.name && ` • ${tx.category.name}`}
            </div>
          </div>
          <div className={`${styles.amount} ${styles[tx._type]}`}>
            {tx._type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </div>
        </div>
        )
      })}
    </div>
  )
}
