import { transferService } from '@/services/transferService'

// Las transferencias mueven saldo vía trigger en BD, así que tras cada cambio
// se refrescan las cuentas para que patrimonio y tarjetas muestren el saldo real.
export const createTransferSlice = (set, get) => ({
  transfers: [],
  transfersLoading: false,

  fetchTransfers: async () => {
    set({ transfersLoading: true })
    try {
      const data = await transferService.getRecent()
      set({ transfers: data, transfersLoading: false })
    } catch (err) {
      set({ transfersLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  addTransfer: async (payload) => {
    const data = await transferService.create(payload)
    set((s) => ({ transfers: [data, ...s.transfers] }))
    await get().fetchAccounts()
    get().showToast('Transferencia registrada', 'success')
    return data
  },

  removeTransfer: async (id) => {
    await transferService.remove(id)
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) }))
    await get().fetchAccounts()
    get().showToast('Transferencia eliminada y saldos revertidos', 'info')
  },
})
