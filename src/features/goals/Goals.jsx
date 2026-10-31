import { useState } from 'react'
import { SegmentedControl } from '@mantine/core'
import { IconTarget } from '@tabler/icons-react'
import { useGoals }    from '@/hooks/useGoals'
import { Button }      from '@/components/ui/Button/Button'
import { PageHeader }  from '@/components/ui/PageHeader/PageHeader'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { Skeleton }    from '@/components/common/Skeleton/Skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { GoalCard }    from './components/GoalCard'
import { GoalForm }    from './components/GoalForm'
import styles from './Goals.module.css'

const TABS = [
  { value: 'active',    label: 'Activos' },
  { value: 'completed', label: 'Completados' },
  { value: 'paused',    label: 'Pausados' },
]

export function Goals() {
  const {
    goals, loading, addGoal, updateGoal, addGoalProgress, removeGoal,
    accounts, goalAccountLinks, linkGoalAccount, unlinkGoalAccount,
  } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('active')

  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const deletingGoal = goals.find((g) => g.id === deletingId)

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateGoal(editing.id, payload)
      else         await addGoal(payload)
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
      await removeGoal(deletingId)
      setDeletingId(null)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = goals.filter((g) => g.status === tab)

  return (
    <div>
      <PageHeader
        title="Objetivos"
        subtitle="Lo que quieres lograr, cuánto falta y cuándo llegarías"
        actions={<Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nuevo objetivo</Button>}
      />

      <SegmentedControl
        className={styles.tabs}
        fullWidth
        value={tab}
        onChange={setTab}
        data={TABS.map((t) => ({
          value: t.value,
          label: `${t.label} (${goals.filter((g) => g.status === t.value).length})`,
        }))}
        aria-label="Filtrar objetivos por estado"
      />

      {loading ? (
        <div className={styles.grid}>
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={32} stroke={1.5} />}
          title={`Sin objetivos ${tab === 'active' ? 'activos' : tab === 'completed' ? 'completados' : 'pausados'}`}
          description={tab === 'active'
            ? 'Ponle nombre y monto a lo que quieres lograr; te diremos cuánto ahorrar por mes.'
            : 'Cuando cambies el estado de un objetivo aparecerá aquí.'}
          action={tab === 'active' && (
            <Button onClick={() => setModalOpen(true)}>Crear objetivo</Button>
          )}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => { setEditing(g); setModalOpen(true) }}
              onDelete={(id) => setDeletingId(id)}
              onAddProgress={addGoalProgress}
              accounts={accounts}
              goalAccountLinks={goalAccountLinks}
              onLinkAccount={linkGoalAccount}
              onUnlinkAccount={unlinkGoalAccount}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar objetivo"
        description={
          deletingGoal
            ? `¿Eliminar el objetivo "${deletingGoal.name}"? Esta acción no se puede deshacer.`
            : '¿Eliminar este objetivo? Esta acción no se puede deshacer.'
        }
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
      >
        <GoalForm
          initial={editing ? {
            name:           editing.name,
            target_amount:  String(editing.target_amount),
            // Si está vinculado a cuentas, current_amount en BD es un valor
            // manual desactualizado — se muestra el monto calculado en vivo
            // (el mismo que ve la tarjeta) para que no diga algo distinto.
            current_amount: String(editing.isAccountLinked ? editing.progressAmount : editing.current_amount),
            target_date:    editing.target_date ?? '',
            color:          editing.color,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
          isLinked={!!editing?.isAccountLinked}
        />
      </Modal>
    </div>
  )
}
