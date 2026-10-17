import { expenseService } from '@/services/expenseService'
import { incomeService } from '@/services/incomeService'
import { offlineQueue, toPendingRow, isRetryableError, isDuplicateKey } from '@/lib/offlineQueue'

const SERVICES = { expense: expenseService, income: incomeService }

export const createOfflineSlice = (set, get) => ({
  offlinePending: 0,   // movimientos esperando sincronizarse (incluye los rechazados)
  offlineFailed: 0,    // de esos, los que el servidor rechazó
  offlineSyncing: false,

  refreshOfflineCount: () => {
    const items = offlineQueue.all()
    set({ offlinePending: items.length, offlineFailed: items.filter((i) => i.error).length })
  },

  // Guarda un movimiento en el dispositivo y lo muestra ya en la lista.
  queueOffline: (kind, payload) => {
    const item = { id: payload.id, kind, payload, queuedAt: new Date().toISOString() }
    offlineQueue.add(item)
    get().refreshOfflineCount()

    const row = toPendingRow(item)
    const listKey  = kind === 'expense' ? 'expenses' : 'incomes'
    const rangeKey = kind === 'expense' ? 'expensesRange' : 'incomesRange'
    const range = get()[rangeKey]
    if (!range || (payload.date >= range.from && payload.date <= range.to)) {
      set((s) => ({ [listKey]: [row, ...s[listKey]] }))
    }
    get().showToast('Sin conexión: guardado en este dispositivo, se sincronizará solo', 'info')
    return row
  },

  // Descarta un movimiento pendiente (nunca llegó al servidor).
  discardPending: (kind, id) => {
    offlineQueue.remove(id)
    const listKey = kind === 'expense' ? 'expenses' : 'incomes'
    set((s) => ({ [listKey]: s[listKey].filter((r) => r.id !== id) }))
    get().refreshOfflineCount()
    get().showToast('Movimiento pendiente descartado', 'info')
  },

  // Envía la cola al servidor en orden. Se detiene al primer fallo de conexión;
  // lo que el servidor rechaza se conserva marcado con su error para no perder el dato.
  syncOfflineQueue: async () => {
    if (get().offlineSyncing || globalThis.navigator?.onLine === false) return
    const items = offlineQueue.all().filter((i) => !i.error)
    if (!items.length) return

    set({ offlineSyncing: true })
    let synced = 0
    let failed = 0
    try {
      for (const item of items) {
        try {
          await SERVICES[item.kind].create(item.payload)
          offlineQueue.remove(item.id)
          synced++
        } catch (err) {
          if (isDuplicateKey(err)) {
            offlineQueue.remove(item.id) // un intento anterior sí llegó
            synced++
          } else if (isRetryableError(err)) {
            break
          } else {
            offlineQueue.markFailed(item.id, err.message ?? 'Rechazado por el servidor')
            failed++
          }
        }
      }
    } finally {
      set({ offlineSyncing: false })
      get().refreshOfflineCount()
    }

    if (synced + failed === 0) return
    const s = get()
    if (s.expensesRange) s.fetchExpenses(s.expensesRange.from, s.expensesRange.to)
    if (s.incomesRange)  s.fetchIncomes(s.incomesRange.from, s.incomesRange.to)
    s.fetchAccounts?.()
    if (synced) s.showToast(`${synced} movimiento${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''}`, 'success')
    if (failed) s.showToast(`${failed} movimiento${failed !== 1 ? 's' : ''} no se pudo${failed !== 1 ? 'ieron' : ''} sincronizar`, 'error')
  },
})
