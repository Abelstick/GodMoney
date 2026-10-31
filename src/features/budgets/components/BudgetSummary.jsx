import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS, CURSOR } from '@/components/common/ChartTooltip/ChartTooltip'
import { BUDGET_STATUS } from '@/lib/budgetStatus'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import styles from './BudgetSummary.module.css'

export function BudgetSummary({ budgets }) {
  const totals = budgets.reduce(
    (acc, b) => ({
      limit: acc.limit + Number(b.amount),
      spent: acc.spent + Number(b.spent),
      remaining: acc.remaining + Number(b.remaining),
    }),
    { limit: 0, spent: 0, remaining: 0 }
  )

  const globalPercent =
    totals.limit > 0 ? Math.min(Math.round((totals.spent / totals.limit) * 100), 100) : 0
  const exceededCount = budgets.filter((b) => b.status === BUDGET_STATUS.EXCEEDED).length

  const chartData = budgets.map((b) => ({
    name: b.name.length > 14 ? b.name.slice(0, 14) + '…' : b.name,
    Límite: Number(b.amount),
    Gastado: Number(b.spent),
  }))

  return (
    <div className={styles.wrapper}>
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Límite</span>
          <span className={styles.statValue}>{formatCurrency(totals.limit)}</span>
          <span className={styles.statSub}>
            {budgets.length} presupuesto{budgets.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Gastado</span>
          <span className={`${styles.statValue} ${styles.spent}`}>
            {formatCurrency(totals.spent)}
          </span>
          <span className={styles.statSub}>{globalPercent}% del límite total</span>
        </div>

        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Restante</span>
          <span className={`${styles.statValue} ${styles.remaining}`}>
            {formatCurrency(totals.remaining)}
          </span>
          {exceededCount > 0 && (
            <span className={`${styles.statSub} ${styles.dangerText}`}>
              {exceededCount} excedido{exceededCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className={styles.chart}>
          <p className={styles.chartTitle}>Límite vs Gastado por presupuesto</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={formatCurrencyCompact} width={64} tickCount={4} />
              <Tooltip content={<ChartTooltip />} cursor={CURSOR} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Límite" fill="var(--color-text-muted)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Gastado" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
