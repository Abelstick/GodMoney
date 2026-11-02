import { supabase } from '@/lib/supabase'

// Deudas con tu ahorro (ver supabase/migrations/014_savings_withdrawals.sql).
// repaid_amount y status los mantiene la BD: las reposiciones se registran como
// transferencias hacia la cuenta de ahorro con repays_withdrawal_id.

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const SELECT = '*, savings_account:accounts!savings_withdrawals_savings_account_id_fkey(id,name,color)'

export const savingsWithdrawalService = {
  async getAll({ status } = {}) {
    let query = supabase
      .from('savings_withdrawals')
      .select(SELECT)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * payload: { savings_account_id, amount, origin?, transfer_id?, reason?, period_label?, target_date? }
   * origin 'WITHDRAWAL' exige transfer_id; 'DEFICIT' y 'MANUAL' no lo llevan.
   */
  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('savings_withdrawals')
      .insert({ ...payload, user_id })
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  /** Solo campos editables: amount, reason, target_date, period_label. */
  async update(id, changes) {
    const { data, error } = await supabase
      .from('savings_withdrawals')
      .update(changes)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  /** "Ya no lo repongo": cierra la deuda sin exigir el total. */
  forgive(id) {
    return this.update(id, { status: 'FORGIVEN' })
  },

  /** Reabre una deuda perdonada; la BD decide si queda OPEN o REPAID. */
  reopen(id) {
    return this.update(id, { status: 'OPEN' })
  },

  /**
   * Repone a una cuenta de ahorro repartiendo el monto entre sus deudas
   * abiertas (la más antigua primero). Lo que sobre entra como aporte normal.
   * Devuelve el monto aplicado a deudas. Ver repay_savings() en 018.
   */
  async repay({ savings_account_id, from_account_id, amount, date, note }) {
    const { data, error } = await supabase.rpc('repay_savings', {
      p_savings_account_id: savings_account_id,
      p_from_account_id: from_account_id,
      p_amount: amount,
      p_date: date,
      p_note: note || null,
    })
    if (error) throw error
    return Number(data)
  },

  async remove(id) {
    const { error } = await supabase.from('savings_withdrawals').delete().eq('id', id)
    if (error) throw error
  },
}

/** Lo que falta reponer de una deuda (0 si está perdonada o repuesta). */
export function pendingAmount(withdrawal) {
  if (withdrawal.status !== 'OPEN') return 0
  return Math.max(0, Number(withdrawal.amount) - Number(withdrawal.repaid_amount))
}
