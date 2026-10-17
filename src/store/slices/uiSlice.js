import { format } from 'date-fns'

export const createUiSlice = (set) => ({
  activeMonth: format(new Date(), 'yyyy-MM'),
  setActiveMonth: (month) => set({ activeMonth: month }),

  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toast: null,
  // `action` ({ label, onClick }) agrega un botón al aviso, p. ej. "Deshacer".
  showToast: (message, type = 'info', action) =>
    set({ toast: { message, type, action, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
})
