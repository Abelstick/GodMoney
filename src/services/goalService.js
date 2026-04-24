import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const goalService = {
  async getAll() {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...payload, user_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addProgress(id, amount) {
    const { data: goal, error: fetchError } = await supabase
      .from('goals')
      .select('current_amount, target_amount')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount)
    const status = newAmount >= goal.target_amount ? 'completed' : 'active'

    return this.update(id, { current_amount: newAmount, status })
  },

  async remove(id) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  },
}
