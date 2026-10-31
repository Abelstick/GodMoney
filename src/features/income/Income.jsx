import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconCoin, IconRepeat, IconBolt } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useIncome }      from '@/hooks/useIncome'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths, toInputDate } from '@/lib/formatters'
import { parseISO } from 'date-fns'
import { rangeLabel } from '@/lib/dateRanges'
import { RangeFilter } from '@/components/common/RangeFilter/RangeFilter'
import { MonthPicker } from '@/components/common/MonthPicker/MonthPicker'
import { Card }      from '@/components/ui/Card/Card'
import { Button }    from '@/components/ui/Button/Button'
import { StatCard }  from '@/components/ui/StatCard/StatCard'
import { RecurringTransactionsModal } from '@/components/common/RecurringTransactions/RecurringTransactionsModal'
import { Modal }     from '@/components/common/Modal/Modal'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { IncomeForm } from './components/IncomeForm'
import { IncomeList } from './components/IncomeList'
import { extrasFrom } from '@/components/common/TransactionExtras/TransactionExtras'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import styles from './Income.module.css'

export function Income() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(12), [])
  // null = manda el mes seleccionado; si no, un atajo o rango personalizado.
  const [range, setRange] = useState(null)
  const {
    incomes, loading, error, totalIncome,
    addIncome, updateIncome, removeIncome, updateManyIncomes, addTagToIncomes, removeManyIncomes, refetch,
  } = useIncome(range)
  const showToast = useStore((s) => s.showToast)
  const periodLabel = range ? rangeLabel(range) : formatMonth(parseISO(`${activeMonth}-01`))

  const [modalOpen, setModalOpen] = useState(false)
  const [autoOpen,  setAutoOpen]  = useState(false)
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

  // Desde el registro rápido ("Agregar notas, etiquetas o adjuntos") se llega
  // con ?nuevo=1: abre el formulario completo y limpia la URL.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    openNew()
    setSearchParams({}, { replace: true })
  }, [searchParams])
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
    <div>
      <PageHeader
        title="Ingresos"
        actions={
          <>
            <Button variant="secondary" onClick={() => setAutoOpen(true)}>
              <IconRepeat size={16} stroke={1.75} /> Automáticos
            </Button>
            <Button onClick={openNew}>+ Nuevo ingreso</Button>
          </>
        }
      />

      {/* Periodo: mes (selector compacto) o un rango personalizado */}
      <div className={styles.periodRow}>
        <div className={range ? styles.periodInactive : undefined}>
          <MonthPicker
            value={activeMonth}
            onChange={(key) => { setRange(null); setActiveMonth(key) }}
            months={months}
          />
        </div>
        <RangeFilter range={range} onChange={setRange} />
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

      <RecurringTransactionsModal isOpen={autoOpen} onClose={() => setAutoOpen(false)} kind="income" />

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
