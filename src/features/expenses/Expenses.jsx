import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { IconReceipt2, IconPinned, IconPigMoney, IconRepeat } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useExpenses }    from '@/hooks/useExpenses'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth, getPastMonths, toInputDate } from '@/lib/formatters'
import { splitSavings } from '@/lib/savings'
import { parseISO } from 'date-fns'
import { percentDelta, rangeLabel } from '@/lib/dateRanges'
import { usePreviousPeriodTotals } from '@/hooks/usePreviousPeriodTotals'
import { RangeFilter } from '@/components/common/RangeFilter/RangeFilter'
import { MonthPicker } from '@/components/common/MonthPicker/MonthPicker'
import { Card }     from '@/components/ui/Card/Card'
import { Button }   from '@/components/ui/Button/Button'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { RecurringTransactionsModal } from '@/components/common/RecurringTransactions/RecurringTransactionsModal'
import { Modal }    from '@/components/common/Modal/Modal'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { ExpenseForm } from './components/ExpenseForm'
import { expenseService } from '@/services/expenseService'
import { groupTotal, splitFromGroup } from '@/lib/expenseSplit'
import { ExpenseList } from './components/ExpenseList'
import { extrasFrom } from '@/components/common/TransactionExtras/TransactionExtras'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import styles from './Expenses.module.css'

// Variación vs el periodo anterior. Gastar más es "malo": sube en rojo, baja en verde.
function Delta({ current, previous, loading }) {
  if (loading) return <span className={styles.delta} />
  const pct = percentDelta(current, previous)
  if (pct === null) return <span className={`${styles.delta} ${styles.deltaNew}`}>nuevo</span>
  if (pct === 0)    return <span className={`${styles.delta} ${styles.deltaFlat}`}>=</span>
  return (
    <span className={`${styles.delta} ${pct > 0 ? styles.deltaUp : styles.deltaDown}`}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

function PieLegend({ data, total, previous }) {
  return (
    <div className={styles.pieLegend}>
      {data.map((entry) => {
        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
        return (
          <div key={entry.name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: entry.color }} />
            <span className={styles.legendName}>{entry.name}</span>
            <span className={styles.legendPct}>{pct}%</span>
            <span className={styles.legendAmount}>{formatCurrency(entry.value)}</span>
            <Delta current={entry.value} previous={previous.byCategory[entry.name] ?? 0} loading={previous.loading} />
          </div>
        )
      })}
    </div>
  )
}

function PieTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDot} style={{ background: d.color }} />
      <span className={styles.tooltipName}>{d.name}</span>
      <span className={styles.tooltipAmount}>{formatCurrency(d.value)}</span>
    </div>
  )
}

