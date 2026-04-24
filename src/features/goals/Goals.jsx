import { useState } from 'react'
import { useGoals }    from '@/hooks/useGoals'
import { Button }      from '@/components/ui/Button/Button'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { GoalCard }    from './components/GoalCard'
import { GoalForm }    from './components/GoalForm'
import styles from './Goals.module.css'

const TABS = [
  { value: 'active',    label: 'Activos' },
  { value: 'completed', label: 'Completados' },
  { value: 'paused',    label: 'Pausados' },
]

export function Goals() {
  const { goals, loading, addGoal, updateGoal, addGoalProgress, removeGoal } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('active')

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

  const filtered = goals.filter((g) => g.status === tab)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Objetivos financieros</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nuevo objetivo</Button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`${styles.tab} ${tab === t.value ? styles.active : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label} ({goals.filter((g) => g.status === t.value).length})
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title={`Sin objetivos ${tab === 'active' ? 'activos' : tab === 'completed' ? 'completados' : 'pausados'}`}
          description={tab === 'active' ? 'Crea un objetivo para empezar a ahorrar' : ''}
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
              onDelete={removeGoal}
              onAddProgress={addGoalProgress}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
      >
        <GoalForm
          initial={editing ? {
            name:           editing.name,
            target_amount:  String(editing.target_amount),
            current_amount: String(editing.current_amount),
            target_date:    editing.target_date ?? '',
            color:          editing.color,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
