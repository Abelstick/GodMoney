import { useMemo, useState } from 'react'
import { SegmentedControl, Chip, TextInput } from '@mantine/core'
import { IconHeartHandshake, IconFileText, IconSearch } from '@tabler/icons-react'
import { useLoans } from '@/hooks/useLoans'
import { Button } from '@/components/ui/Button/Button'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { Modal } from '@/components/common/Modal/Modal'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { getEffectiveLoanStatus, getLoanDisplayStatus, LOAN_TYPE } from '@/lib/loanStatus'
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

// Filtros por estado visible (getLoanDisplayStatus): al día / por vencer / vencido.
const FILTERS = [
  { value: 'all',     label: 'Todos'      },
  { value: 'ok',      label: 'Al día'     },
  { value: 'warning', label: 'Por vencer' },
  { value: 'danger',  label: 'Vencidos'   },
  { value: 'PAID',    label: 'Pagados'    },
]

function matchesFilter(loan, nextInstallment, filter) {
  if (filter === 'all') return true
  const status = getEffectiveLoanStatus(loan)
  if (filter === 'PAID') return status === 'PAID'
  if (status === 'PAID' || status === 'CANCELLED') return false
  return getLoanDisplayStatus(loan, nextInstallment).tone === filter
}

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
      .filter((l) => matchesFilter(l, nextInstallmentByLoan[l.id], statusFilter))
      .filter((l) => !term || l.person_name.toLowerCase().includes(term) || (l.description ?? '').toLowerCase().includes(term))
  }, [loans, tab, statusFilter, search, nextInstallmentByLoan])

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
    <div>
      <PageHeader
        title="Préstamos y deudas"
        subtitle="Lo que te deben, lo que debes y qué vence pronto"
        actions={<Button onClick={() => setCreateOpen(true)}>+ Nuevo préstamo</Button>}
      />

      <LoanSummary loans={loans} pendingInstallments={pendingInstallments} activeTab={tab} />
      <LoanAlerts />

      <SegmentedControl
        className={styles.tabs}
        fullWidth
        value={tab}
        onChange={setTab}
        data={TABS.map((t) => ({ value: t.value, label: `${t.label} (${loans.filter((l) => l.type === t.value).length})` }))}
        aria-label="Tipo de préstamo"
      />

      <div className={styles.toolbar}>
        <Chip.Group value={statusFilter} onChange={setStatusFilter}>
          <div className={styles.filters} role="radiogroup" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <Chip key={f.value} value={f.value} size="sm" variant="light" radius="sm">{f.label}</Chip>
            ))}
          </div>
        </Chip.Group>
        <TextInput
          className={styles.search}
          aria-label="Buscar préstamos"
          placeholder="Buscar por persona o descripción…"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {loading ? (
        <div className={styles.skeletonWrap}>
          <Skeleton className={styles.summarySkeleton} />
          <Skeleton className={styles.alertsSkeleton} />
          <div className={styles.grid}>
            <Skeleton className={styles.cardSkeleton} />
            <Skeleton className={styles.cardSkeleton} />
            <Skeleton className={styles.cardSkeleton} />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === LOAN_TYPE.LENT ? <IconHeartHandshake size={32} stroke={1.5} /> : <IconFileText size={32} stroke={1.5} />}
          title={statusFilter !== 'all' || search
            ? 'Ningún préstamo coincide con el filtro'
            : tab === LOAN_TYPE.LENT ? 'Nadie te debe todavía' : 'No tienes préstamos pendientes'}
          description={statusFilter !== 'all' || search
            ? 'Prueba con otro estado o borra la búsqueda.'
            : 'Registra un préstamo y te avisaremos antes de cada vencimiento.'}
          action={statusFilter !== 'all' || search
            ? <Button variant="secondary" onClick={() => { setStatusFilter('all'); setSearch('') }}>Quitar filtros</Button>
            : <Button onClick={() => setCreateOpen(true)}>Crear préstamo</Button>}
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
        <Modal isOpen={!!payingLoan} onClose={() => setPayingLoanId(null)} title={payingLoan.type === LOAN_TYPE.LENT ? "Registrar cobro" : "Registrar pago"}>
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
