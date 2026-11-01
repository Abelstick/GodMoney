import { Link } from 'react-router-dom'
import { Anchor, Progress } from '@mantine/core'
import { Money } from '@/components/ui/Money/Money'
import { Trend } from '@/components/ui/Trend/Trend'
import { StatusBadge } from '@/components/ui/StatusBadge/StatusBadge'
import styles from './MonthSummary.module.css'

// El mes en una sola pieza: lo gastado manda (es lo que más se consulta) con
// su presupuesto; ingresos, ahorro y resultado quedan como lectura secundaria.
export function MonthSummary({
  monthLabel, trendLabel,
  consumptionTotal, expenseTrendPct, budgetOverview,
  totalIncome, incomeTrendPct,
  savingsTotal, savingsRate,
  profit,
}) {
  return (
    <section className={styles.panel} aria-labelledby="month-title">
      <h2 id="month-title" className={styles.title}>Este periodo · <span className={styles.month}>{monthLabel}</span></h2>

      <div className={styles.primary}>
        <div className={styles.primaryHead}>
          <span className={styles.metricLabel}>Gastado</span>
          <Trend pct={expenseTrendPct} label={trendLabel} invert />
        </div>
        <Money value={consumptionTotal} size="lg" className={styles.primaryAmount} />

        {budgetOverview ? (
          <div className={styles.budget}>
            <Progress
              value={Math.min(budgetOverview.percent, 100)}
              color={budgetOverview.progress}
              size="sm"
              aria-label={`${budgetOverview.percent}% del presupuesto usado`}
            />
            <div className={styles.budgetRow}>
              <span className={styles.meta}>
                <Money value={budgetOverview.spent} /> de <Money value={budgetOverview.limit} /> presupuestado
              </span>
              <StatusBadge tone={budgetOverview.tone} size="sm">{budgetOverview.label}</StatusBadge>
            </div>
          </div>
        ) : (
          <p className={styles.meta}>
            Sin presupuesto mensual · <Anchor component={Link} to="/presupuestos" size="xs" fw={600}>Crear uno</Anchor>
          </p>
        )}
      </div>

      <dl className={styles.secondary}>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>Ingresos</dt>
          <dd>
            <Money value={totalIncome} className={styles.metricAmount} />
            <Trend pct={incomeTrendPct} />
          </dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>Ahorro real</dt>
          <dd>
            <Money value={savingsTotal} tone={savingsTotal > 0 ? 'savings' : 'neutral'} className={styles.metricAmount} />
            <span className={styles.meta}>
              {savingsRate !== null && savingsTotal > 0 ? `${savingsRate}% de tus ingresos` : 'Sin aportes aún'}
            </span>
          </dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>Resultado</dt>
          <dd>
            <Money value={profit} tone="auto" signed className={styles.metricAmount} />
            <span className={styles.meta}>Ingresos − gastos y ahorro</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
