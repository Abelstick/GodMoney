import { accountService } from '@/services/accountService'

export const createAccountSlice = (set, get) => ({
  accounts: [],
  accountsLoading: false,

  fetchAccounts: async () => {
    set({ accountsLoading: true })
    try {
      const data = await accountService.getAll()
      set({ accounts: data, accountsLoading: false })
    } catch (err) {
      set({ accountsLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  addAccount: async (payload) => {
    const data = await accountService.create(payload)
    set((s) => ({ accounts: [...s.accounts, data] }))
    get().showToast('Cuenta creada', 'success')
    return data
  },

  updateAccount: async (id, payload) => {
    const data = await accountService.update(id, payload)
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? data : a)) }))
    get().showToast('Cuenta actualizada', 'success')
    return data
  },

  removeAccount: async (id) => {
    await accountService.remove(id)
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }))
    get().showToast('Cuenta eliminada', 'info')
  },

  // Usado internamente cuando un préstamo/pago ajusta el saldo de una cuenta,
  // para que la UI refleje el nuevo balance sin tener que refetchar todo.
  patchAccountBalance: (accountId, account) => {
    if (!account) return
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, ...account } : a)) }))
  },
})
