import { useMemo, useState } from 'react'
import { useLoans } from '@/hooks/useLoans'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { getEffectiveLoanStatus, LOAN_TYPE } from '@/lib/loanStatus'
import { LoanSummary } from './components/LoanSummary'
import { LoanAlerts } from './components/LoanAlerts'
import { LoanCard } from './components/LoanCard'
import { LoanForm } from './components/LoanForm'
import { LoanDetail } from './components/LoanDetail'
import { LoanPaymentForm } from './components/LoanPaymentForm'
import styles from './Loans.module.css'

const TABS = [
  { value: LOAN_TYPE.LENT,     label: 'Me deben' },
  { value: LOAN_TYPE.BORROWED, label: 'Yo debo'   },
]

const FILTERS = [
  { value: 'all',       label: 'Todos'    },
  { value: 'ACTIVE',    label: 'Activos'  },
  { value: 'PAID',      label: 'Pagados'  },
  { value: 'OVERDUE',   label: 'Vencidos' },
]

export function Loans() {
  const {
    loans, loading, pendingInstallments,
    addLoan, registerLoanPayment,
  } = useLoans()

  const [tab, setTab] = useState(LOAN_TYPE.LENT)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [detailLoanId, setDetailLoanId] = useState(null)
  const [payingLoanId, setPayingLoanId] = useState(null)
  const [payingLoading, setPayingLoading] = useState(false)

  // Derivados del array vivo del store (no una copia) para que el detalle
  // se actualice solo tras registrar un pago sin cerrar el modal.
  const detailLoan = loans.find((l) => l.id === detailLoanId) ?? null
  const payingLoan = loans.find((l) => l.id === payingLoanId) ?? null

  const nextInstallmentByLoan = useMemo(() => {
    const map = {}
    for (const inst of pendingInstallments) {
      const current = map[inst.loan_id]
      if (!current || inst.due_date < current.due_date) map[inst.loan_id] = inst
    }
    return map
  }, [pendingInstallments])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return loans
      .filter((l) => l.type === tab)
      .filter((l) => statusFilter === 'all' || getEffectiveLoanStatus(l) === statusFilter)
      .filter((l) => !term || l.person_name.toLowerCase().includes(term) || (l.description ?? '').toLowerCase().includes(term))
  }, [loans, tab, statusFilter, search])

  async function handleCreate(payload) {
    setCreating(true)
    try {
      await addLoan(payload)
      setCreateOpen(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleQuickPayment(payload) {
    setPayingLoading(true)
    try {
      await registerLoanPayment(payload)
      setPayingLoanId(null)
    } finally {
      setPayingLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Préstamos y deudas</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Nuevo préstamo</Button>
      </div>

      <LoanSummary loans={loans} pendingInstallments={pendingInstallments} activeTab={tab} />
      <LoanAlerts />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`${styles.tab} ${tab === t.value ? styles.active : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label} ({loans.filter((l) => l.type === t.value).length})
          </button>
        ))}
      </div>

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
        <input
          className={styles.search}
          placeholder="Buscar por persona o descripción…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === LOAN_TYPE.LENT ? '🤝' : '📄'}
          title={tab === LOAN_TYPE.LENT ? 'Nadie te debe todavía' : 'No tienes préstamos pendientes'}
          description="Registra un préstamo para empezar a hacer seguimiento"
          action={<Button onClick={() => setCreateOpen(true)}>Crear préstamo</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              nextInstallment={nextInstallmentByLoan[loan.id]}
              onOpenDetail={(l) => setDetailLoanId(l.id)}
              onRegisterPayment={(l) => setPayingLoanId(l.id)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo préstamo">
        <LoanForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={creating} existingLoans={loans} />
      </Modal>

      <LoanDetail loan={detailLoan} isOpen={!!detailLoan} onClose={() => setDetailLoanId(null)} />

      {payingLoan && (
        <Modal isOpen={!!payingLoan} onClose={() => setPayingLoanId(null)} title="Registrar pago">
          <LoanPaymentForm
            loan={payingLoan}
            pendingInstallments={pendingInstallments.filter((i) => i.loan_id === payingLoan.id)}
            onSubmit={handleQuickPayment}
            onCancel={() => setPayingLoanId(null)}
            loading={payingLoading}
          />
        </Modal>
      )}
    </div>
  )
}
