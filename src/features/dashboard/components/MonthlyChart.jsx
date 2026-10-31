import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { formatCurrencyCompact } from '@/lib/formatters'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS, CURSOR } from '@/components/common/ChartTooltip/ChartTooltip'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { IconChartBar } from '@tabler/icons-react'
import styles from './MonthlyChart.module.css'

const SERIES = [
  { key: 'income',  name: 'Ingresos', color: 'var(--color-income)' },
  { key: 'expense', name: 'Gastos',   color: 'var(--color-expense)' },
]

export function MonthlyChart({ data }) {
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
    <div>
      <div className={styles.wrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        {SERIES.map((s) => (
          <div key={s.key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}
