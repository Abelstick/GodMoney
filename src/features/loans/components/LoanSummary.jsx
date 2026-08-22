import { useMemo } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { LOAN_TYPE, LOAN_UPCOMING_DAYS } from '@/lib/loanStatus'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import styles from './LoanSummary.module.css'

function isActiveLoan(loan) {
  return loan.status !== 'CANCELLED' && loan.status !== 'PAID'
}

export function LoanSummary({ loans, pendingInstallments, activeTab }) {
  const totals = useMemo(() => {
    const active = loans.filter(isActiveLoan)
    const lent = active.filter((l) => l.type === LOAN_TYPE.LENT)
    const borrowed = active.filter((l) => l.type === LOAN_TYPE.BORROWED)

    const receivable = lent.reduce((acc, l) => acc + Number(l.remaining_principal) + Number(l.remaining_interest), 0)
    const payable     = borrowed.reduce((acc, l) => acc + Number(l.remaining_principal) + Number(l.remaining_interest), 0)
    const interestReceivable = lent.reduce((acc, l) => acc + Number(l.remaining_interest), 0)
    const interestPayable    = borrowed.reduce((acc, l) => acc + Number(l.remaining_interest), 0)

    let upcoming = 0
    let overdue = 0
    for (const inst of pendingInstallments) {
      const pending = Number(inst.total_amount) - Number(inst.paid_amount)
      const days = differenceInCalendarDays(parseISO(inst.due_date), new Date())
      if (days < 0) overdue += pending
      else if (days <= LOAN_UPCOMING_DAYS) upcoming += pending
    }

    const tabLoans = active.filter((l) => l.type === activeTab)
    const originalTotal = tabLoans.reduce((acc, l) => acc + Number(l.principal_amount), 0)
    const paidTotal = tabLoans.reduce((acc, l) => acc + (Number(l.principal_amount) - Number(l.remaining_principal)), 0)
    const progressPercent = originalTotal > 0 ? Math.round((paidTotal / originalTotal) * 100) : 0

    return { receivable, payable, interestReceivable, interestPayable, upcoming, overdue, originalTotal, paidTotal, progressPercent }
  }, [loans, pendingInstallments, activeTab])

  return (
    <div>
      <div className={styles.grid}>
        <StatCard label="Me deben" amount={formatCurrency(totals.receivable)} icon="💰" iconBg="rgba(16,185,129,0.12)" />
        <StatCard label="Yo debo"  amount={formatCurrency(totals.payable)}    icon="💸" iconBg="rgba(239,68,68,0.12)" />
        <StatCard label="Próximos pagos" amount={formatCurrency(totals.upcoming)} icon="📅" iconBg="rgba(245,158,11,0.12)" />
        <StatCard label="Vencidos" amount={formatCurrency(totals.overdue)} icon="⚠️" iconBg="rgba(239,68,68,0.12)" />
        <StatCard label="Intereses por cobrar" amount={formatCurrency(totals.interestReceivable)} icon="📈" iconBg="rgba(34,197,94,0.12)" />
        <StatCard label="Intereses por pagar"  amount={formatCurrency(totals.interestPayable)}    icon="📉" iconBg="rgba(249,115,22,0.12)" />
      </div>

      {totals.originalTotal > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <ProgressBar
            percent={totals.progressPercent}
            leftLabel={`${formatCurrency(totals.paidTotal)} de ${formatCurrency(totals.originalTotal)} ${activeTab === LOAN_TYPE.LENT ? 'cobrados' : 'pagados'}`}
            rightLabel={`${totals.progressPercent}%`}
          />
        </div>
      )}
    </div>
  )
}
