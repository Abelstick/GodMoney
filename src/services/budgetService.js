import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const budgetService = {
  async getAll() {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(id,name,color,icon)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...payload, user_id })
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('budgets')
      .update(payload)
      .eq('id', id)
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },

  async getSpentByCategory(categoryIds, from, to) {
    if (!categoryIds.length) return {}
    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount')
      .in('category_id', categoryIds)
      .gte('date', from)
      .lte('date', to)
    if (error) throw error

    return data.reduce((acc, row) => {
      acc[row.category_id] = (acc[row.category_id] ?? 0) + Number(row.amount)
      return acc
    }, {})
  },
}
