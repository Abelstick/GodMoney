import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { IconChartBar } from '@tabler/icons-react'
import styles from './MonthlyChart.module.css'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 'var(--text-sm)',
      boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={<IconChartBar size={44} stroke={1.5} />}
        title="Sin datos suficientes"
        description="Registra ingresos y gastos para ver tu evolución mensual"
      />
    )
  }

  return (
    <div>
      <div className={styles.wrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barSize={16}>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-2)', radius: 4 }} />
            <Bar dataKey="income"  name="Ingresos" fill="var(--color-success)" radius={[4,4,0,0]} />
            <Bar dataKey="expense" name="Gastos"   fill="var(--color-danger)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        {[
          { color: 'var(--color-success)', label: 'Ingresos' },
          { color: 'var(--color-danger)',  label: 'Gastos' },
        ].map((l) => (
          <div key={l.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}
