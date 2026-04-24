import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/constants'
import styles from './PredictionChart.module.css'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const isProjected = payload[0]?.payload?.projected
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid ${isProjected ? 'var(--color-primary)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 'var(--text-sm)',
      boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6 }}>
        {label} {isProjected && <span style={{ color: 'var(--color-primary)', fontSize: 11 }}>(Proyectado)</span>}
      </p>
      {payload.map((p) => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color ?? 'inherit', marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

export function PredictionChart({ data }) {
  if (!data.length) return null

  const lastHistoricalIdx = data.filter((d) => !d.projected).length - 1

  return (
    <div>
      <div className={styles.wrap}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={4} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Línea divisoria entre histórico y proyección */}
            {lastHistoricalIdx >= 0 && (
              <ReferenceLine
                x={data[lastHistoricalIdx]?.label}
                stroke="var(--color-primary)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Hoy', position: 'insideTopRight', fontSize: 10, fill: 'var(--color-primary)' }}
              />
            )}

            <Bar dataKey="income" name="Ingresos" radius={[3,3,0,0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.projected ? CHART_COLORS.income + '60' : CHART_COLORS.income}
                />
              ))}
            </Bar>

            <Bar dataKey="expense" name="Gastos" radius={[3,3,0,0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.projected ? CHART_COLORS.expense + '60' : CHART_COLORS.expense}
                />
              ))}
            </Bar>

            {/* Media móvil de gastos como línea de tendencia */}
            <Line
              dataKey="expenseMA"
              name="Tendencia gastos"
              stroke={CHART_COLORS.expense}
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
          { type: 'bar',  color: CHART_COLORS.income,  label: 'Ingresos (real)' },
          { type: 'bar',  color: CHART_COLORS.income + '60', label: 'Ingresos (proyectado)' },
          { type: 'bar',  color: CHART_COLORS.expense, label: 'Gastos (real)' },
          { type: 'bar',  color: CHART_COLORS.expense + '60', label: 'Gastos (proyectado)' },
          { type: 'dash', color: CHART_COLORS.expense, label: 'Tendencia gastos (MA3)' },
        ].map((l) => (
          <div key={l.label} className={styles.legendItem}>
            {l.type === 'bar'
              ? <span className={styles.legendDot} style={{ background: l.color }} />
              : <span className={styles.legendDash} style={{ borderColor: l.color }} />
            }
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}
