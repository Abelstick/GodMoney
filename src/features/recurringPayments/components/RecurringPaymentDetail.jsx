import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { currentPeriodDueDate } from '@/lib/recurringPaymentSchedule'
import { evaluatePeriod } from '@/lib/recurringPaymentMatch'
import { recurringPaymentService } from '@/services/recurringPaymentService'
import { getEffectiveRecurringStatus, RECURRING_STATUS, RECURRING_STATUS_META } from '@/lib/recurringPaymentStatus'
import { useRecurringPayments } from '@/hooks/useRecurringPayments'
import { MarkPaidModal } from './MarkPaidModal'
import styles from './RecurringPaymentDetail.module.css'

export function RecurringPaymentDetail({ payment, isOpen, onClose }) {
  const {
    fetchRecurringPaymentDetail, paymentsByRecurringPayment,
    updateRecurringPayment, setRecurringPaymentActive, removeRecurringPayment, payRecurringPayment, ledger,
    removeRecurringPaymentEntry, recurringPayments,
  } = useRecurringPayments()
  const { categories } = useCategories('expense')

  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [undoEntry, setUndoEntry] = useState(null)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => {
    if (isOpen && payment) fetchRecurringPaymentDetail(payment.id)
  }, [isOpen, payment?.id])

  // Gastos recientes, para mostrar cuáles cuentan para el periodo vigente.
  const [periodExpenses, setPeriodExpenses] = useState([])
  const paidCount = ledger.length
  useEffect(() => {
    if (!isOpen || !payment) return
    let cancelled = false
    const since = new Date()
    since.setMonth(since.getMonth() - 2)
    recurringPaymentService.getExpensesSince(since.toISOString().slice(0, 10))
      .then((rows) => { if (!cancelled) setPeriodExpenses(rows) })
      .catch(() => { if (!cancelled) setPeriodExpenses([]) })
    return () => { cancelled = true }
  }, [isOpen, payment?.id, payment?.category_id, paidCount])

  const period = useMemo(() => {
    if (!payment) return null
    const used = new Set(ledger.map((l) => l.expense_id).filter(Boolean))
    return evaluatePeriod(payment, recurringPayments, periodExpenses, { used })
  }, [payment, recurringPayments, periodExpenses, ledger])

  if (!payment) return null

  const history = paymentsByRecurringPayment[payment.id] ?? []
  const status = getEffectiveRecurringStatus(payment, ledger)
  const statusMeta = RECURRING_STATUS_META[status]
  const canPay = status !== RECURRING_STATUS.PAUSED && status !== RECURRING_STATUS.UP_TO_DATE
  const dueDate = currentPeriodDueDate(payment)
  const paidThisPeriod = ledger.some((l) => l.recurring_payment_id === payment.id && l.period_date === dueDate)

  async function handlePay(payload) {
    setPaying(true)
    try {
      await payRecurringPayment(payload)
      await fetchRecurringPaymentDetail(payment.id)
      setPayOpen(false)
    } finally {
      setPaying(false)
    }
  }

  function startEdit() {
    setEditForm({
      name: payment.name,
      description: payment.description ?? '',
      amount: payment.amount ?? '',
      category_id: payment.category_id ?? '',
      due_day_of_month: payment.due_day_of_month ?? '',
      next_due_date: payment.next_due_date ?? '',
      reminder_days_before: String(payment.reminder_days_before),
    })
    setEditOpen(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditSaving(true)
    try {
      await updateRecurringPayment(payment.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        amount: editForm.amount !== '' ? Number(editForm.amount) : null,
        category_id: editForm.category_id || null,
        due_day_of_month: editForm.due_day_of_month,
        next_due_date: editForm.next_due_date,
        reminder_days_before: Number(editForm.reminder_days_before),
      })
      // Con la nueva categoría puede haberse vinculado un gasto ya registrado.
      await fetchRecurringPaymentDetail(payment.id)
      setEditOpen(false)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleUndo() {
    setUndoing(true)
    try {
      await removeRecurringPaymentEntry(undoEntry)
      setUndoEntry(null)
    } finally {
      setUndoing(false)
    }
  }

  async function handleTogglePause() {
    setPausing(true)
    try {
      await setRecurringPaymentActive(payment.id, !payment.is_active)
      setPauseOpen(false)
    } finally {
      setPausing(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await removeRecurringPayment(payment.id)
      setDeleteOpen(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={payment.name}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <Badge color={statusMeta.color} withDot>{statusMeta.label}</Badge>
          </div>

          {payment.description && <p className={styles.description}>{payment.description}</p>}

          <div className={styles.amountsGrid}>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Monto</span>
              <span className={styles.amountValue}>{payment.amount ? formatCurrency(payment.amount) : 'Variable'}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Próximo vencimiento</span>
              <span className={`${styles.amountValue} ${styles.emphasis}`}>{formatDate(dueDate)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Programación</span>
              <span className={styles.amountValue}>
                {payment.schedule_type === 'FIXED_DAY' ? `Día ${payment.due_day_of_month} de cada mes` : 'Fecha manual'}
              </span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Aviso anticipado</span>
              <span className={styles.amountValue}>{payment.reminder_days_before} día(s) antes</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Categoría</span>
              <span className={styles.amountValue}>{payment.category?.name ?? 'Sin categoría'}</span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Periodo vigente: del {formatDate(period.from)} al {formatDate(period.until)}
            </h3>
            <p className={styles.description}>
              {status === RECURRING_STATUS.PAUSED
                ? 'Pausado: no se vincula con gastos.'
                : paidThisPeriod
                  ? 'Este periodo ya está pagado.'
                  : period.byCategory
                    ? `Cuentan los gastos de "${payment.category.name}" con fecha dentro de este periodo.`
                    : period.sharedWith.length
                      ? `${period.sharedWith.map((p) => `"${p.name}"`).join(', ')} también usa la categoría "${payment.category.name}", así que solo cuentan los gastos cuya descripción contenga "${payment.name}".`
                      : `Sin categoría: solo cuentan los gastos cuya descripción contenga "${payment.name}". Edítalo y asígnale una categoría.`}
            </p>
            {!paidThisPeriod && status !== RECURRING_STATUS.PAUSED && (
              <>
                <p className={styles.description}>
                  {period.counted.length === 0
                    ? 'Todavía no hay gastos que cuenten en este periodo.'
                    : period.expected
                      ? `Llevas ${formatCurrency(period.total)} de ${formatCurrency(period.expected)}; se marca como pagado desde ${formatCurrency(period.needed)}.`
                      : `Llevas ${formatCurrency(period.total)}.`}
                </p>
                {period.counted.length > 0 && (
                  <div className={styles.paymentList}>
                    {period.counted.map((e) => (
                      <div key={e.id} className={styles.paymentRow}>
                        <div className={styles.paymentDate}>{formatDate(e.date)}</div>
                        <div className={styles.paymentAmounts}>{e.description || 'Gasto'}</div>
                        <div className={styles.paymentTotal}>{formatCurrency(e.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.actions}>
            {canPay && <Button onClick={() => setPayOpen(true)}>Marcar pagado</Button>}
            <Button variant="secondary" onClick={startEdit}>Editar</Button>
            <Button variant="secondary" onClick={() => setPauseOpen(true)}>
              {payment.is_active ? 'Pausar' : 'Reactivar'}
            </Button>
          </div>

          <div className={styles.dangerZone}>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>Eliminar</Button>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Historial de pagos</h3>
            {history.length === 0 ? (
              <p className={styles.emptyText}>Sin pagos registrados todavía</p>
            ) : (
              <div className={styles.paymentList}>
                {history.map((p, index) => (
                  <div key={p.id} className={styles.paymentRow}>
                    <div className={styles.paymentDate}>{formatDate(p.period_date)}</div>
                    <div className={styles.paymentAmounts}>
                      {p.expense ? `Vinculado a "${p.expense.description || 'gasto'}"` : 'Marcado manualmente'}
                    </div>
                    <div className={styles.paymentTotal}>{formatCurrency(p.amount)}</div>
                    {index === 0 && (
                      <Button size="sm" variant="secondary" onClick={() => setUndoEntry(p)}>Deshacer</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {payOpen && (
        <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title="Marcar como pagado">
          <MarkPaidModal payment={payment} onSubmit={handlePay} onCancel={() => setPayOpen(false)} loading={paying} />
        </Modal>
      )}

      {editOpen && editForm && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar pago recurrente">
          <form className={styles.editForm} onSubmit={handleEditSubmit}>
            <Input label="Nombre" value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Descripción" value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Monto aproximado" type="number" min="0" step="0.01" prefix="S/" value={editForm.amount}
              onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} />
            <Select label="Categoría"
              description="Al registrar un gasto en esta categoría, el pago se marca como pagado automáticamente"
              options={[{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              value={editForm.category_id}
              onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))} />
            {payment.schedule_type === 'FIXED_DAY' ? (
              <Input label="Día del mes en que vence" type="number" min="1" max="31" step="1" required
                hint="El periodo va del día siguiente al vencimiento anterior hasta este día"
                value={editForm.due_day_of_month}
                onChange={(e) => setEditForm((f) => ({ ...f, due_day_of_month: e.target.value }))} />
            ) : (
              <Input label="Próxima fecha de vencimiento" type="date" required
                value={editForm.next_due_date}
                onChange={(e) => setEditForm((f) => ({ ...f, next_due_date: e.target.value }))} />
            )}
            <Input label="Avisar con cuántos días de anticipación" type="number" min="0" step="1"
              value={editForm.reminder_days_before}
              onChange={(e) => setEditForm((f) => ({ ...f, reminder_days_before: e.target.value }))} required />
            <div className={styles.actions}>
              <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? 'Guardando…' : 'Actualizar'}</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={pauseOpen}
        onClose={() => setPauseOpen(false)}
        onConfirm={handleTogglePause}
        loading={pausing}
        title={payment.is_active ? 'Pausar pago recurrente' : 'Reactivar pago recurrente'}
        description={
          payment.is_active
            ? `Mientras esté pausado, "${payment.name}" no generará alertas ni notificaciones.`
            : `"${payment.name}" volverá a generar alertas y notificaciones según su vencimiento.`
        }
        confirmLabel={payment.is_active ? 'Pausar' : 'Reactivar'}
      />

      <ConfirmDialog
        isOpen={!!undoEntry}
        onClose={() => setUndoEntry(null)}
        onConfirm={handleUndo}
        loading={undoing}
        title="Deshacer pago"
        description={`"${payment.name}" volverá a quedar pendiente para ese periodo. Tus gastos no se borran, y este periodo ya no se marcará solo: tendrás que usar "Marcar pagado".`}
        confirmLabel="Deshacer pago"
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar pago recurrente"
        description={`Se eliminará "${payment.name}" y su historial de pagos (${history.length} registro${history.length !== 1 ? 's' : ''}). Los gastos vinculados no se borran. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
      />
    </>
  )
}
