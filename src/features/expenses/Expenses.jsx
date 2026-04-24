import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts'
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

  // Datos para el gráfico de dona
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
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMonth(m.key)}
            style={{
              flexShrink: 0, padding: '6px 16px', borderRadius: 999,
              border: `1.5px solid ${activeMonth === m.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: activeMonth === m.key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeMonth === m.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
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
          <Card>
            <Card.Header>Por categoría</Card.Header>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Lista */}
        {loading ? <LoadingSpinner /> : (
          <Card padded={false}>
            <div style={{ padding: '20px 20px 8px', borderBottom: '1px solid var(--color-border)' }}>
              <strong style={{ fontSize: 'var(--text-base)' }}>
                Movimientos · {formatMonth(parseISO(`${activeMonth}-01`))}
              </strong>
            </div>
            <div style={{ padding: 12 }}>
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
