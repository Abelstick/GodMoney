import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const categoryService = {
  async getAll(type = null) {
    const user_id = await getUserId()
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', user_id)
      .order('name')

    if (type) {
      query = query.or(`type.eq.${type},type.eq.both`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...payload, user_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
