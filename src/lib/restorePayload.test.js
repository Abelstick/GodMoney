import { describe, it, expect } from 'vitest'
import { toRestorePayload } from './restorePayload'

const expense = {
  id: 'x1', user_id: 'u1', category_id: 'c1', amount: '12.50', description: 'Menú', date: '2026-10-05',
  is_fixed: true, savings_account_id: 'acc1', tags: ['a'], notes: null, attachments: [{ id: 'f1' }],
  loan_payment_id: null, created_at: '2026-10-05T10:00:00Z',
  category: { id: 'c1', name: 'Comida' }, savings_account: { id: 'acc1', name: 'Ahorros' },
}

describe('toRestorePayload', () => {
  it('conserva las columnas propias del gasto, incluida la fecha de registro', () => {
    expect(toRestorePayload('expense', expense)).toEqual({
      category_id: 'c1', amount: '12.50', description: 'Menú', date: '2026-10-05', tags: ['a'], notes: null,
      attachments: [{ id: 'f1' }], loan_payment_id: null, created_at: '2026-10-05T10:00:00Z',
      is_fixed: true, savings_account_id: 'acc1',
    })
  })

  it('no incluye id, user_id ni los joins', () => {
    const payload = toRestorePayload('expense', expense)
    for (const key of ['id', 'user_id', 'category', 'savings_account']) expect(payload).not.toHaveProperty(key)
  })

  it('un ingreso usa is_recurring y no los campos de gasto', () => {
    const payload = toRestorePayload('income', { ...expense, is_recurring: true })
    expect(payload.is_recurring).toBe(true)
    expect(payload).not.toHaveProperty('is_fixed')
    expect(payload).not.toHaveProperty('savings_account_id')
  })

  it('omite lo que la fila no trae, para que la base use su valor por defecto', () => {
    expect(toRestorePayload('income', { amount: 5, date: '2026-10-05' })).toEqual({ amount: 5, date: '2026-10-05' })
  })
})
