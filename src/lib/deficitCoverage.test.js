import { describe, it, expect } from 'vitest'
import { buildDeficitCoverage, periodLabelFor } from './deficitCoverage'

const range = { from: '2025-01-01', to: '2025-12-31' }
const accounts = [
  { id: 'main', name: 'Principal' },
  { id: 'bcp',  name: 'Ahorro BCP', is_savings: true },
  { id: 'ibk',  name: 'Ahorro IBK', is_savings: true },
]
const tr = (from_account_id, to_account_id, amount, date = '2025-06-01') => ({ from_account_id, to_account_id, amount, date })

describe('buildDeficitCoverage', () => {
  it('reparte el déficit entre ahorro, préstamos y lo sin explicar', () => {
    const c = buildDeficitCoverage({
      deficit: 4200,
      range,
      accounts,
      transfers: [tr('bcp', 'main', '3000')],
      loans: [{ type: 'BORROWED', status: 'ACTIVE', start_date: '2025-03-01', principal_amount: '1000' }],
    })
    expect(c).toMatchObject({ fromSavings: 3000, fromLoans: 1000, unexplained: 200, suggestedDebt: 3200 })
    expect(c.savingsByAccount).toEqual([{ id: 'bcp', name: 'Ahorro BCP', amount: 3000 }])
  })

  it('los traspasos de vuelta al ahorro restan y los de ahorro a ahorro no cuentan', () => {
    const c = buildDeficitCoverage({
      deficit: 1000, range, accounts,
      transfers: [tr('bcp', 'main', 1500), tr('main', 'bcp', 500), tr('bcp', 'ibk', 999)],
    })
    expect(c.fromSavings).toBe(1000)
    expect(c.unexplained).toBe(0)
  })

  it('ignora movimientos fuera del rango, préstamos dados y cancelados', () => {
    const c = buildDeficitCoverage({
      deficit: 500, range, accounts,
      transfers: [tr('bcp', 'main', 800, '2024-12-31')],
      loans: [
        { type: 'LENT',     status: 'ACTIVE',    start_date: '2025-02-01', principal_amount: 300 },
        { type: 'BORROWED', status: 'CANCELLED', start_date: '2025-02-01', principal_amount: 300 },
        { type: 'BORROWED', status: 'PAID',      start_date: '2026-01-02', principal_amount: 300 },
      ],
    })
    expect(c).toMatchObject({ fromSavings: 0, fromLoans: 0, unexplained: 500, suggestedDebt: 500 })
  })

  it('suma los gastos pagados desde una cuenta de ahorro', () => {
    const c = buildDeficitCoverage({
      deficit: 1300, range, accounts,
      transfers: [tr('bcp', 'main', 500)],
      expenses: [
        { date: '2025-07-01', amount: '800', paid_from_account_id: 'bcp' },
        { date: '2025-07-02', amount: '100', paid_from_account_id: 'main' },
      ],
    })
    expect(c.fromSavings).toBe(1300)
    expect(c.unexplained).toBe(0)
  })

  it('si los préstamos cubren todo, no sugiere deuda con el ahorro', () => {
    const c = buildDeficitCoverage({
      deficit: 300, range, accounts,
      loans: [{ type: 'BORROWED', status: 'ACTIVE', start_date: '2025-02-01', principal_amount: 500 }],
    })
    expect(c.suggestedDebt).toBe(0)
    expect(c.unexplained).toBe(0)
  })
})

describe('periodLabelFor', () => {
  it('reconoce año y mes completos', () => {
    expect(periodLabelFor(range)).toBe('2025')
    expect(periodLabelFor({ from: '2025-02-01', to: '2025-02-28' })).toBe('2025-02')
  })

  it('otros rangos usan las fechas', () => {
    expect(periodLabelFor({ from: '2025-02-01', to: '2025-02-27' })).toBe('2025-02-01 – 2025-02-27')
    expect(periodLabelFor({ from: '2025-01-01', to: '2025-11-02' }, (d) => d.slice(5))).toBe('01-01 – 11-02')
  })
})
