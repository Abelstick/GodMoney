import { supabase } from '@/lib/supabase'

// Escenarios del simulador (tabla simulation_scenarios, migración 019).
// Solo guarda hipótesis: no toca ninguna tabla de movimientos ni de saldos.

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const columns = ({ name, config, events }) => ({ name: name.trim().slice(0, 80), config, events })

// La tabla no existe hasta correr la migración 019: mensaje claro en vez del
// error técnico de PostgREST.
function friendly(error) {
  if (/simulation_scenarios|42P01|PGRST205/i.test(`${error.message} ${error.code}`)) {
    return new Error('Para guardar escenarios falta ejecutar la migración 019 en Supabase. El simulador funciona igual sin guardar.')
  }
  return error
}

export const simulationService = {
  async getAll() {
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw friendly(error)
    return data
  },

  async create(scenario) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .insert({ ...columns(scenario), user_id })
      .select()
      .single()
    if (error) throw friendly(error)
    return data
  },

  async update(id, scenario) {
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .update({ ...columns(scenario), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw friendly(error)
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('simulation_scenarios').delete().eq('id', id)
    if (error) throw friendly(error)
  },
}
