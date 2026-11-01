import { useMemo } from 'react'
import { m } from 'framer-motion'
import { IconChartDonut } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { isSavingsExpense } from '@/lib/savings'
import styles from './SpendingBreakdown.module.css'

const TOP = 5

// Agrupa el gasto del periodo (sin ahorro, igual que "Gastado") por categoría.
function groupByCategory(expenses) {
  const groups = new Map()
  for (const e of expenses) {
    if (isSavingsExpense(e)) continue
    const key = e.category?.id ?? e.category_id ?? 'none'
    const g = groups.get(key) ?? {
      key,
      name: e.category?.name ?? 'Sin categoría',
      color: e.category?.color ?? 'var(--color-text-muted)',
      total: 0,
    }
    g.total += Number(e.amount)
    groups.set(key, g)
  }
  const sorted = [...groups.values()].sort((a, b) => b.total - a.total)
  if (sorted.length <= TOP + 1) return sorted
  const rest = sorted.slice(TOP)
  return [
    ...sorted.slice(0, TOP),
    { key: 'rest', name: `Otras ${rest.length}`, color: 'var(--color-surface-4)', total: rest.reduce((a, g) => a + g.total, 0) },
  ]
}

export function SpendingBreakdown({ expenses }) {
  const rows = useMemo(() => groupByCategory(expenses), [expenses])
  const total = rows.reduce((a, r) => a + r.total, 0)

  if (!rows.length || total <= 0) {
    return (
      <EmptyState
        compact
        icon={<IconChartDonut size={24} stroke={1.5} />}
        title="Sin gastos en este periodo"
        description="Cuando registres gastos verás aquí en qué categorías se va tu dinero."
      />
    )
  }

  const max = rows[0].total

  return (
    <ol className={styles.list}>
      {rows.map((r, i) => {
        const pct = Math.round((r.total / total) * 100)
        return (
          <li key={r.key} className={styles.row}>
            <div className={styles.head}>
              <span className={styles.dot} style={{ background: r.color }} aria-hidden="true" />
              <span className={styles.name}>{r.name}</span>
              <Money value={r.total} className={styles.amount} />
              <span className={styles.pct}>{pct}%</span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <m.span
                className={styles.bar}
                style={{ background: r.color }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.total / max }}
                transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
