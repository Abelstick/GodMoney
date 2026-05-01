import { format } from 'date-fns'

export const createUiSlice = (set) => ({
  activeMonth: format(new Date(), 'yyyy-MM'),
  setActiveMonth: (month) => set({ activeMonth: month }),

  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toast: null,
  showToast: (message, type = 'info') =>
    set({ toast: { message, type, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
})
