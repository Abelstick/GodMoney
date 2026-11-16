import { describe, it, expect } from 'vitest'
import { matchExpensesToRecurringPayments, periodWindow, unlinkKey } from './recurringPaymentMatch'

const NOW = new Date(2026, 10, 15) // 15 nov 2026

const internet = { id: 'rp1', name: 'Internet', is_active: true, schedule_type: 'FIXED_DAY', due_day_of_month: 20, category_id: 'servicios', amount: 100 }
const expense = (over) => ({ id: 'e1', amount: 100, description: 'Pago del mes', date: '2026-11-10', category_id: 'servicios', ...over })
const match = (payments, ledger, expenses, opts) =>
  matchExpensesToRecurringPayments(payments, ledger, expenses, { fromDate: NOW, ...opts })

describe('periodWindow', () => {
  it('va del vencimiento anterior al vigente', () => {
    expect(periodWindow(internet, NOW)).toEqual({ due: '2026-11-20', after: '2026-10-20', until: '2026-11-20' })
  })

  it('respeta el día 31 en meses cortos', () => {
    expect(periodWindow({ ...internet, due_day_of_month: 31 }, NOW)).toMatchObject({ due: '2026-11-30', after: '2026-10-31' })
  })

  it('un pago manual vencido acepta gastos hasta hoy', () => {
    const manual = { ...internet, schedule_type: 'MANUAL', next_due_date: '2026-11-05' }
    expect(periodWindow(manual, NOW)).toEqual({ due: '2026-11-05', after: '2026-10-05', until: '2026-11-15' })
  })
})

describe('matchExpensesToRecurringPayments', () => {
  it('vincula un gasto de la categoría del pago dentro del periodo', () => {
    const [m] = match([internet], [], [expense()])
    expect(m).toMatchObject({ period_date: '2026-11-20', next_due_date: null })
    expect(m.expense.id).toBe('e1')
  })

  it('ignora gastos de otra categoría, de otro periodo o ya vinculados', () => {
    expect(match([internet], [], [expense({ category_id: 'comida' })])).toEqual([])
    expect(match([internet], [], [expense({ date: '2026-10-20' })])).toEqual([])
    expect(match([internet], [{ recurring_payment_id: 'otro', period_date: '2026-11-01', expense_id: 'e1' }], [expense()])).toEqual([])
  })

  it('no hace nada si el periodo ya está pagado o el pago está pausado', () => {
    expect(match([internet], [{ recurring_payment_id: 'rp1', period_date: '2026-11-20' }], [expense()])).toEqual([])
    expect(match([{ ...internet, is_active: false }], [], [expense()])).toEqual([])
  })

  it('solo por categoría exige un monto parecido; por nombre no', () => {
    expect(match([internet], [], [expense({ amount: 300 })])).toEqual([])
    expect(match([internet], [], [expense({ amount: 300, description: 'INTERNÉT fibra' })])).toHaveLength(1)
    expect(match([{ ...internet, amount: null }], [], [expense({ amount: 300 })])).toHaveLength(1)
  })

  it('sin categoría, vincula solo por nombre', () => {
    const sinCategoria = { ...internet, category_id: null }
    expect(match([sinCategoria], [], [expense()])).toEqual([])
    expect(match([sinCategoria], [], [expense({ description: 'internet casa' })])).toHaveLength(1)
  })

  it('si dos pagos comparten categoría, exige el nombre y no reutiliza el gasto', () => {
    const luz = { ...internet, id: 'rp2', name: 'Luz' }
    expect(match([internet, luz], [], [expense()])).toEqual([])
    const result = match([internet, luz], [], [expense({ description: 'Luz noviembre' })])
    expect(result.map((m) => m.payment.id)).toEqual(['rp2'])
  })

  it('prefiere el gasto que nombra al pago', () => {
    const [m] = match([internet], [], [expense(), expense({ id: 'e2', amount: 110, description: 'Internet' })])
    expect(m.expense.id).toBe('e2')
  })

  it('respeta los gastos desvinculados a mano', () => {
    expect(match([internet], [], [expense()], { excluded: new Set([unlinkKey('rp1', 'e1')]) })).toEqual([])
  })

  it('en pagos manuales propone el siguiente vencimiento', () => {
    const manual = { ...internet, schedule_type: 'MANUAL', due_day_of_month: null, next_due_date: '2026-11-20' }
    expect(match([manual], [], [expense()])[0].next_due_date).toBe('2026-12-20')
  })
})
