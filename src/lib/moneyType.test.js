import { describe, it, expect } from 'vitest'
import { totalsByMoneyType, accountKind } from './moneyType'

describe('totalsByMoneyType', () => {
  it('separa bancario, efectivo y sin indicar', () => {
    expect(totalsByMoneyType([
      { amount: '1000', money_type: 'BANK' },
      { amount: 50, money_type: 'CASH' },
      { amount: '20.5', money_type: 'CASH' },
      { amount: 7, money_type: null },
    ])).toEqual({ BANK: 1000, CASH: 70.5, unknown: 7 })
  })
})

describe('accountKind', () => {
  it('trata las cuentas sin tipo como bancarias', () => {
    expect(accountKind({})).toBe('BANK')
    expect(accountKind({ kind: 'CASH' })).toBe('CASH')
  })
})
