import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS, CURSOR } from '@/components/common/ChartTooltip/ChartTooltip'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import styles from './BudgetSummary.module.css'

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

function SummaryNote({ summary }) {
  const notes = []
  if (summary.otherPeriodCount > 0) {
    notes.push(`Los totales solo suman presupuestos mensuales; ${plural(summary.otherPeriodCount, 'presupuesto')} de otro período se ven abajo.`)
  }
  if (summary.hasSharedCategories) {
    notes.push('Hay categorías en más de un presupuesto: su gasto se cuenta una vez, pero sus límites se suman.')
  }
  return notes.length > 0 ? <p className={styles.note}>{notes.join(' ')}</p> : null
}

export function BudgetSummary({ budgets, summary }) {
  const chartData = budgets.map((b) => ({
    name: b.name.length > 14 ? b.name.slice(0, 14) + '…' : b.name,
    Límite: Number(b.amount),
    Gastado: Number(b.spent),
  }))

  return (
    <div className={styles.wrapper}>
      {summary && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Límite mensual</span>
              <span className={styles.statValue}>{formatCurrency(summary.limit)}</span>
              <span className={styles.statSub}>{plural(summary.monthlyCount, 'presupuesto')}</span>
            </div>

            <div className={styles.stat}>
              <span className={styles.statLabel}>Gastado</span>
              <span className={`${styles.statValue} ${styles.spent}`}>
                {formatCurrency(summary.spent)}
              </span>
              <span className={styles.statSub}>{summary.percent}% del límite</span>
            </div>

            <div className={styles.stat}>
              <span className={styles.statLabel}>{summary.net < 0 ? 'Por encima del límite' : 'Restante'}</span>
              <span className={`${styles.statValue} ${summary.net < 0 ? styles.spent : styles.remaining}`}>
                {formatCurrency(Math.abs(summary.net))}
              </span>
              {summary.exceededCount > 0 && (
                <span className={`${styles.statSub} ${styles.dangerText}`}>
                  {plural(summary.exceededCount, 'excedido')}
                </span>
              )}
            </div>
          </div>
          <SummaryNote summary={summary} />
        </>
      )}

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
