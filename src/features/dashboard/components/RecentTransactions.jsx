import { formatDate } from '@/lib/formatters'
import { Money } from '@/components/ui/Money/Money'
import { CATEGORY_ICON_COMPONENTS } from '@/lib/constants'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { IconCoin, IconReceipt2 } from '@tabler/icons-react'
import styles from './RecentTransactions.module.css'

function iconFor(tx) {
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[tx.category?.icon]
  if (CategoryIcon) return CategoryIcon
  return tx._type === 'income' ? IconCoin : IconReceipt2
}

export function RecentTransactions({ incomes = [], expenses = [], limit = 5, hasAnyHistory = true, activeMonthLabel }) {
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
          compact
          icon={<IconReceipt2 size={24} stroke={1.5} />}
          title="Sin movimientos este mes"
          description={activeMonthLabel ? `No registraste ingresos ni gastos en ${activeMonthLabel}` : 'No hay ingresos ni gastos registrados en este mes'}
        />
      )
      : (
        <EmptyState compact icon={<IconReceipt2 size={24} stroke={1.5} />} title="Aún no registras movimientos" description="Toca + para anotar tu primer gasto o ingreso." />
      )
  }

  return (
    <div className={styles.list}>
      {all.map((tx) => {
        const TxIcon = iconFor(tx)
        return (
        <div key={`${tx._type}-${tx.id}`} className={styles.item}>
          <div
            aria-hidden="true"
            className={styles.dot}
            style={{
              background: `color-mix(in srgb, ${tx.category?.color ?? 'var(--color-primary)'} 15%, transparent)`,
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
          <Money value={tx.amount} tone={tx._type} signed className={styles.amount} />
        </div>
        )
      })}
    </div>
  )
}
