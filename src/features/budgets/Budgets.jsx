import { useState } from 'react'
import { useBudgets }  from '@/hooks/useBudgets'
import { Button }      from '@/components/ui/Button/Button'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { BudgetCard }  from './components/BudgetCard'
import { BudgetForm }  from './components/BudgetForm'
import styles from './Budgets.module.css'

export function Budgets() {
  const { budgets, loading, addBudget, updateBudget, removeBudget } = useBudgets()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)

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
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nuevo presupuesto</Button>
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
        <div className={styles.grid}>
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={(b) => { setEditing(b); setModalOpen(true) }}
              onDelete={removeBudget}
            />
          ))}
        </div>
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
