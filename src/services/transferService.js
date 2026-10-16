import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const SELECT = '*, from_account:accounts!transfers_from_account_id_fkey(id,name,color), to_account:accounts!transfers_to_account_id_fkey(id,name,color)'

export const transferService = {
  async getRecent(limit = 20) {
    const { data, error } = await supabase
      .from('transfers')
      .select(SELECT)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('transfers')
      .insert({ ...payload, user_id })
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('transfers').delete().eq('id', id)
    if (error) throw error
  },
}
