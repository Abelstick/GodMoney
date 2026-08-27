import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { formatDate } from '@/lib/formatters'
import { getCreditScoreCategory } from '@/lib/creditScoreStatus'
import styles from './CreditScoreChart.module.css'

function CategoryDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  const color = getCreditScoreCategory(payload.score).color
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--color-surface)" strokeWidth={1.5} />
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const score = payload[0].value
  const category = getCreditScoreCategory(score)
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{formatDate(label)}</p>
      <p className={styles.tooltipScore} style={{ color: category.color }}>{score}</p>
      <p className={styles.tooltipCategory} style={{ color: category.color }}>{category.label}</p>
    </div>
  )
}

export function CreditScoreChart({ data }) {
  if (data.length < 2) {
    return (
      <div className={styles.empty}>
        Registra al menos 2 lecturas para ver la evolución de tu score
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d)}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={['dataMin - 20', 'dataMax + 20']}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-strong)' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-text-muted)"
            strokeWidth={2}
            dot={<CategoryDot />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
