import { savingsWithdrawalService } from '@/services/savingsWithdrawalService'
import { accountService } from '@/services/accountService'
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

  // deduct_from_balance: además resta el monto del saldo de la cuenta (para
  // retiros anteriores que el saldo de la app todavía no reflejaba).
  addSavingsWithdrawal: async ({ deduct_from_balance = false, ...payload }) => {
    const data = await savingsWithdrawalService.create(payload)
    set((s) => ({ savingsWithdrawals: [data, ...s.savingsWithdrawals] }))
    if (!deduct_from_balance) {
      get().showToast('Monto por reponer registrado', 'success')
      return data
    }
    try {
      const account = await accountService.adjustBalance(data.savings_account_id, -Number(data.amount))
      get().patchAccountBalance(data.savings_account_id, account)
      get().showToast('Monto por reponer registrado y descontado del saldo', 'success')
    } catch (err) {
      // La deuda ya quedó guardada: solo falta el ajuste de saldo.
      get().showToast(`Se registró lo que falta reponer, pero no se pudo descontar del saldo: ${err.message}`, 'error')
    }
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
