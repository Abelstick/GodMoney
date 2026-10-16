import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const SELECT = '*, category:categories(id,name,color,icon,is_savings)'
const PAGE = 1000

// PostgREST limita las respuestas (1000 filas); se pagina para rangos grandes (p. ej. un año).
async function fetchAll(table, from, to) {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(SELECT)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export const movementService = {
  /** Gastos e ingresos del rango, unificados con `kind` ('expense' | 'income'). */
  async getRange(from, to) {
    const [expenses, incomes] = await Promise.all([
      fetchAll('expenses', from, to),
      fetchAll('incomes', from, to),
    ])
    return [
      ...expenses.map((e) => ({ ...e, kind: 'expense' })),
      ...incomes.map((i) => ({ ...i, kind: 'income' })),
    ].sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))
  },

  /** Inserta movimientos importados en lotes. items: { kind, date, amount, description, category_id } */
  async bulkInsert(items) {
    const user_id = await getUserId()
    const toRow = ({ date, amount, description, category_id }) => ({
      user_id, date, amount, description: description || null, category_id: category_id || null,
    })
    const expenses = items.filter((i) => i.kind === 'expense').map(toRow)
    const incomes  = items.filter((i) => i.kind === 'income').map(toRow)

    for (const [table, rows] of [['expenses', expenses], ['incomes', incomes]]) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from(table).insert(rows.slice(i, i + 200))
        if (error) throw error
      }
    }
    return { expenses: expenses.length, incomes: incomes.length }
  },
}
