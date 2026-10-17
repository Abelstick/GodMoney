import { supabase } from '@/lib/supabase'
import { toRestorePayload } from '@/lib/restorePayload'

const SELECT = '*, category:categories(id,name,color,icon)'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const incomeService = {
  async getByMonth(from, to) {
    const { data, error } = await supabase
      .from('incomes')
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
      .from('incomes')
      .select('amount, date')
      .gte('date', from.toISOString().slice(0, 10))
      .order('date')
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('incomes')
      .insert({ ...payload, user_id })
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('incomes')
      .update(payload)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) throw error
  },

  // Mismo cambio para varios ingresos a la vez.
  async updateMany(ids, patch) {
    const { data, error } = await supabase.from('incomes').update(patch).in('id', ids).select(SELECT)
    if (error) throw error
    return data
  },

  async removeMany(ids) {
    const { error } = await supabase.from('incomes').delete().in('id', ids)
    if (error) throw error
  },

  // Vuelve a insertar ingresos eliminados (Deshacer).
  async restore(rows) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('incomes')
      .insert(rows.map((r) => ({ ...toRestorePayload('income', r), user_id })))
      .select(SELECT)
    if (error) throw error
    return data
  },
}
