import { useState, useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useExpenses }    from '@/hooks/useExpenses'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { Card }     from '@/components/ui/Card/Card'
import { Button }   from '@/components/ui/Button/Button'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Modal }    from '@/components/common/Modal/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import styles from './Expenses.module.css'

const RADIAN = Math.PI / 180

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function PieLegend({ data, total }) {
  return (
    <div className={styles.pieLegend}>
      {data.map((entry) => {
        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
        return (
          <div key={entry.name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: entry.color }} />
            <span className={styles.legendName}>{entry.name}</span>
            <span className={styles.legendPct}>{pct}%</span>
            <span className={styles.legendAmount}>{formatCurrency(entry.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

function PieTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDot} style={{ background: d.color }} />
      <span className={styles.tooltipName}>{d.name}</span>
      <span className={styles.tooltipAmount}>{formatCurrency(d.value)}</span>
    </div>
  )
}

export function Expenses() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])
  const { expenses, loading, totalExpense, addExpense, updateExpense, removeExpense } = useExpenses()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateExpense(editing.id, payload)
      else         await addExpense(payload)
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const pieData = useMemo(() => {
    const map = {}
    expenses.forEach((e) => {
      const key   = e.category?.name ?? 'Sin categoría'
      const color = e.category?.color ?? '#94a3b8'
      map[key] = { name: key, value: (map[key]?.value ?? 0) + Number(e.amount), color }
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [expenses])

  const fixedTotal = expenses.filter((e) => e.is_fixed).reduce((a, e) => a + Number(e.amount), 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gastos</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nuevo gasto</Button>
      </div>

      {/* Filtro de mes */}
      <div className={styles.monthFilter}>
        {months.map((m) => (
          <button
            key={m.key}
            className={`${styles.monthBtn} ${activeMonth === m.key ? styles.monthActive : ''}`}
            onClick={() => setActiveMonth(m.key)}
          >
            {m.label} {m.year}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.summary}>
        <StatCard label="Total gastos"  amount={formatCurrency(totalExpense)} icon="💸" iconBg="rgba(239,68,68,0.12)" />
        <StatCard label="Gastos fijos"  amount={formatCurrency(fixedTotal)}   icon="📌" iconBg="rgba(245,158,11,0.12)" />
        <StatCard label="Transacciones" amount={expenses.length}              icon="🔢" iconBg="rgba(99,102,241,0.12)" />
      </div>

      <div className={styles.catGrid}>
        {/* Gráfico de dona */}
        {pieData.length > 0 && (
          <Card padded>
            <Card.Header>Por categoría · {formatMonth(parseISO(`${activeMonth}-01`))}</Card.Header>
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    labelLine={false}
                    label={<PieLabel />}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Total en el centro (donut) */}
              <div className={styles.pieCenter}>
                <span className={styles.pieCenterLabel}>Total</span>
                <span className={styles.pieCenterAmount}>{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <PieLegend data={pieData} total={totalExpense} />
          </Card>
        )}

        {/* Lista con paginación */}
        {loading ? <LoadingSpinner /> : (
          <Card padded={false}>
            <div className={styles.listHeader}>
              <strong>Movimientos · {formatMonth(parseISO(`${activeMonth}-01`))}</strong>
              <span className={styles.listCount}>{expenses.length} registros</span>
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <ExpenseList
                expenses={expenses}
                onEdit={(e) => { setEditing(e); setModalOpen(true) }}
                onDelete={removeExpense}
              />
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      >
        <ExpenseForm
          initial={editing ? {
            amount:      String(editing.amount),
            description: editing.description ?? '',
            category_id: editing.category_id ?? '',
            date:        editing.date,
            is_fixed:    editing.is_fixed,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
