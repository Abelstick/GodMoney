import { describe, it, expect } from 'vitest'
import { getPriorityAlert } from './priorityAlert'

const loan = (id, severity, created_at = '2026-10-01', is_read = false) =>
  ({ id, severity, message: `loan ${id}`, created_at, is_read })

const budget = (id, status, percent) =>
  ({ id, name: `B${id}`, status, percent, amount: 100, spent: percent, remaining: 0, overBy: 0 })

describe('getPriorityAlert', () => {
  it('no devuelve nada si no hay alertas relevantes', () => {
    const r = getPriorityAlert({ loanAlerts: [loan(1, 'info'), loan(2, 'danger', '2026-10-01', true)] })
    expect(r).toEqual({ top: null, total: 0 })
  })

  it('prioriza un pago vencido sobre un presupuesto excedido', () => {
    const r = getPriorityAlert({
      budgets: [budget(1, 'exceeded', 130)],
      recurringAlerts: [loan(9, 'danger')],
    })
    expect(r.top.source).toBe('recurring')
    expect(r.top.status).toBe('Vencido')
    expect(r.total).toBe(2)
  })

  it('prioriza un presupuesto excedido sobre un pago por vencer', () => {
    const r = getPriorityAlert({ loanAlerts: [loan(1, 'warning')], budgets: [budget(2, 'exceeded', 120)] })
    expect(r.top.source).toBe('budget')
    expect(r.top.tone).toBe('danger')
  })

  it('dentro del mismo nivel elige la alerta más reciente', () => {
    const r = getPriorityAlert({ loanAlerts: [loan(1, 'danger', '2026-09-01'), loan(2, 'danger', '2026-10-15')] })
    expect(r.top.id).toBe(2)
  })

  it('ignora presupuestos en estado normal', () => {
    const r = getPriorityAlert({ budgets: [budget(1, 'normal', 40), budget(2, 'warning', 85)] })
    expect(r.top.id).toBe(2)
    expect(r.top.status).toBe('Cerca del límite')
    expect(r.total).toBe(1)
  })
})
