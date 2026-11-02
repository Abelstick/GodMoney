import { describe, it, expect } from 'vitest'
import {
  nextAnnualDate, daysUntil, occasionCycle, occasionBudgetSummary,
  monthlySavingSuggestion, dueReminders, historyByYear, formatDayMonth, linkedGoal,
} from './giftPlanning'

describe('nextAnnualDate', () => {
  it('si la fecha no pasó este año, es este año', () => {
    expect(nextAnnualDate(12, 25, new Date(2026, 10, 2))).toBe('2026-12-25')
  })
  it('hoy cuenta como la fecha', () => {
    expect(nextAnnualDate(12, 25, new Date(2026, 11, 25))).toBe('2026-12-25')
  })
  it('si ya pasó, es el año siguiente', () => {
    expect(nextAnnualDate(3, 10, new Date(2026, 10, 2))).toBe('2027-03-10')
  })
  it('un 29 de febrero cae el 28 en años no bisiestos', () => {
    expect(nextAnnualDate(2, 29, new Date(2026, 0, 1))).toBe('2026-02-28')
    expect(nextAnnualDate(2, 29, new Date(2028, 0, 1))).toBe('2028-02-29')
  })
})

describe('daysUntil', () => {
  it('cuenta días calendario', () => {
    expect(daysUntil('2026-12-25', new Date(2026, 11, 20, 23, 59))).toBe(5)
    expect(daysUntil('2026-12-25', new Date(2026, 11, 25, 8))).toBe(0)
  })
})

describe('occasionCycle', () => {
  it('al día siguiente de Navidad el ciclo pasa al año siguiente', () => {
    const xmas = { month: 12, day: 25 }
    expect(occasionCycle(xmas, new Date(2026, 11, 25)).year).toBe(2026)
    expect(occasionCycle(xmas, new Date(2026, 11, 26)).year).toBe(2027)
  })
})

describe('occasionBudgetSummary', () => {
  const occasion = { id: 'o1', budget: '500' }
  const gifts = [
    { direction: 'GIVEN', occasion_id: 'o1', year: 2026, status: 'DONE', amount: '120' },
    { direction: 'GIVEN', occasion_id: 'o1', year: 2026, status: 'PLANNED', estimated_amount: '80' },
    { direction: 'GIVEN', occasion_id: 'o1', year: 2026, status: 'IDEA', estimated_amount: '999' },
    { direction: 'GIVEN', occasion_id: 'o1', year: 2025, status: 'DONE', amount: '300' },
    { direction: 'GIVEN', occasion_id: 'o2', year: 2026, status: 'DONE', amount: '50' },
    { direction: 'RECEIVED', occasion_id: 'o1', year: 2026, status: 'DONE', amount: '200' },
  ]
  it('solo suma regalos dados de esa ocasión y ese año', () => {
    const s = occasionBudgetSummary(occasion, gifts, 2026)
    expect(s.spent).toBe(120)
    expect(s.planned).toBe(80)
    expect(s.remaining).toBe(300)
    expect(s.percent).toBe(40)
  })
  it('sin presupuesto no hay restante', () => {
    const s = occasionBudgetSummary({ id: 'o1', budget: null }, gifts, 2026)
    expect(s.remaining).toBeNull()
  })
})

describe('monthlySavingSuggestion', () => {
  it('reparte lo que falta entre los meses que quedan, contando el actual', () => {
    const s = monthlySavingSuggestion({ budget: 600, date: '2026-12-25', today: new Date(2026, 9, 15) })
    expect(s.months).toBe(3)
    expect(s.perMonth).toBe(200)
  })
  it('descuenta lo ya ahorrado', () => {
    const s = monthlySavingSuggestion({ budget: 600, alreadyCovered: 300, date: '2026-12-25', today: new Date(2026, 9, 15) })
    expect(s.perMonth).toBe(100)
  })
  it('en el mismo mes es una sola cuota', () => {
    const s = monthlySavingSuggestion({ budget: 100, date: '2026-12-25', today: new Date(2026, 11, 1) })
    expect(s.months).toBe(1)
    expect(s.perMonth).toBe(100)
  })
  it('cubierto o sin presupuesto', () => {
    expect(monthlySavingSuggestion({ budget: 100, alreadyCovered: 100, date: '2026-12-25' }).perMonth).toBe(0)
    expect(monthlySavingSuggestion({ budget: null, date: '2026-12-25' })).toBeNull()
  })
})

describe('dueReminders', () => {
  it('incluye solo las ocasiones dentro de su ventana de aviso', () => {
    const occasions = [
      { id: 'a', month: 11, day: 10, reminder_days_before: 14 },
      { id: 'b', month: 12, day: 25, reminder_days_before: 14 },
      { id: 'c', month: 11, day: 5, reminder_days_before: 7, is_active: false },
    ]
    const r = dueReminders(occasions, new Date(2026, 10, 2))
    expect(r.map((x) => x.occasion.id)).toEqual(['a'])
  })
})

describe('historyByYear', () => {
  it('agrupa por año separando dado y recibido', () => {
    const rows = historyByYear([
      { status: 'DONE', direction: 'GIVEN', year: 2026, amount: '100', date: '2026-12-20' },
      { status: 'DONE', direction: 'RECEIVED', amount: '50', date: '2026-05-01' },
      { status: 'DONE', direction: 'GIVEN', year: 2025, amount: '70', date: '2025-12-20' },
      { status: 'PLANNED', direction: 'GIVEN', year: 2026, estimated_amount: '999' },
    ])
    expect(rows.map((r) => r.year)).toEqual([2026, 2025])
    expect(rows[0]).toMatchObject({ given: 100, received: 50, givenCount: 1, receivedCount: 1 })
  })
})

describe('formatDayMonth', () => {
  it('formatea en español', () => {
    expect(formatDayMonth(12, 25)).toBe('25 de diciembre')
  })
})

describe('linkedGoal', () => {
  const goalsById = { g1: { id: 'g1', target_date: '2026-12-25' } }
  it('vale solo para su año', () => {
    const occasion = { goal_id: 'g1', goal_year: 2026 }
    expect(linkedGoal(occasion, 2026, goalsById)).toBe(goalsById.g1)
    expect(linkedGoal(occasion, 2027, goalsById)).toBeNull()
  })
  it('sin goal_year usa el año de la fecha meta', () => {
    expect(linkedGoal({ goal_id: 'g1' }, 2026, goalsById)).toBe(goalsById.g1)
    expect(linkedGoal({ goal_id: 'g1' }, 2027, goalsById)).toBeNull()
  })
  it('objetivo borrado o sin vínculo', () => {
    expect(linkedGoal({ goal_id: 'x', goal_year: 2026 }, 2026, goalsById)).toBeNull()
    expect(linkedGoal({}, 2026, goalsById)).toBeNull()
  })
})
