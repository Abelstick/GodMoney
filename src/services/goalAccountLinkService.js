import { supabase } from '@/lib/supabase'

export const goalAccountLinkService = {
  // Todos los vínculos del usuario (de todos sus objetivos) — se piden
  // juntos porque el prorrateo de una cuenta depende de TODOS los
  // objetivos que la comparten, no solo de uno.
  async getAll() {
    const { data, error } = await supabase
      .from('goal_account_links')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  // Upsert por (goal_id, account_id): vincular una cuenta ya vinculada
  // simplemente actualiza el monto asignado, sin necesitar un método aparte.
  async link(goalId, accountId, allocatedAmount) {
    const { data, error } = await supabase
      .from('goal_account_links')
      .upsert(
        { goal_id: goalId, account_id: accountId, allocated_amount: allocatedAmount, updated_at: new Date().toISOString() },
        { onConflict: 'goal_id,account_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  async unlink(id) {
    const { error } = await supabase.from('goal_account_links').delete().eq('id', id)
    if (error) throw error
  },
}
