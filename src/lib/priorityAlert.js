import { BUDGET_STATUS, getBudgetAlertMessage } from './budgetStatus'
import { formatCurrency, formatDate, toInputDate } from './formatters'

// Elige la alerta más importante para mostrar arriba del dashboard.
// Orden: pago vencido > presupuesto excedido > pago por vencer > presupuesto
// al límite / cerca del límite. Dentro de un mismo nivel gana la alerta más
// reciente (pagos) o el presupuesto más consumido.
const RANK = {
  overdue:        4,
  budgetExceeded: 3,
  dueSoon:        2,
  budgetWarning:  1,
}

const SOURCES = {
  loan:      { label: 'Préstamos',         to: '/prestamos' },
  recurring: { label: 'Pagos recurrentes', to: '/pagos-recurrentes' },
}

function fromStoredAlert(alert, source) {
  if (alert.is_read) return null
  if (alert.severity !== 'danger' && alert.severity !== 'warning') return null
  const overdue = alert.severity === 'danger'
  return {
    key:     `${source}-${alert.id}`,
    id:      alert.id,
    source,
    rank:    overdue ? RANK.overdue : RANK.dueSoon,
    tone:    overdue ? 'danger' : 'warning',
    status:  overdue ? 'Vencido' : 'Por vencer',
    title:   alert.message,
    context: SOURCES[source].label,
    to:      SOURCES[source].to,
    order:   new Date(alert.created_at ?? 0).getTime(),
  }
}

function fromBudget(budget) {
  const exceeded = budget.status === BUDGET_STATUS.EXCEEDED
  const near = budget.status === BUDGET_STATUS.WARNING || budget.status === BUDGET_STATUS.REACHED
  if (!exceeded && !near) return null
  return {
    key:     `budget-${budget.id}`,
    id:      budget.id,
    source:  'budget',
    rank:    exceeded ? RANK.budgetExceeded : RANK.budgetWarning,
    tone:    exceeded ? 'danger' : 'warning',
    status:  exceeded ? 'Excedido' : budget.status === BUDGET_STATUS.REACHED ? 'Al límite' : 'Cerca del límite',
    title:   getBudgetAlertMessage(budget),
    context: `Presupuesto · ${budget.name}`,
    to:      '/presupuestos',
    order:   budget.percent ?? 0,
  }
}

// Monto por reponer cuya fecha objetivo ya pasó. Es una deuda contigo mismo:
// avisa, pero por debajo de pagos y presupuestos reales.
function fromSavingsDebt(debt, today) {
  if (debt.status !== 'OPEN' || !debt.target_date || debt.target_date >= today) return null
  const pending = Math.max(0, Number(debt.amount) - Number(debt.repaid_amount))
  if (pending <= 0) return null
  return {
    key:     `savings-${debt.id}`,
    id:      debt.id,
    source:  'savings',
    rank:    RANK.budgetWarning,
    tone:    'warning',
    status:  'Sin reponer',
    title:   `Te propusiste reponer ${formatCurrency(pending)} a ${debt.savings_account?.name ?? 'tu cuenta'} antes del ${formatDate(debt.target_date)}`,
    context: 'Por reponer',
    to:      '/cuentas',
    order:   -new Date(debt.target_date).getTime(), // la más antigua primero
  }
}

// Devuelve { top, total } — `top` es null si no hay nada que avisar.
export function getPriorityAlert({ loanAlerts = [], recurringAlerts = [], budgets = [], savingsDebts = [], today = toInputDate(new Date()) }) {
  const candidates = [
    ...loanAlerts.map((a) => fromStoredAlert(a, 'loan')),
    ...recurringAlerts.map((a) => fromStoredAlert(a, 'recurring')),
    ...budgets.map(fromBudget),
    ...savingsDebts.map((d) => fromSavingsDebt(d, today)),
  ].filter(Boolean)

  candidates.sort((a, b) => b.rank - a.rank || b.order - a.order)
  return { top: candidates[0] ?? null, total: candidates.length }
}
