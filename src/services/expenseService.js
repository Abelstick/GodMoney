import { supabase } from '@/lib/supabase'
import { toRestorePayload } from '@/lib/restorePayload'

// expenses tiene dos FK a accounts (destino del ahorro y cuenta de origen):
// hay que nombrar la relación para que PostgREST no la considere ambigua.
const SELECT = '*, category:categories(id,name,color,icon,is_savings)'
  + ', savings_account:accounts!expenses_savings_account_id_fkey(id,name)'
  + ', paid_from_account:accounts!expenses_paid_from_account_id_fkey(id,name,is_savings)'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const expenseService = {
  async getByMonth(from, to) {
    const { data, error } = await supabase
      .from('expenses')
      .select(SELECT)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    if (error) throw error
    return data
  },

  async getHistorical(months = 6) {
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, date, category_id, is_fixed, category:categories(is_savings)')
      .gte('date', from.toISOString().slice(0, 10))
      .order('date')
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, user_id })
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  // Todas las partes de un gasto dividido.
  async getByGroup(groupId) {
    const { data, error } = await supabase
      .from('expenses')
      .select(SELECT)
      .eq('split_group_id', groupId)
    if (error) throw error
    return data
  },

  // Varios gastos en un solo insert (todo o nada): las partes de un gasto dividido.
  async createMany(rows) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('expenses')
      .insert(rows.map((r) => ({ ...r, user_id })))
      .select(SELECT)
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  // Mismo cambio para varios gastos a la vez.
  async updateMany(ids, patch) {
    const { data, error } = await supabase.from('expenses').update(patch).in('id', ids).select(SELECT)
    if (error) throw error
    return data
  },

  async removeMany(ids) {
    const { error } = await supabase.from('expenses').delete().in('id', ids)
    if (error) throw error
  },

  // Vuelve a insertar gastos eliminados (Deshacer).
  async restore(rows) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('expenses')
      .insert(rows.map((r) => ({ ...toRestorePayload('expense', r), user_id })))
      .select(SELECT)
    if (error) throw error
    return data
  },
}
