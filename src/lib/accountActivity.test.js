import { describe, it, expect } from 'vitest'
import { buildAccountActivity, activityTotals, savingsFlow } from './accountActivity'

const SAV = 'sav'
const data = {
  transfers: [
    { id: 't1', date: '2026-10-03', amount: '500', from_account_id: SAV, to_account_id: 'main', to_account: { name: 'Principal' }, note: null },
    { id: 't2', date: '2026-10-20', amount: '200', from_account_id: 'main', to_account_id: SAV, from_account: { name: 'Principal' }, note: 'Reposición de ahorro', repays_withdrawal_id: 'w1' },
  ],
  paidExpenses: [
    { id: 'e1', date: '2026-10-10', amount: '800', description: 'Dentista', category: { name: 'Salud' }, repay_to_savings: true },
  ],
  savingsExpenses: [
    { id: 'e2', date: '2026-09-28', amount: '300', description: null },
  ],
  debtTransferIds: ['t1'],
}

describe('buildAccountActivity', () => {
  const rows = buildAccountActivity(SAV, data)

  it('ordena de lo más reciente a lo más antiguo con el signo correcto', () => {
    expect(rows.map((r) => [r.id, r.amount])).toEqual([
      ['t-t2', 200], ['pe-e1', -800], ['t-t1', -500], ['se-e2', 300],
    ])
  })

  it('marca retiros por reponer y reposiciones', () => {
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId['t-t1']).toMatchObject({ tag: 'withdrawal', detail: 'Hacia Principal', label: 'Transferencia enviada' })
    expect(byId['t-t2']).toMatchObject({ tag: 'repayment', detail: 'Desde Principal' })
    expect(byId['pe-e1']).toMatchObject({ tag: 'expense-withdrawal', label: 'Dentista', detail: 'Gasto · Salud' })
    expect(byId['se-e2']).toMatchObject({ label: 'Aporte de ahorro', tag: null })
  })

  it('totaliza entradas y salidas, opcionalmente por mes', () => {
    expect(activityTotals(rows)).toEqual({ incoming: 500, outgoing: 1300, net: -800 })
    expect(activityTotals(rows, '2026-10')).toEqual({ incoming: 200, outgoing: 1300, net: -1100 })
  })
})

describe('savingsFlow', () => {
  const accounts = [{ id: SAV, is_savings: true }, { id: 'main' }]

  it('suma retiros por transferencia y por gasto, y solo reposiciones marcadas', () => {
    const flow = savingsFlow({
      accounts,
      range: { from: '2026-10-01', to: '2026-10-31' },
      transfers: [
        ...data.transfers,
        { id: 't3', date: '2026-10-21', amount: '50', from_account_id: 'main', to_account_id: SAV }, // aporte, no reposición
        { id: 't4', date: '2026-09-30', amount: '999', from_account_id: SAV, to_account_id: 'main' }, // fuera de rango
      ],
      expenses: [
        { date: '2026-10-10', amount: '800', paid_from_account_id: SAV },
        { date: '2026-10-11', amount: '40', paid_from_account_id: 'main' },
      ],
    })
    expect(flow).toEqual({ withdrawn: 1300, repaid: 200 })
  })
})
