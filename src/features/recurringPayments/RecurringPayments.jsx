import { useMemo, useState } from 'react'
import { useRecurringPayments } from '@/hooks/useRecurringPayments'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { getEffectiveRecurringStatus } from '@/lib/recurringPaymentStatus'
import { RecurringPaymentAlerts } from './components/RecurringPaymentAlerts'
import { RecurringPaymentCard } from './components/RecurringPaymentCard'
import { RecurringPaymentForm } from './components/RecurringPaymentForm'
import { RecurringPaymentDetail } from './components/RecurringPaymentDetail'
import { MarkPaidModal } from './components/MarkPaidModal'
import styles from './RecurringPayments.module.css'

const FILTERS = [
  { value: 'all',        label: 'Todos'    },
  { value: 'OVERDUE',    label: 'Vencidos' },
  { value: 'DUE_SOON',   label: 'Por vencer' },
  { value: 'UP_TO_DATE', label: 'Al día'   },
  { value: 'PAUSED',     label: 'Pausados' },
]

export function RecurringPayments() {
  const { recurringPayments, loading, ledger, addRecurringPayment, payRecurringPayment } = useRecurringPayments()

  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [payingId, setPayingId] = useState(null)
  const [payingLoading, setPayingLoading] = useState(false)

  const detailPayment = recurringPayments.find((p) => p.id === detailId) ?? null
  const payingPayment = recurringPayments.find((p) => p.id === payingId) ?? null

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return recurringPayments
    return recurringPayments.filter((p) => getEffectiveRecurringStatus(p, ledger) === statusFilter)
  }, [recurringPayments, ledger, statusFilter])

  async function handleCreate(payload) {
    setCreating(true)
    try {
      await addRecurringPayment(payload)
      setCreateOpen(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleQuickPay(payload) {
    setPayingLoading(true)
    try {
      await payRecurringPayment(payload)
      setPayingId(null)
    } finally {
      setPayingLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pagos recurrentes</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Nuevo pago recurrente</Button>
      </div>

      <RecurringPaymentAlerts />

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterChip} ${statusFilter === f.value ? styles.filterChipActive : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Sin pagos recurrentes registrados"
          description="Agrega tus pagos obligatorios (seguro, internet, servicios) para que la app te avise antes de que venzan"
          action={<Button onClick={() => setCreateOpen(true)}>Crear pago recurrente</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((payment) => (
            <RecurringPaymentCard
              key={payment.id}
              payment={payment}
              ledger={ledger}
              onOpenDetail={(p) => setDetailId(p.id)}
              onMarkPaid={(p) => setPayingId(p.id)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo pago recurrente">
        <RecurringPaymentForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={creating} />
      </Modal>

      <RecurringPaymentDetail payment={detailPayment} isOpen={!!detailPayment} onClose={() => setDetailId(null)} />

      {payingPayment && (
        <Modal isOpen={!!payingPayment} onClose={() => setPayingId(null)} title="Marcar como pagado">
          <MarkPaidModal payment={payingPayment} onSubmit={handleQuickPay} onCancel={() => setPayingId(null)} loading={payingLoading} />
        </Modal>
      )}
    </div>
  )
}
