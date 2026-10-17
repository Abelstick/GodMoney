import { supabase } from '@/lib/supabase'

const SELECT = '*, category:categories(id,name,color)'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const recurringTransactionService = {
  async getAll(type) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(SELECT)
      .eq('type', type)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({ ...payload, user_id })
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(payload)
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return data
  },

  // Los movimientos ya generados se conservan; solo se borra la plantilla.
  async remove(id) {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
    if (error) throw error
  },

  // Crea los movimientos vencidos que falten. Devuelve cuántos creó.
  async generate() {
    const { data, error } = await supabase.rpc('generate_my_recurring_transactions')
    if (error) throw error
    return data ?? 0
  },
}
