import { incomeService } from '@/services/incomeService'

export const createIncomeSlice = (set, get) => ({
  incomes: [],
  incomesLoading: false,
  incomesError: null,

  fetchIncomes: async (from, to) => {
    set({ incomesLoading: true, incomesError: null })
    try {
      const data = await incomeService.getByMonth(from, to)
      set({ incomes: data, incomesLoading: false })
    } catch (err) {
      set({ incomesError: err.message, incomesLoading: false })
    }
  },

  addIncome: async (payload) => {
    const data = await incomeService.create(payload)
    set((s) => ({ incomes: [data, ...s.incomes] }))
    get().showToast('Ingreso registrado', 'success')
    return data
  },

  updateIncome: async (id, payload) => {
    const data = await incomeService.update(id, payload)
    set((s) => ({
      incomes: s.incomes.map((i) => (i.id === id ? data : i)),
    }))
    get().showToast('Ingreso actualizado', 'success')
    return data
  },

  removeIncome: async (id) => {
    await incomeService.remove(id)
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }))
    get().showToast('Ingreso eliminado', 'info')
  },
})
