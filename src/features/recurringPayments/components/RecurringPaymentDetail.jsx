import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { Input } from '@/components/ui/Input/Input'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { currentPeriodDueDate } from '@/lib/recurringPaymentSchedule'
import { getEffectiveRecurringStatus, RECURRING_STATUS, RECURRING_STATUS_META } from '@/lib/recurringPaymentStatus'
import { useRecurringPayments } from '@/hooks/useRecurringPayments'
import { MarkPaidModal } from './MarkPaidModal'
import styles from './RecurringPaymentDetail.module.css'

export function RecurringPaymentDetail({ payment, isOpen, onClose }) {
  const {
    fetchRecurringPaymentDetail, paymentsByRecurringPayment,
    updateRecurringPayment, setRecurringPaymentActive, removeRecurringPayment, payRecurringPayment, ledger,
  } = useRecurringPayments()

  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && payment) fetchRecurringPaymentDetail(payment.id)
  }, [isOpen, payment?.id])

  if (!payment) return null

  const history = paymentsByRecurringPayment[payment.id] ?? []
  const status = getEffectiveRecurringStatus(payment, ledger)
  const statusMeta = RECURRING_STATUS_META[status]
  const canPay = status !== RECURRING_STATUS.PAUSED && status !== RECURRING_STATUS.UP_TO_DATE
  const dueDate = currentPeriodDueDate(payment)

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
        category_id: payment.category_id,
        reminder_days_before: Number(editForm.reminder_days_before),
      })
      setEditOpen(false)
    } finally {
      setEditSaving(false)
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
                {history.map((p) => (
                  <div key={p.id} className={styles.paymentRow}>
                    <div className={styles.paymentDate}>{formatDate(p.period_date)}</div>
                    <div className={styles.paymentAmounts}>
                      {p.expense ? `Vinculado a "${p.expense.description || 'gasto'}"` : 'Marcado manualmente'}
                    </div>
                    <div className={styles.paymentTotal}>{formatCurrency(p.amount)}</div>
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
