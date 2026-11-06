import { useMemo, useState } from 'react'
import { IconClipboardList } from '@tabler/icons-react'
import { useBudgets }      from '@/hooks/useBudgets'
import { useMonthFilter }  from '@/hooks/useMonthFilter'
import { Button }          from '@/components/ui/Button/Button'
import { PageHeader }      from '@/components/ui/PageHeader/PageHeader'
import { Modal }           from '@/components/common/Modal/Modal'
import { EmptyState }      from '@/components/common/EmptyState/EmptyState'
import { MonthPicker }     from '@/components/common/MonthPicker/MonthPicker'
import { Skeleton }        from '@/components/common/Skeleton/Skeleton'
import { exportBudgetCSV, printBudgets } from '@/lib/exportBudgets'
import { sortBudgetsByUrgency } from '@/lib/budgetStatus'
import { BudgetCard }      from './components/BudgetCard'
import { BudgetForm }      from './components/BudgetForm'
import { BudgetSummary }   from './components/BudgetSummary'
import { BudgetAlerts }    from './components/BudgetAlerts'
import { ConfirmDialog }   from '@/components/common/ConfirmDialog/ConfirmDialog'
import styles from './Budgets.module.css'

export function Budgets() {
  const { budgets, summary, loading, addBudget, updateBudget, removeBudget } = useBudgets()
  const { activeMonth, setActiveMonth, months } = useMonthFilter()
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const sortedBudgets = useMemo(() => sortBudgetsByUrgency(budgets), [budgets])
  const deletingBudget = budgets.find((b) => b.id === deletingId)

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

  async function handleConfirmDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await removeBudget(deletingId)
      setDeletingId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        subtitle="Cuánto te queda en cada uno y si vas dentro del límite"
        actions={
          <>
            {budgets.length > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={() => exportBudgetCSV(budgets, activeMonth)}>
                  Exportar CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={printBudgets}>
                  Imprimir / PDF
                </Button>
              </>
            )}
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              + Nuevo presupuesto
            </Button>
          </>
        }
      />

      {budgets.length > 0 && (
        <div className={styles.periodRow}>
          <MonthPicker value={activeMonth} onChange={setActiveMonth} months={months} />
        </div>
      )}

      {loading ? (
        <div className={styles.skeletonWrap}>
          <Skeleton className={styles.summarySkeleton} />
          <Skeleton className={styles.alertsSkeleton} />
          <div className={styles.grid}>
            <Skeleton className={styles.cardSkeleton} />
            <Skeleton className={styles.cardSkeleton} />
            <Skeleton className={styles.cardSkeleton} />
          </div>
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<IconClipboardList size={32} stroke={1.5} />}
          title="Aún no tienes presupuestos"
          description="Ponle un límite mensual a una o varias categorías y te avisaremos al acercarte."
          action={<Button onClick={() => setModalOpen(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <>
          <BudgetSummary budgets={budgets} summary={summary} />
          <BudgetAlerts  budgets={budgets} />

          <div className={styles.grid}>
            {sortedBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={(b) => { setEditing(b); setModalOpen(true) }}
                onDelete={(id) => setDeletingId(id)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar presupuesto"
        description={
          deletingBudget
            ? `¿Eliminar el presupuesto "${deletingBudget.name}"? Esta acción no se puede deshacer.`
            : '¿Eliminar este presupuesto? Esta acción no se puede deshacer.'
        }
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        <BudgetForm
          initial={editing ? {
            name:        editing.name,
            amount:      String(editing.amount),
            category_ids: editing.category_ids ?? [],
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
