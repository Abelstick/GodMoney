import { formatCurrency } from './formatters'

export const BUDGET_STATUS = {
  NORMAL:   'normal',
  WARNING:  'warning',
  REACHED:  'reached',
  EXCEEDED: 'exceeded',
}

const SEVERITY = {
  [BUDGET_STATUS.EXCEEDED]: 3,
  [BUDGET_STATUS.REACHED]:  2,
  [BUDGET_STATUS.WARNING]:  1,
  [BUDGET_STATUS.NORMAL]:   0,
}

function toCents(value) {
  return Math.round(Number(value) * 100)
}

// Clasifica un presupuesto comparando en centavos para evitar errores de precisión decimal (0.1 + 0.2 ...).
export function getBudgetStatus(spent, amount) {
  const amountCents = toCents(amount)
  if (amountCents <= 0) return BUDGET_STATUS.NORMAL

  const spentCents = toCents(spent)
  if (spentCents > amountCents)  return BUDGET_STATUS.EXCEEDED
  if (spentCents === amountCents) return BUDGET_STATUS.REACHED

  const percent = (spentCents / amountCents) * 100
  return percent >= 80 ? BUDGET_STATUS.WARNING : BUDGET_STATUS.NORMAL
}

export function budgetStatusSeverity(status) {
  return SEVERITY[status] ?? 0
}

export const BUDGET_STATUS_META = {
  [BUDGET_STATUS.NORMAL]:   { label: 'Normal',           color: 'var(--color-text-muted)' },
  [BUDGET_STATUS.WARNING]:  { label: 'Cerca del límite', color: 'var(--color-warning)'     },
  [BUDGET_STATUS.REACHED]:  { label: 'Alcanzado',        color: 'var(--color-info)'        },
  [BUDGET_STATUS.EXCEEDED]: { label: 'Excedido',         color: 'var(--color-danger)'      },
}

// Mensaje descriptivo para el panel de alertas. Siempre incluye el límite del presupuesto.
export function getBudgetAlertMessage(budget) {
  switch (budget.status) {
    case BUDGET_STATUS.EXCEEDED:
      return `Excediste tu límite de ${formatCurrency(budget.amount)} — gastaste ${formatCurrency(budget.overBy)} de más`
    case BUDGET_STATUS.REACHED:
      return `Alcanzaste tu límite de ${formatCurrency(budget.amount)}`
    default:
      return `${budget.percent}% usado de ${formatCurrency(budget.amount)} — quedan ${formatCurrency(budget.remaining)}`
  }
}

export function getBudgetBadgeLabel(budget) {
  if (budget.status === BUDGET_STATUS.EXCEEDED) return 'Excedido'
  if (budget.status === BUDGET_STATUS.REACHED)  return 'Alcanzado'
  return `${budget.percent}%`
}
