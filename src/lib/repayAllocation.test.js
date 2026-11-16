import { describe, it, expect } from 'vitest'
import { autoAllocate, checkAllocation, toggleDebt, fitToBudget } from './repayAllocation'

// Tres deudas de 10, 20 y 30 (la más antigua primero).
const DEBTS = [
  { id: 'a', pending: 10 },
  { id: 'b', pending: 20 },
  { id: 'c', pending: 30 },
]

describe('autoAllocate', () => {
  it('cubre la más antigua primero y deja parcial la última que alcanza', () => {
    expect(autoAllocate(DEBTS, 50)).toEqual({ a: 10, b: 20, c: 20 })
  })

  it('no asigna más de lo que falta aunque sobre monto', () => {
    expect(autoAllocate(DEBTS, 100)).toEqual({ a: 10, b: 20, c: 30 })
  })

  it('con monto vacío deja todo en cero', () => {
    expect(autoAllocate(DEBTS, '')).toEqual({ a: 0, b: 0, c: 0 })
  })
})

describe('checkAllocation', () => {
  it('acepta un reparto a mano que suma el monto', () => {
    const r = checkAllocation(DEBTS, { a: '', b: '20', c: '30' }, 50)
    expect(r.valid).toBe(true)
    expect(r.allocations).toEqual([
      { withdrawal_id: 'b', amount: 20 },
      { withdrawal_id: 'c', amount: 30 },
    ])
    expect(r.assigned).toBe(50)
    expect(r.extra).toBe(0)
  })

  it('avisa cuánto falta asignar si quedan deudas con saldo', () => {
    const r = checkAllocation(DEBTS, { a: '10', b: '20' }, 50)
    expect(r.valid).toBe(false)
    expect(r.missing).toBe(20)
  })

  it('avisa si se asignó más que el monto', () => {
    const r = checkAllocation(DEBTS, { a: '10', b: '20', c: '30' }, 50)
    expect(r.valid).toBe(false)
    expect(r.excess).toBe(10)
  })

  it('marca la deuda a la que se le asignó más de lo que falta', () => {
    const r = checkAllocation(DEBTS, { a: '15' }, 15)
    expect(r.valid).toBe(false)
    expect(r.overIds).toEqual(['a'])
  })

  it('el sobrante es aporte extra solo si todas quedan cubiertas', () => {
    const r = checkAllocation(DEBTS, { a: '10', b: '20', c: '30' }, 75)
    expect(r.valid).toBe(true)
    expect(r.extra).toBe(15)
  })

  it('suma exacto con céntimos', () => {
    const debts = [{ id: 'x', pending: 0.1 }, { id: 'y', pending: 0.2 }]
    const r = checkAllocation(debts, { x: '0.1', y: '0.2' }, 0.3)
    expect(r.valid).toBe(true)
    expect(r.assigned).toBe(0.3)
  })

  it('no es válido sin monto', () => {
    expect(checkAllocation(DEBTS, {}, '').valid).toBe(false)
  })
})

describe('fitToBudget', () => {
  it('deja parcial la deuda marcada cuando el saldo no alcanza', () => {
    const debts = [{ id: 'balanza', pending: 100 }, { id: 'otra', pending: 40 }]
    expect(fitToBudget(debts, { balanza: '100' }, 1.97)).toEqual({ balanza: '1.97', otra: '' })
  })

  it('cubre las marcadas en orden hasta agotar el saldo', () => {
    expect(fitToBudget(DEBTS, { a: '10', b: '20', c: '30' }, 35)).toEqual({ a: '10', b: '20', c: '5' })
  })

  it('no toca un reparto que ya cabe', () => {
    expect(fitToBudget(DEBTS, { b: '20' }, 50)).toEqual({ a: '', b: '20', c: '' })
  })

  it('sin saldo no queda nada marcado', () => {
    expect(fitToBudget(DEBTS, { a: '10' }, 0)).toEqual({ a: '', b: '', c: '' })
  })
})

describe('toggleDebt', () => {
  it('al marcar propone la deuda completa', () => {
    expect(toggleDebt(DEBTS, { b: '20' }, 'c', true)).toEqual({ b: '20', c: '30' })
  })

  it('al desmarcar la deja vacía', () => {
    expect(toggleDebt(DEBTS, { a: '10', b: '20' }, 'a', false)).toEqual({ a: '', b: '20' })
  })

  it('el total de las marcadas es lo que se repone', () => {
    const values = toggleDebt(DEBTS, toggleDebt(DEBTS, {}, 'b', true), 'c', true)
    const total = checkAllocation(DEBTS, values, 0).assigned
    expect(total).toBe(50)
    expect(checkAllocation(DEBTS, values, total).valid).toBe(true)
  })
})
