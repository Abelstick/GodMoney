import { describe, it, expect } from 'vitest'
import { nextOccurrence } from './recurringSchedule'

describe('nextOccurrence', () => {
  it('si el día de este mes aún no pasó, es este mes', () => {
    expect(nextOccurrence(20, new Date(2026, 9, 16))).toBe('2026-10-20')
  })

  it('hoy cuenta como vencimiento', () => {
    expect(nextOccurrence(16, new Date(2026, 9, 16))).toBe('2026-10-16')
  })

  it('si el día ya pasó, es el mes siguiente', () => {
    expect(nextOccurrence(5, new Date(2026, 9, 16))).toBe('2026-11-05')
  })

  it('cruza el cambio de año', () => {
    expect(nextOccurrence(5, new Date(2026, 11, 20))).toBe('2027-01-05')
  })

  it('un día 31 cae el último día de los meses cortos', () => {
    expect(nextOccurrence(31, new Date(2026, 1, 10))).toBe('2026-02-28')
    expect(nextOccurrence(31, new Date(2028, 1, 10))).toBe('2028-02-29')
    expect(nextOccurrence(31, new Date(2026, 3, 10))).toBe('2026-04-30')
  })

  it('el último día del mes sigue contando aunque el día pedido sea mayor', () => {
    expect(nextOccurrence(31, new Date(2026, 3, 30))).toBe('2026-04-30')
    expect(nextOccurrence(30, new Date(2026, 3, 30))).toBe('2026-04-30')
    expect(nextOccurrence(15, new Date(2026, 3, 30))).toBe('2026-05-15')
  })
})
