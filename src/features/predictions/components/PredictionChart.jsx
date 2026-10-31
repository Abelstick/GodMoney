import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { formatCurrencyCompact } from '@/lib/formatters'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS, CURSOR } from '@/components/common/ChartTooltip/ChartTooltip'
import styles from './PredictionChart.module.css'

const projectedBadge = (payload) => (payload[0]?.payload?.projected ? 'Proyectado' : null)

export function PredictionChart({ data }) {
  if (!data.length) return null

  const lastHistoricalIdx = data.filter((d) => !d.projected).length - 1

  return (
    <div>
      <div className={styles.wrap}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={4} barSize={14} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} tickFormatter={formatCurrencyCompact} width={64} tickCount={4} />
            <Tooltip content={<ChartTooltip getBadge={projectedBadge} />} cursor={CURSOR} />

            {/* Línea divisoria entre histórico y proyección */}
            {lastHistoricalIdx >= 0 && (
              <ReferenceLine
                x={data[lastHistoricalIdx]?.label}
                stroke="var(--color-primary)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Hoy', position: 'insideTopRight', fontSize: 12, fill: 'var(--color-primary)' }}
              />
            )}

            <Bar dataKey="income" name="Ingresos" radius={[3,3,0,0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill="var(--color-income)"
                  fillOpacity={entry.projected ? 0.45 : 1}
                />
              ))}
            </Bar>

            <Bar dataKey="expense" name="Gastos" radius={[3,3,0,0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill="var(--color-expense)"
                  fillOpacity={entry.projected ? 0.45 : 1}
                />
              ))}
            </Bar>

            {/* Media móvil de gastos como línea de tendencia */}
            <Line
              dataKey="expenseMA"
              name="Tendencia gastos"
              stroke="var(--color-expense)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.legend}>
        {[
          { type: 'bar',  color: 'var(--color-income)', opacity: 1,    label: 'Ingresos (real)' },
          { type: 'bar',  color: 'var(--color-income)', opacity: 0.45, label: 'Ingresos (proyectado)' },
          { type: 'bar',  color: 'var(--color-expense)',  opacity: 1,    label: 'Gastos (real)' },
          { type: 'bar',  color: 'var(--color-expense)',  opacity: 0.45, label: 'Gastos (proyectado)' },
          { type: 'dash', color: 'var(--color-expense)',  opacity: 1,    label: 'Tendencia gastos (MA3)' },
        ].map((l) => (
          <div key={l.label} className={styles.legendItem}>
            {l.type === 'bar'
              ? <span className={styles.legendDot} style={{ background: l.color, opacity: l.opacity }} />
              : <span className={styles.legendDash} style={{ borderColor: l.color }} />
            }
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}
