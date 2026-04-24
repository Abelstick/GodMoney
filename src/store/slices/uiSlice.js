import { format } from 'date-fns'

export const createUiSlice = (set) => ({
  // Mes activo para filtrar datos (por defecto: mes actual)
  activeMonth: format(new Date(), 'yyyy-MM'),
  setActiveMonth: (month) => set({ activeMonth: month }),

  // Sidebar abierto/cerrado (desktop)
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Notificaciones/toasts
  toast: null,
  showToast: (message, type = 'info') =>
    set({ toast: { message, type, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
})
