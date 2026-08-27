import { creditScoreService } from '@/services/creditScoreService'

export const createCreditScoreSlice = (set, get) => ({
  creditScores: [],
  creditScoresLoading: false,

  fetchCreditScores: async () => {
    set({ creditScoresLoading: true })
    try {
      const data = await creditScoreService.getAll()
      set({ creditScores: data, creditScoresLoading: false })
    } catch (err) {
      set({ creditScoresLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  addCreditScore: async (payload) => {
    const data = await creditScoreService.create(payload)
    set((s) => ({
      creditScores: [...s.creditScores, data].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date)),
    }))
    get().showToast('Score registrado', 'success')
    return data
  },

  updateCreditScore: async (id, payload) => {
    const data = await creditScoreService.update(id, payload)
    set((s) => ({
      creditScores: s.creditScores
        .map((c) => (c.id === id ? data : c))
        .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date)),
    }))
    get().showToast('Registro actualizado', 'success')
    return data
  },

  removeCreditScore: async (id) => {
    await creditScoreService.remove(id)
    set((s) => ({ creditScores: s.creditScores.filter((c) => c.id !== id) }))
    get().showToast('Registro eliminado', 'info')
  },
})