export function Expenses() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(12), [])
  // null = manda el mes seleccionado; si no, un atajo o rango personalizado.
  const [range, setRange] = useState(null)
  const {
    expenses, loading, error, totalExpense, from, to,
    addExpense, addSplitExpense, saveSplitGroup, updateExpense, removeExpense, updateManyExpenses, addTagToExpenses, removeManyExpenses, refetch,
  } = useExpenses(range)
  const showToast = useStore((s) => s.showToast)
  const previous = usePreviousPeriodTotals(from, to)
  const periodLabel = range ? rangeLabel(range) : formatMonth(parseISO(`${activeMonth}-01`))

  const [modalOpen, setModalOpen] = useState(false)
  const [autoOpen,  setAutoOpen]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  // Gasto que se está duplicando: el formulario se abre prellenado pero guarda uno nuevo.
  const [duplicating, setDuplicating] = useState(null)
  const [saving,    setSaving]    = useState(false)
  // Todas las partes del gasto dividido que se edita o duplica (null si no lo es).
  const [group,     setGroup]     = useState(null)

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  useMemo(() => { if (!loading) setHasLoadedOnce(true) }, [loading])
  const showSkeleton = loading && !hasLoadedOnce

  async function handleSubmit(payload, splitRows) {
    setSaving(true)
    try {
      if (editing && (splitRows || group)) {
        // Editar un gasto dividido (o dividir uno que no lo estaba) toca todas sus partes.
        // Si se quita la división, queda solo este gasto con el monto total.
        const oldRows = group ?? [editing]
        if (splitRows) await saveSplitGroup(splitRows[0].split_group_id, oldRows, splitRows)
        else await saveSplitGroup(group[0].split_group_id, oldRows, [{ ...payload, id: editing.id, split_group_id: null }])
      }
      else if (editing)   await updateExpense(editing.id, payload)
      else if (splitRows) await addSplitExpense(splitRows)
      else                await addExpense(payload)
      closeModal()
    } catch (err) {
      // El formulario queda abierto con los mismos datos (y los mismos ids):
      // volver a guardar es seguro.
      showToast(err.message ?? 'No se pudo guardar el gasto', 'error')
    } finally {
      setSaving(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setDuplicating(null)
    setGroup(null)
  }

  function openNew()         { setEditing(null); setDuplicating(null); setGroup(null); setModalOpen(true) }

  // Un gasto dividido se abre con todas sus partes (se piden al servidor por si
  // alguna quedó fuera del periodo que se está viendo).
  async function openWithGroup(expense, mode) {
    let parts = null
    if (expense.split_group_id && !expense._pending) {
      try {
        parts = await expenseService.getByGroup(expense.split_group_id)
      } catch (err) {
        showToast(err.message ?? 'No se pudo cargar el gasto dividido', 'error')
        return
      }
    }
    setGroup(parts?.length ? parts : null)
    setEditing(mode === 'edit' ? expense : null)
    setDuplicating(mode === 'duplicate' ? expense : null)
    setModalOpen(true)
  }

  // Desde el registro rápido ("Agregar notas, etiquetas o adjuntos") se llega
  // con ?nuevo=1: abre el formulario completo y limpia la URL.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    openNew()
    setSearchParams({}, { replace: true })
  }, [searchParams])
  function openEdit(expense) { openWithGroup(expense, 'edit') }
  function openDuplicate(expense) { openWithGroup(expense, 'duplicate') }

  // Se elimina de inmediato; el aviso con "Deshacer" reemplaza al diálogo de confirmación.
  async function handleDelete(id) {
    try {
      await removeExpense(id)
    } catch (err) {
      showToast(err.message ?? 'No se pudo eliminar el gasto', 'error')
    }
  }

  // Al sacar un gasto de una categoría de ahorro hay que soltar su cuenta destino,
  // igual que hace el formulario, para que el trigger de BD revierta el saldo.
  function handleBulkCategory(ids, category) {
    const patch = { category_id: category?.id ?? null }
    if (!category?.is_savings) patch.savings_account_id = null
    const label = category ? `a "${category.name}"` : 'a "Sin categoría"'
    return updateManyExpenses(ids, patch, `${ids.length} gasto${ids.length !== 1 ? 's' : ''} movido${ids.length !== 1 ? 's' : ''} ${label}`)
  }

  let modalTitle = 'Nuevo gasto'
  if (editing) modalTitle = group ? 'Editar gasto dividido' : 'Editar gasto'
  else if (duplicating) modalTitle = group ? 'Duplicar gasto dividido' : 'Duplicar gasto'

  // Valores iniciales del formulario: edición exacta, o copia con fecha de hoy y sin adjuntos.
  let formInitial
  if (editing || duplicating) {
    const source = editing ?? duplicating
    formInitial = {
      amount:      String(source.amount),
      description: source.description ?? '',
      category_id: source.category_id ?? '',
      date:        editing ? source.date : toInputDate(new Date()),
      is_fixed:    source.is_fixed,
      savings_account_id: source.savings_account_id ?? '',
      paid_from_account_id: source.paid_from_account_id ?? '',
      repay_to_savings: source.repay_to_savings !== false,
      ...extrasFrom(source),
      ...(editing ? {} : { attachments: [] }),
    }
    if (group) {
      formInitial.amount = String(groupTotal(group))
      formInitial.savings_account_id = group.find((e) => e.savings_account_id)?.savings_account_id ?? ''
      formInitial.split = splitFromGroup(group, { keepIds: Boolean(editing) })
    }
  }

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
  const { consumptionTotal, savingsTotal } = useMemo(() => splitSavings(expenses), [expenses])

  return (
    <div>
      <PageHeader
        title="Gastos"
        actions={
          <>
            <Button variant="secondary" onClick={() => setAutoOpen(true)}>
              <IconRepeat size={16} stroke={1.75} /> Automáticos
            </Button>
            <Button onClick={openNew}>+ Nuevo gasto</Button>
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
            <p className={styles.errorTitle}>No pudimos cargar tus gastos</p>
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
          <div className={styles.catGrid}>
            <Skeleton className={styles.pieSkeleton} />
            <Skeleton className={styles.listSkeleton} />
          </div>
        </>
      ) : (
        <>
          {/* Stats */}
          <div className={styles.summary}>
            <StatCard
              label="Gasto real"
              amount={formatCurrency(consumptionTotal)}
              icon={<IconReceipt2 size={20} stroke={1.75} />}
              iconBg="var(--color-danger-light)"
              badge={savingsTotal > 0 ? { label: `Total ${formatCurrency(totalExpense)}`, tone: 'plain' } : undefined}
            />
            <StatCard label="Ahorrado"      amount={formatCurrency(savingsTotal)} icon={<IconPigMoney size={20} stroke={1.75} />} iconBg="var(--color-primary-alpha)" />
            <StatCard label="Gastos fijos"  amount={formatCurrency(fixedTotal)}   icon={<IconPinned size={20} stroke={1.75} />} iconBg="var(--color-danger-light)" />
          </div>

          <div className={styles.catGrid}>
            {/* Gráfico de dona */}
            {pieData.length > 0 && (
              <Card padded>
                <Card.Header>Por categoría · {periodLabel}</Card.Header>
                <div className={styles.pieWrap}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Total en el centro (donut) */}
                  <div className={styles.pieCenter}>
                    <span className={styles.pieCenterLabel}>Total</span>
                    <span className={styles.pieCenterAmount}>{formatCurrency(totalExpense)}</span>
                  </div>
                </div>

                {!previous.loading && (
                  <div className={styles.comparison}>
                    <span>vs {rangeLabel({ type: 'custom', ...previous.prev })}</span>
                    <span className={styles.comparisonValue}>
                      <Delta current={totalExpense} previous={previous.total} />
                      <span className={styles.comparisonPrev}>antes {formatCurrency(previous.total)}</span>
                    </span>
                  </div>
                )}

                <PieLegend data={pieData} total={totalExpense} previous={previous} />
              </Card>
            )}

            {/* Lista con paginación */}
            <Card padded={false}>
              <div className={styles.listHeader}>
                <strong>Movimientos · {periodLabel}</strong>
                <span className={styles.listCount}>{expenses.length} registros</span>
              </div>
              <div style={{ padding: '8px 12px 12px' }}>
                <ExpenseList
                  expenses={expenses}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onDuplicate={openDuplicate}
                  onBulkCategory={handleBulkCategory}
                  onBulkTag={addTagToExpenses}
                  onBulkDelete={removeManyExpenses}
                />
              </div>
            </Card>
          </div>
        </>
      )}

      <RecurringTransactionsModal isOpen={autoOpen} onClose={() => setAutoOpen(false)} kind="expense" />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalTitle}
      >
        <ExpenseForm
          initial={formInitial}
          submitLabel={duplicating ? 'Crear copia' : undefined}
          allowSplit
          editingId={editing?.id}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
