import { formatCurrency } from './formatters'

const PERIOD_LABELS = { monthly: 'Mensual', weekly: 'Semanal', yearly: 'Anual' }

export function exportBudgetCSV(budgets, monthLabel = '') {
  const header = ['Nombre', 'Período', 'Categoría', 'Límite', 'Gastado', 'Restante', '% Usado', 'Estado']
  const rows = budgets.map((b) => [
    `"${b.name}"`,
    PERIOD_LABELS[b.period] ?? b.period,
    b.category ? `"${b.category.name}"` : '—',
    b.amount.toFixed(2),
    b.spent.toFixed(2),
    b.remaining.toFixed(2),
    `${b.percent}%`,
    b.percent >= 100 ? 'Excedido' : b.percent >= 80 ? 'En riesgo' : 'Normal',
  ])

  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const filename = `presupuestos${monthLabel ? '-' + monthLabel : ''}-${new Date().toISOString().slice(0, 10)}.csv`

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printBudgets() {
  window.print()
}
