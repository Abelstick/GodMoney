import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLoanDisplayStatus } from './loanStatus'

const loan = (patch = {}) => ({
  status: 'ACTIVE', due_date: '2027-06-30', remaining_principal: 500, ...patch,
})

describe('getLoanDisplayStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T15:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('al día cuando no vence nada en la próxima semana', () => {
    expect(getLoanDisplayStatus(loan(), { due_date: '2026-11-20' })).toEqual({ tone: 'ok', label: 'Al día' })
  })

  it('por vencer cuando la próxima cuota vence en ≤ 7 días', () => {
    expect(getLoanDisplayStatus(loan(), { due_date: '2026-11-04' })).toEqual({ tone: 'warning', label: 'Vence en 4 días' })
    expect(getLoanDisplayStatus(loan(), { due_date: '2026-11-01' }).label).toBe('Vence mañana')
    expect(getLoanDisplayStatus(loan(), { due_date: '2026-10-31' }).label).toBe('Vence hoy')
  })

  it('vencido si la cuota pendiente ya pasó o el préstamo venció', () => {
    expect(getLoanDisplayStatus(loan(), { due_date: '2026-10-20' }).tone).toBe('danger')
    expect(getLoanDisplayStatus(loan({ due_date: '2026-10-01' })).tone).toBe('danger')
  })

  it('pagado y perdonado no dependen de fechas', () => {
    expect(getLoanDisplayStatus(loan({ status: 'PAID', due_date: '2026-01-01' })).label).toBe('Pagado')
    expect(getLoanDisplayStatus(loan({ status: 'CANCELLED' })).tone).toBe('neutral')
  })
})
