import { useReducedMotion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS, CURSOR } from '@/components/common/ChartTooltip/ChartTooltip'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { IconChartBar } from '@tabler/icons-react'
import styles from './MonthlyChart.module.css'

const SERIES = [
  { key: 'income',  name: 'Ingresos', color: 'var(--color-income)' },
  { key: 'expense', name: 'Gastos',   color: 'var(--color-expense)' },
]

export function MonthlyChart({ data }) {
  const reduceMotion = useReducedMotion()

  if (!data.length) {
    return (
      <EmptyState
        compact
        icon={<IconChartBar size={24} stroke={1.5} />}
        title="Sin datos suficientes"
        description="Registra ingresos y gastos para ver tu evolución mensual"
      />
    )
  }

  return (
    <figure className={styles.figure}>
      <ul className={styles.legend} aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      {/* El gráfico es solo visual; la misma información va en la tabla oculta */}
      <div className={styles.wrap} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={3} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis
              {...AXIS_PROPS}
              tickFormatter={formatCurrencyCompact}
              width={64}
              tickCount={4}
            />
            <Tooltip content={<ChartTooltip />} cursor={CURSOR} />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[5, 5, 1, 1]}
                maxBarSize={16}
                isAnimationActive={!reduceMotion}
                animationDuration={700}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Ingresos y gastos por mes</caption>
        <thead>
          <tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key ?? d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatCurrency(d.income)}</td>
              <td>{formatCurrency(d.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
