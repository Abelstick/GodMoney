import { savingsWithdrawalService } from '@/services/savingsWithdrawalService'
import { formatCurrency } from '@/lib/formatters'

// Deudas con tu ahorro. repaid_amount/status los calcula la BD a partir de las
// transferencias de reposición, así que tras reponer se vuelve a pedir la lista.
export const createSavingsWithdrawalSlice = (set, get) => ({
  savingsWithdrawals: [],
  savingsWithdrawalsLoading: false,

  fetchSavingsWithdrawals: async () => {
    set({ savingsWithdrawalsLoading: true })
    try {
      const data = await savingsWithdrawalService.getAll()
      set({ savingsWithdrawals: data, savingsWithdrawalsLoading: false })
    } catch (err) {
      set({ savingsWithdrawalsLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  addSavingsWithdrawal: async (payload) => {
    const data = await savingsWithdrawalService.create(payload)
    set((s) => ({ savingsWithdrawals: [data, ...s.savingsWithdrawals] }))
    get().showToast('Monto por reponer registrado', 'success')
    return data
  },

  repaySavings: async (payload) => {
    const applied = await savingsWithdrawalService.repay(payload)
    await Promise.all([get().fetchAccounts(), get().fetchSavingsWithdrawals(), get().fetchTransfers()])
    const extra = Number(payload.amount) - applied
    get().showToast(
      extra > 0.004
        ? `Repusiste ${formatCurrency(applied)} y ${formatCurrency(extra)} quedó como aporte extra`
        : `Repusiste ${formatCurrency(applied)}`,
      'success',
    )
    return applied
  },

  forgiveSavingsWithdrawal: async (id) => {
    const data = await savingsWithdrawalService.forgive(id)
    set((s) => ({ savingsWithdrawals: s.savingsWithdrawals.map((w) => (w.id === id ? data : w)) }))
    get().showToast('Deuda cerrada sin reponer', 'info')
  },

  reopenSavingsWithdrawal: async (id) => {
    const data = await savingsWithdrawalService.reopen(id)
    set((s) => ({ savingsWithdrawals: s.savingsWithdrawals.map((w) => (w.id === id ? data : w)) }))
    get().showToast('Deuda reabierta', 'info')
  },

  removeSavingsWithdrawal: async (id) => {
    await savingsWithdrawalService.remove(id)
    set((s) => ({ savingsWithdrawals: s.savingsWithdrawals.filter((w) => w.id !== id) }))
    get().showToast('Deuda eliminada', 'info')
  },
})
