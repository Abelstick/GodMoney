import { supabase } from '@/lib/supabase'
import { EXPORT_TABLES } from '@/lib/accountData'

const PAGE = 1000 // límite de filas por respuesta de PostgREST

async function fetchTable(table, orderColumns) {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase.from(table).select('*')
    orderColumns.forEach((column) => { query = query.order(column) })
    const { data, error } = await query.range(offset, offset + PAGE - 1)
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

export const accountDataService = {
  // Todo o nada: una copia a la que le falta una tabla parecería completa sin serlo.
  async fetchAll() {
    const entries = await Promise.all(
      Object.entries(EXPORT_TABLES).map(async ([table, order]) => [table, await fetchTable(table, order)]),
    )
    return Object.fromEntries(entries)
  },

  async deleteAccount() {
    const { error } = await supabase.rpc('delete_my_account')
    if (error?.code === 'PGRST202') {
      // La migración 022 aún no está aplicada: no se ha borrado nada.
      throw new Error('Esta opción todavía no está disponible. Tu cuenta sigue intacta.')
    }
    if (error) throw new Error(error.message)
  },
}
