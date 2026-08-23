export const LOAN_TYPE = {
  BORROWED: 'BORROWED',
  LENT: 'LENT',
}

// Ventana para el card "Próximos pagos" del dashboard de préstamos.
export const LOAN_UPCOMING_DAYS = 7

export const LOAN_TYPE_META = {
  [LOAN_TYPE.BORROWED]: { label: 'Me prestaron', shortLabel: 'Debo',  color: 'var(--color-danger)'  },
  [LOAN_TYPE.LENT]:     { label: 'Yo presté',    shortLabel: 'Me deben', color: 'var(--color-success)' },
}

export const LOAN_STATUS = {
  ACTIVE:    'ACTIVE',
  PAID:      'PAID',
  OVERDUE:   'OVERDUE',
  CANCELLED: 'CANCELLED',
}

const LOAN_SEVERITY = {
  [LOAN_STATUS.OVERDUE]:   3,
  [LOAN_STATUS.ACTIVE]:    1,
  [LOAN_STATUS.PAID]:      0,
  [LOAN_STATUS.CANCELLED]: 0,
}

export const LOAN_STATUS_META = {
  [LOAN_STATUS.ACTIVE]:    { label: 'Activo',     color: 'var(--color-info)'    },
  [LOAN_STATUS.PAID]:      { label: 'Pagado',      color: 'var(--color-success)' },
  [LOAN_STATUS.OVERDUE]:   { label: 'Vencido',     color: 'var(--color-danger)'  },
  [LOAN_STATUS.CANCELLED]: { label: 'Cancelado',   color: 'var(--color-text-muted)' },
}

export const INSTALLMENT_STATUS = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID:    'PAID',
  OVERDUE: 'OVERDUE',
}

export const INSTALLMENT_STATUS_META = {
  [INSTALLMENT_STATUS.PENDING]: { label: 'Pendiente', color: 'var(--color-text-muted)' },
  [INSTALLMENT_STATUS.PARTIAL]: { label: 'Parcial',   color: 'var(--color-warning)'    },
  [INSTALLMENT_STATUS.PAID]:    { label: 'Pagada',    color: 'var(--color-success)'    },
  [INSTALLMENT_STATUS.OVERDUE]: { label: 'Vencida',   color: 'var(--color-danger)'     },
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function toCents(value) {
  return Math.round(Number(value) * 100)
}

/**
 * El estado OVERDUE se calcula en el momento (no se persiste), igual que
 * BUDGET_STATUS en budgetStatus.js: evita depender de un cron para
 * mantenerlo fresco, algo que esta app no tiene.
 */
export function getEffectiveLoanStatus(loan) {
  if (loan.status === LOAN_STATUS.PAID || loan.status === LOAN_STATUS.CANCELLED) return loan.status
  if (loan.due_date < todayISO() && toCents(loan.remaining_principal) > 0) return LOAN_STATUS.OVERDUE
  return LOAN_STATUS.ACTIVE
}

export function getEffectiveInstallmentStatus(installment) {
  if (installment.status === INSTALLMENT_STATUS.PAID) return INSTALLMENT_STATUS.PAID
  const isPastDue = installment.due_date < todayISO()
  const hasPartial = toCents(installment.paid_amount) > 0
  if (isPastDue) return INSTALLMENT_STATUS.OVERDUE
  return hasPartial ? INSTALLMENT_STATUS.PARTIAL : INSTALLMENT_STATUS.PENDING
}

export function loanStatusSeverity(status) {
  return LOAN_SEVERITY[status] ?? 0
}

export function getLoanProgress(loan) {
  const principal = Number(loan.principal_amount)
  if (principal <= 0) return 0
  const paid = principal - Number(loan.remaining_principal)
  return Math.min(Math.round((paid / principal) * 100), 100)
}

export function getNextInstallment(installments = []) {
  return installments
    .filter((i) => getEffectiveInstallmentStatus(i) !== INSTALLMENT_STATUS.PAID)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null
}

/**
 * Cuánto cambiaría el saldo de una cuenta si todos sus préstamos ACTIVOS
 * se liquidaran hoy: lo que te deben (LENT) suma, lo que debes (BORROWED)
 * resta. Se usa para mostrar el "monto potencial" de un objetivo vinculado
 * a esa cuenta si te devolvieran/pagaras todo lo pendiente.
 */
export function getAccountLoanImpact(accountId, loans = []) {
  return loans
    .filter((l) => l.account_id === accountId && l.status === LOAN_STATUS.ACTIVE)
    .reduce((acc, l) => {
      const remaining = Number(l.remaining_principal) + Number(l.remaining_interest)
      return acc + (l.type === LOAN_TYPE.LENT ? remaining : -remaining)
    }, 0)
}
