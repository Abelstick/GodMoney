import { supabase } from '@/lib/supabase'

const TRANSFER_SELECT = 'id, date, amount, note, created_at, from_account_id, to_account_id, repays_withdrawal_id'
  + ', from_account:accounts!transfers_from_account_id_fkey(id,name)'
  + ', to_account:accounts!transfers_to_account_id_fkey(id,name)'
const EXPENSE_SELECT = 'id, date, amount, description, created_at, paid_from_account_id, savings_account_id, repay_to_savings'
  + ', category:categories(id,name,color)'
const INCOME_SELECT = 'id, date, amount, description, created_at, account_id'
  + ', category:categories(id,name,color)'

// Todo lo que movió el saldo de una cuenta en un rango: transferencias de
// entrada y salida, gastos pagados desde ella, aportes de ahorro hacia ella e
// ingresos recibidos en ella.
// (Los movimientos de préstamos y ajustes manuales no quedan registrados como filas.)
export const accountActivityService = {
  async get(accountId, from, to) {
    const [transfers, paid, saved, withdrawals, received] = await Promise.all([
      supabase.from('transfers').select(TRANSFER_SELECT)
        .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
        .gte('date', from).lte('date', to),
      supabase.from('expenses').select(EXPENSE_SELECT)
        .eq('paid_from_account_id', accountId)
        .gte('date', from).lte('date', to),
      supabase.from('expenses').select(EXPENSE_SELECT)
        .eq('savings_account_id', accountId)
        .gte('date', from).lte('date', to),
      // Para saber qué retiros quedaron como deuda (transfer_id → deuda).
      supabase.from('savings_withdrawals').select('id, transfer_id')
        .eq('savings_account_id', accountId)
        .not('transfer_id', 'is', null),
      supabase.from('incomes').select(INCOME_SELECT)
        .eq('account_id', accountId)
        .gte('date', from).lte('date', to),
    ])
    for (const r of [transfers, paid, saved, withdrawals, received]) if (r.error) throw r.error
    return {
      transfers: transfers.data,
      paidExpenses: paid.data,
      savingsExpenses: saved.data,
      incomes: received.data,
      debtTransferIds: withdrawals.data.map((w) => w.transfer_id),
    }
  },
}
