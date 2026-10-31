import { BUDGET_STATUS, getBudgetAlertMessage } from './budgetStatus'

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

// Devuelve { top, total } — `top` es null si no hay nada que avisar.
export function getPriorityAlert({ loanAlerts = [], recurringAlerts = [], budgets = [] }) {
  const candidates = [
    ...loanAlerts.map((a) => fromStoredAlert(a, 'loan')),
    ...recurringAlerts.map((a) => fromStoredAlert(a, 'recurring')),
    ...budgets.map(fromBudget),
  ].filter(Boolean)

  candidates.sort((a, b) => b.rank - a.rank || b.order - a.order)
  return { top: candidates[0] ?? null, total: candidates.length }
}
