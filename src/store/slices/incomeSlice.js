import { incomeService } from '@/services/incomeService'
import { offlineQueue, mergePending, isRetryableError } from '@/lib/offlineQueue'

// Los ingresos con cuenta suman a su saldo vía trigger en BD; se refrescan las
// cuentas para que objetivos y patrimonio reflejen el cambio al instante.
async function refreshAccounts(get, ...incomes) {
  if (incomes.some((i) => i?.account_id)) await get().fetchAccounts()
}

export const createIncomeSlice = (set, get) => ({
  incomes: [],
  incomesRange: null,
  incomesLoading: false,
  incomesError: null,

  fetchIncomes: async (from, to) => {
    set({ incomesLoading: true, incomesError: null })
    try {
      const data = await incomeService.getByMonth(from, to)
      // Los ingresos guardados sin conexión siguen visibles hasta que se sincronicen.
      const rows = mergePending(data, offlineQueue.pendingRows('income', from, to))
      set({ incomes: rows, incomesRange: { from, to }, incomesLoading: false })
    } catch (err) {
      set({ incomesError: err.message, incomesLoading: false })
    }
  },

  addIncome: async (payload) => {
    // El id se genera aquí para que un reintento tras un fallo de red no duplique el ingreso.
    const body = { ...payload, id: crypto.randomUUID() }
    if (globalThis.navigator?.onLine === false) return get().queueOffline('income', body)
    let data
    try {
      data = await incomeService.create(body)
    } catch (err) {
      if (isRetryableError(err)) return get().queueOffline('income', body)
      throw err
    }
    set((s) => ({ incomes: [data, ...s.incomes] }))
    await refreshAccounts(get, data)
    get().showToast(data.account_id ? `Ingreso registrado y sumado a ${data.account?.name ?? 'la cuenta'}` : 'Ingreso registrado', 'success')
    return data
  },

  updateIncome: async (id, payload) => {
    const previous = get().incomes.find((i) => i.id === id)
    const data = await incomeService.update(id, payload)
    set((s) => ({
      incomes: s.incomes.map((i) => (i.id === id ? data : i)),
    }))
    await refreshAccounts(get, previous, data)
    get().showToast('Ingreso actualizado', 'success')
    return data
  },

  // Mismo cambio (p. ej. categoría) para varios ingresos.
  updateManyIncomes: async (ids, patch, message) => {
    const rows = await incomeService.updateMany(ids, patch)
    const byId = new Map(rows.map((r) => [r.id, r]))
    set((s) => ({ incomes: s.incomes.map((i) => byId.get(i.id) ?? i) }))
    get().showToast(message ?? `${rows.length} ingresos actualizados`, 'success')
  },

  // Agrega una etiqueta a cada ingreso conservando las que ya tiene.
  addTagToIncomes: async (ids, tag) => {
    const targets = get().incomes.filter((i) => ids.includes(i.id) && !i.tags?.includes(tag))
    const rows = await Promise.all(
      targets.map((i) => incomeService.update(i.id, { tags: [...(i.tags ?? []), tag] }))
    )
    const byId = new Map(rows.map((r) => [r.id, r]))
    set((s) => ({ incomes: s.incomes.map((i) => byId.get(i.id) ?? i) }))
    get().showToast(rows.length ? `Etiqueta #${tag} agregada a ${rows.length}` : 'Ya tenían esa etiqueta', 'success')
  },

  removeIncome: async (id) => {
    const previous = get().incomes.find((i) => i.id === id)
    // Un ingreso pendiente nunca llegó al servidor: basta con quitarlo de la cola.
    if (previous?._pending) return get().discardPending('income', id)
    await incomeService.remove(id)
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }))
    await refreshAccounts(get, previous)
    get().showToast('Ingreso eliminado', 'info', previous && {
      label: 'Deshacer',
      onClick: () => get().restoreIncomes([previous]),
    })
  },

  removeManyIncomes: async (ids) => {
    const previous = get().incomes.filter((i) => ids.includes(i.id))
    await incomeService.removeMany(ids)
    set((s) => ({ incomes: s.incomes.filter((i) => !ids.includes(i.id)) }))
    await refreshAccounts(get, ...previous)
    get().showToast(`${previous.length} ingresos eliminados`, 'info', {
      label: 'Deshacer',
      onClick: () => get().restoreIncomes(previous),
    })
  },

  // "Deshacer": vuelve a insertar los ingresos (con nuevo id) y los muestra si
  // caen dentro del rango que se está viendo.
  restoreIncomes: async (rows) => {
    try {
      const restored = await incomeService.restore(rows)
      const range = get().incomesRange
      const visible = restored.filter((r) => !range || (r.date >= range.from && r.date <= range.to))
      set((s) => ({ incomes: [...visible, ...s.incomes] }))
      await refreshAccounts(get, ...restored)
      get().showToast(restored.length > 1 ? `${restored.length} ingresos restaurados` : 'Ingreso restaurado', 'success')
    } catch (err) {
      get().showToast(`No se pudo deshacer: ${err.message}`, 'error')
    }
  },
})
