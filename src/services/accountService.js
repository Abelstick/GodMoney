import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const accountService = {
  async getAll() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...payload, user_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
  },
}
