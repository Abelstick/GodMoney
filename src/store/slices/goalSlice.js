import { goalService } from '@/services/goalService'

export const createGoalSlice = (set, get) => ({
  goals: [],
  goalsLoading: false,

  fetchGoals: async () => {
    set({ goalsLoading: true })
    try {
      const data = await goalService.getAll()
      set({ goals: data, goalsLoading: false })
    } catch (err) {
      set({ goalsLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  addGoal: async (payload) => {
    const data = await goalService.create(payload)
    set((s) => ({ goals: [data, ...s.goals] }))
    get().showToast('Objetivo creado', 'success')
    return data
  },

  updateGoal: async (id, payload) => {
    const data = await goalService.update(id, payload)
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? data : g)) }))
    get().showToast('Objetivo actualizado', 'success')
    return data
  },

  addGoalProgress: async (id, amount) => {
    const data = await goalService.addProgress(id, amount)
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? data : g)) }))
    if (data.status === 'completed') {
      get().showToast('¡Objetivo completado! 🎉', 'success')
    } else {
      get().showToast('Progreso guardado', 'success')
    }
    return data
  },

  removeGoal: async (id) => {
    await goalService.remove(id)
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
    get().showToast('Objetivo eliminado', 'info')
  },
})
