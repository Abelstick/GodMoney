import { budgetService } from '@/services/budgetService'

export const createBudgetSlice = (set, get) => ({
  budgets: [],
  budgetsSpent: {},
  budgetsLoading: false,

  fetchBudgets: async () => {
    set({ budgetsLoading: true })
    try {
      const data = await budgetService.getAll()
      set({ budgets: data, budgetsLoading: false })
    } catch (err) {
      set({ budgetsLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  fetchBudgetsSpent: async (from, to) => {
    const { budgets } = get()
    const categoryIds = budgets
      .map((b) => b.category_id)
      .filter(Boolean)
    const spent = await budgetService.getSpentByCategory(categoryIds, from, to)
    set({ budgetsSpent: spent })
  },

  addBudget: async (payload) => {
    const data = await budgetService.create(payload)
    set((s) => ({ budgets: [data, ...s.budgets] }))
    get().showToast('Presupuesto creado', 'success')
    return data
  },

  updateBudget: async (id, payload) => {
    const data = await budgetService.update(id, payload)
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? data : b)) }))
    get().showToast('Presupuesto actualizado', 'success')
    return data
  },

  removeBudget: async (id) => {
    await budgetService.remove(id)
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }))
    get().showToast('Presupuesto eliminado', 'info')
  },
})
