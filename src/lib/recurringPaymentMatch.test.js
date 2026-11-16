import { describe, it, expect } from 'vitest'
import { evaluatePeriod, matchExpensesToRecurringPayments, periodWindow, unlinkKey } from './recurringPaymentMatch'

const NOW = new Date(2026, 10, 15) // 15 nov 2026

const internet = { id: 'rp1', name: 'Internet', is_active: true, schedule_type: 'FIXED_DAY', due_day_of_month: 20, category_id: 'servicios', amount: 100 }
const expense = (over) => ({ id: 'e1', amount: 100, description: 'Pago del mes', date: '2026-11-10', category_id: 'servicios', ...over })
const match = (payments, ledger, expenses, opts) =>
  matchExpensesToRecurringPayments(payments, ledger, expenses, { fromDate: NOW, ...opts })

describe('periodWindow', () => {
  it('un pago mensual abarca el mes calendario completo', () => {
    expect(periodWindow(internet, NOW)).toEqual({ due: '2026-11-20', after: '2026-10-31', from: '2026-11-01', until: '2026-11-30' })
  })

  it('aunque el día de vencimiento ya haya pasado, sigue siendo este mes', () => {
    expect(periodWindow({ ...internet, due_day_of_month: 8 }, NOW)).toMatchObject({ due: '2026-11-08', from: '2026-11-01', until: '2026-11-30' })
  })

  it('respeta el día 31 en meses cortos', () => {
    expect(periodWindow({ ...internet, due_day_of_month: 31 }, NOW)).toMatchObject({ due: '2026-11-30', until: '2026-11-30' })
  })

  it('un pago manual vencido acepta gastos hasta hoy', () => {
    const manual = { ...internet, schedule_type: 'MANUAL', next_due_date: '2026-11-05' }
    expect(periodWindow(manual, NOW)).toEqual({ due: '2026-11-05', after: '2026-10-05', from: '2026-10-06', until: '2026-11-15' })
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
    expect(match([internet], [], [expense({ date: '2026-10-31' })])).toEqual([])
    expect(match([internet], [{ recurring_payment_id: 'otro', period_date: '2026-11-01', expense_id: 'e1' }], [expense()])).toEqual([])
  })

  it('no hace nada si el periodo ya está pagado o el pago está pausado', () => {
    expect(match([internet], [{ recurring_payment_id: 'rp1', period_date: '2026-11-20' }], [expense()])).toEqual([])
    expect(match([{ ...internet, is_active: false }], [], [expense()])).toEqual([])
  })

  it('un pago parcial no alcanza; con monto variable basta cualquier gasto', () => {
    expect(match([internet], [], [expense({ amount: 40 })])).toEqual([])
    expect(match([{ ...internet, amount: null }], [], [expense({ amount: 40 })])).toHaveLength(1)
  })

  it('suma varios gastos de la categoría hechos en el periodo', () => {
    const parts = [expense({ amount: 60, date: '2026-11-03' }), expense({ id: 'e2', amount: 40, date: '2026-11-12' })]
    const [m] = match([internet], [], parts)
    expect(m.amount).toBe(100)
    expect(m.expense.id).toBe('e2')
    expect(m.expenses).toHaveLength(2)
  })

  it('un pago creado hoy toma el gasto hecho antes en el mismo mes', () => {
    expect(match([internet], [], [expense({ date: '2026-11-03' })])).toHaveLength(1)
  })

  it('cuenta el gasto del mes aunque se pague después del día de vencimiento', () => {
    const seguro = { ...internet, due_day_of_month: 5, amount: 60 }
    const [m] = match([seguro], [], [expense({ amount: 60, date: '2026-11-12' })])
    expect(m.period_date).toBe('2026-11-05')
  })

  it('un pago registrado con otro día del mismo mes sigue contando', () => {
    expect(match([internet], [{ recurring_payment_id: 'rp1', period_date: '2026-11-08' }], [expense()])).toEqual([])
  })

  it('sin categoría, vincula solo por nombre', () => {
    const sinCategoria = { ...internet, category_id: null }
    expect(match([sinCategoria], [], [expense()])).toEqual([])
    expect(match([sinCategoria], [], [expense({ description: 'INTERNÉT casa' })])).toHaveLength(1)
  })

  it('si dos pagos comparten categoría, exige el nombre y no reutiliza el gasto', () => {
    const luz = { ...internet, id: 'rp2', name: 'Luz' }
    expect(match([internet, luz], [], [expense()])).toEqual([])
    const result = match([internet, luz], [], [expense({ description: 'Luz noviembre' })])
    expect(result.map((m) => m.payment.id)).toEqual(['rp2'])
  })

  it('respeta los periodos que se dejaron pendientes a mano', () => {
    expect(match([internet], [], [expense()], { excluded: new Set([unlinkKey('rp1', '2026-11-20')]) })).toEqual([])
  })

  it('evaluatePeriod explica cuánto falta y con quién comparte categoría', () => {
    const period = evaluatePeriod(internet, [internet], [expense({ amount: 40 })], { fromDate: NOW })
    expect(period).toMatchObject({ total: 40, needed: 90, satisfied: false, byCategory: true })
    const luz = { ...internet, id: 'rp2', name: 'Luz' }
    expect(evaluatePeriod(internet, [internet, luz], [expense()], { fromDate: NOW }).sharedWith).toEqual([luz])
  })

  it('en pagos manuales propone el siguiente vencimiento', () => {
    const manual = { ...internet, schedule_type: 'MANUAL', due_day_of_month: null, next_due_date: '2026-11-20' }
    expect(match([manual], [], [expense()])[0].next_due_date).toBe('2026-12-20')
  })
})
