import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const expenseService = {
  async getByMonth(from, to) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:categories(id,name,color,icon)')
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
      .select('amount, date, category_id, is_fixed')
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
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },
}
