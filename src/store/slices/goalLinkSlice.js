import { goalAccountLinkService } from '@/services/goalAccountLinkService'

export const createGoalLinkSlice = (set, get) => ({
  goalAccountLinks: [],
  goalAccountLinksLoading: false,

  fetchGoalAccountLinks: async () => {
    set({ goalAccountLinksLoading: true })
    try {
      const data = await goalAccountLinkService.getAll()
      set({ goalAccountLinks: data, goalAccountLinksLoading: false })
    } catch (err) {
      set({ goalAccountLinksLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  linkGoalAccount: async (goalId, accountId, allocatedAmount) => {
    const data = await goalAccountLinkService.link(goalId, accountId, allocatedAmount)
    set((s) => ({
      goalAccountLinks: [...s.goalAccountLinks.filter((l) => l.id !== data.id), data],
    }))
    get().showToast('Cuenta vinculada al objetivo', 'success')
    return data
  },

  unlinkGoalAccount: async (id) => {
    await goalAccountLinkService.unlink(id)
    set((s) => ({ goalAccountLinks: s.goalAccountLinks.filter((l) => l.id !== id) }))
    get().showToast('Vínculo eliminado', 'info')
  },
})
