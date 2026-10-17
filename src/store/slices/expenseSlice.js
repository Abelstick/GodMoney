import { expenseService } from '@/services/expenseService'
import { offlineQueue, mergePending, isRetryableError } from '@/lib/offlineQueue'

// Los gastos de ahorro con cuenta destino mueven el saldo de esa cuenta vía
// trigger en BD; se refrescan las cuentas para que objetivos y patrimonio
// reflejen el cambio al instante.
function touchesAccount(...expenses) {
  return expenses.some((e) => e?.savings_account_id)
}

export const createExpenseSlice = (set, get) => ({
  expenses: [],
  expensesRange: null,
  expensesLoading: false,
  expensesError: null,

  fetchExpenses: async (from, to) => {
    set({ expensesLoading: true, expensesError: null })
    try {
      const data = await expenseService.getByMonth(from, to)
      // Los gastos guardados sin conexión siguen visibles hasta que se sincronicen.
      const rows = mergePending(data, offlineQueue.pendingRows('expense', from, to))
      set({ expenses: rows, expensesRange: { from, to }, expensesLoading: false })
    } catch (err) {
      set({ expensesError: err.message, expensesLoading: false })
    }
  },

  addExpense: async (payload) => {
    // El id se genera aquí para que un reintento tras un fallo de red no duplique el gasto.
    const body = { ...payload, id: crypto.randomUUID() }
    if (globalThis.navigator?.onLine === false) return get().queueOffline('expense', body)
    let data
    try {
      data = await expenseService.create(body)
    } catch (err) {
      if (isRetryableError(err)) return get().queueOffline('expense', body)
      throw err
    }
    set((s) => ({ expenses: [data, ...s.expenses] }))
    if (touchesAccount(data)) await get().fetchAccounts()
    get().showToast(touchesAccount(data) ? 'Ahorro registrado y sumado a la cuenta' : 'Gasto registrado', 'success')
    return data
  },

  updateExpense: async (id, payload) => {
    const previous = get().expenses.find((e) => e.id === id)
    const data = await expenseService.update(id, payload)
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? data : e)),
    }))
    if (touchesAccount(previous, data)) await get().fetchAccounts()
    get().showToast('Gasto actualizado', 'success')
    return data
  },

  // Mismo cambio (p. ej. categoría) para varios gastos.
  updateManyExpenses: async (ids, patch, message) => {
    const previous = get().expenses.filter((e) => ids.includes(e.id))
    const rows = await expenseService.updateMany(ids, patch)
    const byId = new Map(rows.map((r) => [r.id, r]))
    set((s) => ({ expenses: s.expenses.map((e) => byId.get(e.id) ?? e) }))
    if (touchesAccount(...previous, ...rows)) await get().fetchAccounts()
    get().showToast(message ?? `${rows.length} gastos actualizados`, 'success')
  },

  // Agrega una etiqueta a cada gasto conservando las que ya tiene.
  addTagToExpenses: async (ids, tag) => {
    const targets = get().expenses.filter((e) => ids.includes(e.id) && !e.tags?.includes(tag))
    const rows = await Promise.all(
      targets.map((e) => expenseService.update(e.id, { tags: [...(e.tags ?? []), tag] }))
    )
    const byId = new Map(rows.map((r) => [r.id, r]))
    set((s) => ({ expenses: s.expenses.map((e) => byId.get(e.id) ?? e) }))
    get().showToast(rows.length ? `Etiqueta #${tag} agregada a ${rows.length}` : 'Ya tenían esa etiqueta', 'success')
  },

  removeExpense: async (id) => {
    const previous = get().expenses.find((e) => e.id === id)
    // Un gasto pendiente nunca llegó al servidor: basta con quitarlo de la cola.
    if (previous?._pending) return get().discardPending('expense', id)
    await expenseService.remove(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    if (touchesAccount(previous)) await get().fetchAccounts()
    get().showToast('Gasto eliminado', 'info', previous && {
      label: 'Deshacer',
      onClick: () => get().restoreExpenses([previous]),
    })
  },

  removeManyExpenses: async (ids) => {
    const previous = get().expenses.filter((e) => ids.includes(e.id))
    await expenseService.removeMany(ids)
    set((s) => ({ expenses: s.expenses.filter((e) => !ids.includes(e.id)) }))
    if (touchesAccount(...previous)) await get().fetchAccounts()
    get().showToast(`${previous.length} gastos eliminados`, 'info', {
      label: 'Deshacer',
      onClick: () => get().restoreExpenses(previous),
    })
  },

  // "Deshacer": vuelve a insertar los gastos (con nuevo id) y los muestra si
  // caen dentro del rango que se está viendo.
  restoreExpenses: async (rows) => {
    try {
      const restored = await expenseService.restore(rows)
      const range = get().expensesRange
      const visible = restored.filter((r) => !range || (r.date >= range.from && r.date <= range.to))
      set((s) => ({ expenses: [...visible, ...s.expenses] }))
      if (touchesAccount(...restored)) await get().fetchAccounts()
      get().showToast(restored.length > 1 ? `${restored.length} gastos restaurados` : 'Gasto restaurado', 'success')
    } catch (err) {
      get().showToast(`No se pudo deshacer: ${err.message}`, 'error')
    }
  },
})
