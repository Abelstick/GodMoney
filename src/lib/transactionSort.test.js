import { describe, it, expect } from 'vitest'
import { sortTransactions, getSortOptions } from './transactionSort'

const rows = [
  { id: 'a', date: '2026-10-05', amount: '30.00', description: 'Cena',    created_at: '2026-10-05T20:00:00Z' },
  { id: 'b', date: '2026-10-01', amount: '10.50', description: 'almuerzo', created_at: '2026-10-09T08:00:00Z' },
  { id: 'c', date: '2026-10-05', amount: '99.90', description: '',          category: { name: 'Bencina' }, created_at: '2026-10-05T09:00:00Z' },
]
const ids = (list) => list.map((r) => r.id)

describe('sortTransactions', () => {
  it('ordena por fecha del movimiento y desempata por fecha de registro', () => {
    expect(ids(sortTransactions(rows, 'date', 'asc'))).toEqual(['b', 'c', 'a'])
    expect(ids(sortTransactions(rows, 'date', 'desc'))).toEqual(['a', 'c', 'b'])
  })

  it('ordena por fecha de registro', () => {
    expect(ids(sortTransactions(rows, 'created_at', 'asc'))).toEqual(['c', 'a', 'b'])
    expect(ids(sortTransactions(rows, 'created_at', 'desc'))).toEqual(['b', 'a', 'c'])
  })

  it('ordena por monto como número (los montos llegan como texto)', () => {
    expect(ids(sortTransactions(rows, 'amount', 'asc'))).toEqual(['b', 'a', 'c'])
    expect(ids(sortTransactions(rows, 'amount', 'desc'))).toEqual(['c', 'a', 'b'])
  })

  it('ordena alfabéticamente sin distinguir mayúsculas y usa la categoría si no hay descripción', () => {
    // almuerzo (b) < bencina (categoría de c) < cena (a)
    expect(ids(sortTransactions(rows, 'alpha', 'asc'))).toEqual(['b', 'c', 'a'])
  })

  it('no modifica la lista original', () => {
    const copy = [...rows]
    sortTransactions(rows, 'amount', 'asc')
    expect(rows).toEqual(copy)
  })

  it('con un criterio desconocido ordena por fecha de registro', () => {
    expect(ids(sortTransactions(rows, 'otro', 'asc'))).toEqual(ids(sortTransactions(rows, 'created_at', 'asc')))
  })
})

describe('getSortOptions', () => {
  it('ofrece la fecha del movimiento con el sustantivo indicado, primero', () => {
    const [first] = getSortOptions('gasto')
    expect(first).toEqual({ value: 'date', label: 'Fecha del gasto' })
    expect(getSortOptions('ingreso')[0].label).toBe('Fecha del ingreso')
  })

  it('incluye los cuatro criterios', () => {
    expect(getSortOptions('gasto').map((o) => o.value)).toEqual(['date', 'created_at', 'alpha', 'amount'])
  })
})
