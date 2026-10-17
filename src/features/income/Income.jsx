import { useState, useMemo } from 'react'
import { IconCoin, IconRepeat, IconBolt } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useIncome }      from '@/hooks/useIncome'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths, toInputDate } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { rangeLabel } from '@/lib/dateRanges'
import { RangeFilter } from '@/components/common/RangeFilter/RangeFilter'
import { Card }      from '@/components/ui/Card/Card'
import { Button }    from '@/components/ui/Button/Button'
import { StatCard }  from '@/components/ui/StatCard/StatCard'
import { Modal }     from '@/components/common/Modal/Modal'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { IncomeForm } from './components/IncomeForm'
import { IncomeList } from './components/IncomeList'
import { extrasFrom } from '@/components/common/TransactionExtras/TransactionExtras'
import styles from './Income.module.css'

export function Income() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])
  // null = manda el mes seleccionado; si no, un atajo o rango personalizado.
  const [range, setRange] = useState(null)
  const {
    incomes, loading, error, totalIncome,
    addIncome, updateIncome, removeIncome, updateManyIncomes, addTagToIncomes, removeManyIncomes, refetch,
  } = useIncome(range)
  const showToast = useStore((s) => s.showToast)
  const periodLabel = range ? rangeLabel(range) : formatMonth(parseISO(`${activeMonth}-01`))

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  // Ingreso que se está duplicando: el formulario se abre prellenado pero guarda uno nuevo.
  const [duplicating, setDuplicating] = useState(null)
  const [saving,    setSaving]    = useState(false)

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  useMemo(() => { if (!loading) setHasLoadedOnce(true) }, [loading])
  const showSkeleton = loading && !hasLoadedOnce

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateIncome(editing.id, payload)
      else         await addIncome(payload)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setDuplicating(null)
  }

  function openNew()            { setEditing(null); setDuplicating(null); setModalOpen(true) }
  function openEdit(income)     { setEditing(income); setDuplicating(null); setModalOpen(true) }
  function openDuplicate(income) { setEditing(null); setDuplicating(income); setModalOpen(true) }

  // Se elimina de inmediato; el aviso con "Deshacer" reemplaza al diálogo de confirmación.
  async function handleDelete(id) {
    try {
      await removeIncome(id)
    } catch (err) {
      showToast(err.message ?? 'No se pudo eliminar el ingreso', 'error')
    }
  }

  function handleBulkCategory(ids, category) {
    const label = category ? `a "${category.name}"` : 'a "Sin categoría"'
    return updateManyIncomes(
      ids,
      { category_id: category?.id ?? null },
      `${ids.length} ingreso${ids.length !== 1 ? 's' : ''} movido${ids.length !== 1 ? 's' : ''} ${label}`,
    )
  }

  let modalTitle = 'Nuevo ingreso'
  if (editing) modalTitle = 'Editar ingreso'
  else if (duplicating) modalTitle = 'Duplicar ingreso'

  // Valores iniciales del formulario: edición exacta, o copia con fecha de hoy y sin adjuntos.
  let formInitial
  if (editing || duplicating) {
    const source = editing ?? duplicating
    formInitial = {
      amount:       String(source.amount),
      description:  source.description ?? '',
      category_id:  source.category_id ?? '',
      date:         editing ? source.date : toInputDate(new Date()),
      is_recurring: source.is_recurring,
      ...extrasFrom(source),
      ...(editing ? {} : { attachments: [] }),
    }
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
            className={`${styles.monthBtn} ${!range && activeMonth === m.key ? styles.monthActive : ''}`}
            onClick={() => { setRange(null); setActiveMonth(m.key) }}
          >
            {m.label} {m.year}
          </button>
        ))}
      </div>

      <RangeFilter range={range} onChange={setRange} />

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
              <strong>Movimientos · {periodLabel}</strong>
              <span className={styles.listCount}>{incomes.length} registros</span>
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <IncomeList
                incomes={incomes}
                onEdit={openEdit}
                onDelete={handleDelete}
                onDuplicate={openDuplicate}
                onBulkCategory={handleBulkCategory}
                onBulkTag={addTagToIncomes}
                onBulkDelete={removeManyIncomes}
              />
            </div>
          </Card>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalTitle}
      >
        <IncomeForm
          initial={formInitial}
          submitLabel={duplicating ? 'Crear copia' : undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
