import { supabase } from '@/lib/supabase'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const SELECT = '*, budget_categories(category:categories(id,name,color,icon))'

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

  // Gasto por categoría en el rango; cada presupuesto suma las suyas (ver sumBudgetSpent).
  async getSpentByCategory(categoryIds, from, to) {
    if (!categoryIds.length) return {}
    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount')
      .in('category_id', categoryIds)
      .gte('date', from)
      .lte('date', to)
    if (error) throw error

    return data.reduce((acc, row) => {
      acc[row.category_id] = (acc[row.category_id] ?? 0) + Number(row.amount)
      return acc
    }, {})
  },
}
