import { useState } from 'react'
import { format } from 'date-fns'
import { useBudgets }      from '@/hooks/useBudgets'
import { useMonthFilter }  from '@/hooks/useMonthFilter'
import { Button }          from '@/components/ui/Button/Button'
import { Modal }           from '@/components/common/Modal/Modal'
import { EmptyState }      from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner }  from '@/components/common/LoadingSpinner/LoadingSpinner'
import { exportBudgetCSV, printBudgets } from '@/lib/exportBudgets'
import { BudgetCard }      from './components/BudgetCard'
import { BudgetForm }      from './components/BudgetForm'
import { BudgetSummary }   from './components/BudgetSummary'
import { BudgetAlerts }    from './components/BudgetAlerts'
import styles from './Budgets.module.css'

export function Budgets() {
  const { budgets, loading, addBudget, updateBudget, removeBudget } = useBudgets()
  const { activeMonth } = useMonthFilter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  const isCurrentMonth = activeMonth === format(new Date(), 'yyyy-MM')

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateBudget(editing.id, payload)
      else         await addBudget(payload)
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Presupuestos</h1>
        <div className={styles.headerActions}>
          {budgets.length > 0 && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportBudgetCSV(budgets, activeMonth)}
              >
                Exportar CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={printBudgets}
              >
                Imprimir / PDF
              </Button>
            </>
          )}
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            + Nuevo presupuesto
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin presupuestos"
          description="Crea un presupuesto para controlar tus gastos por categoría"
          action={<Button onClick={() => setModalOpen(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <>
          <BudgetSummary budgets={budgets} />
          <BudgetAlerts  budgets={budgets} />

          <div className={styles.grid}>
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                isCurrentMonth={isCurrentMonth}
                onEdit={(b) => { setEditing(b); setModalOpen(true) }}
                onDelete={removeBudget}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        <BudgetForm
          initial={editing ? {
            name:        editing.name,
            amount:      String(editing.amount),
            category_id: editing.category_id ?? '',
            period:      editing.period,
            color:       editing.color,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
