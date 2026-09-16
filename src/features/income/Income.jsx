import { useState, useMemo } from 'react'
import { IconCoin, IconRepeat, IconBolt } from '@tabler/icons-react'
import { useIncome }      from '@/hooks/useIncome'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { Card }      from '@/components/ui/Card/Card'
import { Button }    from '@/components/ui/Button/Button'
import { StatCard }  from '@/components/ui/StatCard/StatCard'
import { Modal }     from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { IncomeForm } from './components/IncomeForm'
import { IncomeList } from './components/IncomeList'
import styles from './Income.module.css'

export function Income() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])
  const {
    incomes, loading, error, totalIncome,
    addIncome, updateIncome, removeIncome, refetch,
  } = useIncome()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const deletingIncome = incomes.find((i) => i.id === deletingId)

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  useMemo(() => { if (!loading) setHasLoadedOnce(true) }, [loading])
  const showSkeleton = loading && !hasLoadedOnce

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

  async function handleConfirmDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await removeIncome(deletingId)
      setDeletingId(null)
    } finally {
      setDeleting(false)
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

      {/* Error de carga */}
      {error && (
        <div className={`${styles.errorBanner} ${styles.mb6}`} role="alert">
          <div>
            <p className={styles.errorTitle}>No pudimos cargar tus ingresos</p>
            <p className={styles.errorDesc}>Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={refetch}>Reintentar</Button>
        </div>
      )}

      {showSkeleton ? (
        <>
          <div className={styles.summary}>
            <Skeleton className={styles.statSkeleton} />
            <Skeleton className={styles.statSkeleton} />
            <Skeleton className={styles.statSkeleton} />
          </div>
          <Skeleton className={styles.listSkeleton} />
        </>
      ) : (
        <>
          {/* Stats */}
          <div className={styles.summary}>
            <StatCard label="Total ingresos" amount={formatCurrency(totalIncome)} icon={<IconCoin size={20} stroke={1.75} />} iconBg="var(--color-success-light)" />
            <StatCard label="Recurrentes" amount={formatCurrency(recurring.reduce((a, i) => a + Number(i.amount), 0))} icon={<IconRepeat size={20} stroke={1.75} />} iconBg="var(--color-info-light)" />
            <StatCard label="Únicos" amount={oneTime.length} icon={<IconBolt size={20} stroke={1.75} />} iconBg="var(--color-warning-light)" />
          </div>

          <Card padded={false}>
            <div className={styles.listHeader}>
              <strong>Movimientos · {formatMonth(parseISO(`${activeMonth}-01`))}</strong>
              <span className={styles.listCount}>{incomes.length} registros</span>
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <IncomeList
                incomes={incomes}
                onEdit={openEdit}
                onDelete={(id) => setDeletingId(id)}
              />
            </div>
          </Card>
        </>
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

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar ingreso"
        description={
          deletingIncome
            ? `¿Eliminar "${deletingIncome.description || deletingIncome.category?.name || 'este ingreso'}" por ${formatCurrency(deletingIncome.amount)}? Esta acción no se puede deshacer.`
            : '¿Eliminar este ingreso? Esta acción no se puede deshacer.'
        }
      />
    </div>
  )
}
