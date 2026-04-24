import { useState } from 'react'
import { useIncome }      from '@/hooks/useIncome'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { Card }      from '@/components/ui/Card/Card'
import { Button }    from '@/components/ui/Button/Button'
import { StatCard }  from '@/components/ui/StatCard/StatCard'
import { Modal }     from '@/components/common/Modal/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { IncomeForm } from './components/IncomeForm'
import { IncomeList } from './components/IncomeList'
import styles from './Income.module.css'
import { useMemo } from 'react'

export function Income() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])
  const { incomes, loading, totalIncome, addIncome, updateIncome, removeIncome } = useIncome()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateIncome(editing.id, payload)
      else         await addIncome(payload)
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(income) {
    setEditing(income)
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  const recurring = incomes.filter((i) => i.is_recurring)
  const oneTime   = incomes.filter((i) => !i.is_recurring)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ingresos</h1>
        <Button onClick={openNew}>+ Nuevo ingreso</Button>
      </div>

      {/* Filtro de mes */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMonth(m.key)}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              borderRadius: 999,
              border: `1.5px solid ${activeMonth === m.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: activeMonth === m.key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeMonth === m.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label} {m.year}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.summary}>
        <StatCard label="Total ingresos" amount={formatCurrency(totalIncome)} icon="💰" iconBg="rgba(16,185,129,0.12)" />
        <StatCard label="Recurrentes" amount={formatCurrency(recurring.reduce((a, i) => a + Number(i.amount), 0))} icon="🔁" iconBg="rgba(59,130,246,0.12)" />
        <StatCard label="Únicos" amount={oneTime.length} icon="⚡" iconBg="rgba(245,158,11,0.12)" />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card padded={false}>
          <div style={{ padding: '20px 20px 8px', borderBottom: '1px solid var(--color-border)' }}>
            <strong style={{ fontSize: 'var(--text-base)' }}>
              Movimientos · {formatMonth(parseISO(`${activeMonth}-01`))}
            </strong>
          </div>
          <div style={{ padding: 12 }}>
            <IncomeList incomes={incomes} onEdit={openEdit} onDelete={removeIncome} />
          </div>
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar ingreso' : 'Nuevo ingreso'}
      >
        <IncomeForm
          initial={editing ? {
            amount:       String(editing.amount),
            description:  editing.description ?? '',
            category_id:  editing.category_id ?? '',
            date:         editing.date,
            is_recurring: editing.is_recurring,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
