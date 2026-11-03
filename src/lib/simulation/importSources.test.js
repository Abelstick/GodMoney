import { describe, it, expect } from 'vitest'
import { importCandidates } from './importSources'

const WINDOW = { from: '2026-11-02', to: '2026-12-02' }

describe('importCandidates', () => {
  it('gasto/ingreso automático: próxima fecha desde el inicio, mensual', () => {
    const [c] = importCandidates({
      ...WINDOW,
      recurringTransactions: [{ id: 'rt1', type: 'income', amount: '2600.00', day_of_month: 7, is_active: true, start_date: '2026-01-01', description: 'Sueldo' }],
    })
    expect(c.group).toBe('income')
    expect(c.event).toMatchObject({ type: 'income', amount: '2600.00', date: '2026-11-07', repeat: 'monthly', source: { kind: 'recurring_tx', id: 'rt1' } })
  })

  it('omite inactivos, terminados o fuera del horizonte', () => {
    const list = importCandidates({
      ...WINDOW,
      recurringTransactions: [
        { id: 'a', type: 'expense', amount: '10', day_of_month: 5, is_active: false },
        { id: 'b', type: 'expense', amount: '10', day_of_month: 5, is_active: true, end_date: '2026-10-31' },
        { id: 'c', type: 'expense', amount: '10', day_of_month: 5, is_active: true, start_date: '2027-01-01' },
      ],
    })
    expect(list).toEqual([])
  })

  it('pago recurrente ya pagado este periodo pasa al mes siguiente', () => {
    const [c] = importCandidates({
      from: '2026-11-02',
      to: '2026-12-31',
      recurringPayments: [{ id: 'rp1', name: 'Internet', amount: '89.90', is_active: true, schedule_type: 'FIXED_DAY', due_day_of_month: 15 }],
      ledger: [{ recurring_payment_id: 'rp1', period_date: '2026-11-15' }],
    })
    expect(c.event).toMatchObject({ date: '2026-12-15', repeat: 'monthly' })
  })

  it('si el próximo vencimiento cae después del horizonte no se ofrece', () => {
    const list = importCandidates({
      ...WINDOW,
      recurringPayments: [{ id: 'rp1', name: 'Internet', amount: '89.90', is_active: true, schedule_type: 'FIXED_DAY', due_day_of_month: 15 }],
      ledger: [{ recurring_payment_id: 'rp1', period_date: '2026-11-15' }],
    })
    expect(list).toEqual([])
  })

  it('pago manual vencido se cuenta desde hoy y uno pagado se omite', () => {
    const list = importCandidates({
      ...WINDOW,
      recurringPayments: [
        { id: 'm1', name: 'Seguro', amount: '120', is_active: true, schedule_type: 'MANUAL', next_due_date: '2026-10-28' },
        { id: 'm2', name: 'Agua', amount: '40', is_active: true, schedule_type: 'MANUAL', next_due_date: '2026-11-20' },
      ],
      ledger: [{ recurring_payment_id: 'm2', period_date: '2026-11-20' }],
    })
    expect(list).toHaveLength(1)
    expect(list[0].event).toMatchObject({ description: 'Seguro', date: '2026-11-02', repeat: 'once' })
    expect(list[0].note).toMatch(/venció/)
  })

  it('cuotas: lo que debes es pago de deuda y lo que te deben es ingreso, por el saldo restante', () => {
    const list = importCandidates({
      ...WINDOW,
      installments: [
        { id: 'i1', installment_number: 2, due_date: '2026-11-20', total_amount: '500', paid_amount: '120.50', loan: { type: 'BORROWED', person_name: 'Banco' } },
        { id: 'i2', installment_number: 1, due_date: '2026-11-25', total_amount: '300', paid_amount: '0', loan: { type: 'LENT', person_name: 'Ana' } },
        { id: 'i3', installment_number: 3, due_date: '2027-01-20', total_amount: '500', paid_amount: '0', loan: { type: 'BORROWED', person_name: 'Banco' } },
      ],
    })
    expect(list.map((c) => [c.event.type, c.event.amount])).toEqual([['debt', '379.50'], ['income', '300.00']])
  })

  it('desmarca el pago recurrente que parece el mismo gasto automático', () => {
    const list = importCandidates({
      ...WINDOW,
      recurringTransactions: [{ id: 'rt', type: 'expense', amount: '89.90', day_of_month: 15, is_active: true, category_id: 'cat', description: 'Internet' }],
      recurringPayments: [{ id: 'rp', name: 'Internet Movistar', amount: '89.90', is_active: true, schedule_type: 'FIXED_DAY', due_day_of_month: 15, category_id: 'cat' }],
    })
    const rp = list.find((c) => c.key === 'recurring_payment:rp')
    expect(rp.suggested).toBe(false)
    expect(rp.note).toMatch(/Internet/)
  })
})
