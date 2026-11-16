import { describe, it, expect } from 'vitest'
import { autoAllocate, checkAllocation, toggleDebt } from './repayAllocation'

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

describe('toggleDebt', () => {
  it('al marcar asigna lo que queda por repartir, hasta el saldo de la deuda', () => {
    expect(toggleDebt(DEBTS, { b: '20' }, 50, 'c', true)).toEqual({ b: '20', c: '30' })
    expect(toggleDebt(DEBTS, { c: '30' }, 35, 'b', true)).toEqual({ c: '30', b: '5' })
  })

  it('si no queda monto libre propone la deuda completa', () => {
    expect(toggleDebt(DEBTS, { c: '30' }, 30, 'a', true)).toEqual({ c: '30', a: '10' })
  })

  it('al desmarcar la deja vacía', () => {
    expect(toggleDebt(DEBTS, { a: '10', b: '20' }, 30, 'a', false)).toEqual({ a: '', b: '20' })
  })
})
