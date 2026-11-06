import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const SELECT = '*, budget_categories(category:categories(id,name,color,icon))'
const PAGE = 1000

// Aplana el join: cada presupuesto expone `categories` y `category_ids`.
function normalize(row) {
  const { budget_categories, ...budget } = row
  const categories = (budget_categories ?? []).map((l) => l.category).filter(Boolean)
  return { ...budget, categories, category_ids: categories.map((c) => c.id) }
}

// Sustituye los vínculos del presupuesto por `categoryIds`.
async function syncCategories(budgetId, userId, categoryIds) {
  const { error: delError } = await supabase.from('budget_categories').delete().eq('budget_id', budgetId)
  if (delError) throw delError
  if (!categoryIds.length) return
  const rows = categoryIds.map((category_id) => ({ budget_id: budgetId, category_id, user_id: userId }))
  const { error } = await supabase.from('budget_categories').insert(rows)
  if (error) throw error
}

async function getOne(id) {
  const { data, error } = await supabase.from('budgets').select(SELECT).eq('id', id).single()
  if (error) throw error
  return normalize(data)
}

export const budgetService = {
  async getAll() {
    const { data, error } = await supabase
      .from('budgets')
      .select(SELECT)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(normalize)
  },

  async create({ category_ids = [], ...payload }) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...payload, user_id })
      .select('id')
      .single()
    if (error) throw error
    try {
      await syncCategories(data.id, user_id, category_ids)
    } catch (err) {
      // Sin vínculos el presupuesto quedaría sin seguimiento: se revierte.
      await supabase.from('budgets').delete().eq('id', data.id)
      throw err
    }
    return getOne(data.id)
  },

  async update(id, { category_ids, ...payload }) {
    const { error } = await supabase.from('budgets').update(payload).eq('id', id)
    if (error) throw error
    if (category_ids) await syncCategories(id, await getUserId(), category_ids)
    return getOne(id)
  },

  async remove(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },

  // Gastos de esas categorías en el rango; cada presupuesto se queda con los de su
  // período (ver withBudgetStatus). Se pagina: un presupuesto anual puede pasar del
  // límite de 1000 filas de PostgREST y el gasto saldría corto sin avisar.
  async getExpenseRows(categoryIds, from, to) {
    if (!categoryIds.length) return []
    const rows = []
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('expenses')
        .select('category_id, amount, date, is_fixed, category:categories(is_savings)')
        .in('category_id', categoryIds)
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('id')
        .range(offset, offset + PAGE - 1)
      if (error) throw error
      rows.push(...data)
      if (data.length < PAGE) return rows
    }
  },
}
