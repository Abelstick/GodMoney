import { budgetService } from '@/services/budgetService'
import { allBudgetCategoryIds } from '@/lib/budgetStatus'

// Al cambiar rápido de mes, una respuesta lenta no debe pisar a la más reciente.
let lastExpensesRequest = 0

export const createBudgetSlice = (set, get) => ({
  budgets: [],
  budgetExpenses: [],
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

  fetchBudgetExpenses: async (from, to) => {
    const request = ++lastExpensesRequest
    try {
      const categoryIds = allBudgetCategoryIds(get().budgets)
      const rows = await budgetService.getExpenseRows(categoryIds, from, to)
      if (request === lastExpensesRequest) set({ budgetExpenses: rows })
    } catch (err) {
      if (request === lastExpensesRequest) get().showToast(err.message, 'error')
    }
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
