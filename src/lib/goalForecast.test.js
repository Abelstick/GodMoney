import { describe, it, expect } from 'vitest'
import { format } from 'date-fns'
import { getGoalForecast } from './goalForecast'

const NOW = new Date(2026, 9, 31) // 31 oct 2026
const day = (d) => format(d, 'yyyy-MM-dd')

describe('getGoalForecast', () => {
  it('marca como cumplido cuando no falta nada', () => {
    const f = getGoalForecast({ target_amount: 100, current_amount: 120 }, NOW)
    expect(f.done).toBe(true)
    expect(f.remaining).toBe(0)
    expect(f.percent).toBe(100)
  })

  it('proyecta la fecha al ritmo promedio desde la creación', () => {
    // 300 ahorrados en 30 días → 10/día → faltan 700 → 70 días
    const f = getGoalForecast({ target_amount: 1000, current_amount: 300, created_at: '2026-10-01T12:00:00Z' }, NOW)
    expect(f.remaining).toBe(700)
    expect(f.percent).toBe(30)
    expect(day(f.estimatedDate)).toBe('2027-01-09')
  })

  it('no proyecta con menos de 2 semanas de historia o sin avance', () => {
    expect(getGoalForecast({ target_amount: 1000, current_amount: 300, created_at: '2026-10-25' }, NOW).estimatedDate).toBeNull()
    expect(getGoalForecast({ target_amount: 1000, current_amount: 0, created_at: '2026-01-01' }, NOW).estimatedDate).toBeNull()
  })

  it('calcula cuánto ahorrar por mes para llegar a la fecha límite', () => {
    const f = getGoalForecast({ target_amount: 1000, current_amount: 400, target_date: '2027-04-30' }, NOW)
    expect(f.daysLeft).toBe(181)
    expect(f.monthlyNeeded).toBeCloseTo(100.9, 0)
  })

  it('indica si va a tiempo comparando estimación y fecha límite', () => {
    const base = { target_amount: 1000, current_amount: 300, created_at: '2026-10-01T12:00:00Z' }
    expect(getGoalForecast({ ...base, target_date: '2027-02-01' }, NOW).onTrack).toBe(true)
    expect(getGoalForecast({ ...base, target_date: '2026-12-01' }, NOW).onTrack).toBe(false)
  })

  it('marca la fecha límite vencida', () => {
    const f = getGoalForecast({ target_amount: 1000, current_amount: 300, target_date: '2026-10-01' }, NOW)
    expect(f.targetPassed).toBe(true)
    expect(f.onTrack).toBe(false)
    expect(f.monthlyNeeded).toBeNull()
  })
})
