import { expenseService } from '@/services/expenseService'

export const createExpenseSlice = (set, get) => ({
  expenses: [],
  expensesLoading: false,
  expensesError: null,

  fetchExpenses: async (from, to) => {
    set({ expensesLoading: true, expensesError: null })
    try {
      const data = await expenseService.getByMonth(from, to)
      set({ expenses: data, expensesLoading: false })
    } catch (err) {
      set({ expensesError: err.message, expensesLoading: false })
    }
  },

  addExpense: async (payload) => {
    const data = await expenseService.create(payload)
    set((s) => ({ expenses: [data, ...s.expenses] }))
    get().showToast('Gasto registrado', 'success')
    return data
  },

  updateExpense: async (id, payload) => {
    const data = await expenseService.update(id, payload)
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? data : e)),
    }))
    get().showToast('Gasto actualizado', 'success')
    return data
  },

  removeExpense: async (id) => {
    await expenseService.remove(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    get().showToast('Gasto eliminado', 'info')
  },
})
