import { formatCurrency } from '@/lib/formatters'
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
  const exceededCount = budgets.filter((b) => b.percent >= 100).length

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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(v) => `S/${v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Límite" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Gastado" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
