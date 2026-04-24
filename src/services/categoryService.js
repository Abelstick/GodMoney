import { supabase } from '@/lib/supabase'

export const categoryService = {
  async getAll(type = null) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name')

    if (type) {
      query = query.or(`type.eq.${type},type.eq.both`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
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
