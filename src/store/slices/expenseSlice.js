import { expenseService } from '@/services/expenseService'
import { offlineQueue, mergePending, isRetryableError } from '@/lib/offlineQueue'

// Los gastos con cuenta (destino del ahorro o "pagado desde") mueven saldos
// vía trigger en BD; se refrescan las cuentas para que objetivos y patrimonio
// reflejen el cambio al instante. Pagar desde una cuenta marcando "Lo voy a
// reponer" además crea o ajusta una deuda con esa cuenta, así que también se refrescan las deudas.
function touchesAccount(...expenses) {
  return expenses.some((e) => e?.savings_account_id || e?.paid_from_account_id)
}

function touchesSavingsDebt(...expenses) {
  return expenses.some((e) => e?.paid_from_account_id)
}

async function refreshAccounts(get, ...expenses) {
  if (!touchesAccount(...expenses)) return
  await Promise.all([
    get().fetchAccounts(),
    touchesSavingsDebt(...expenses) ? get().fetchSavingsWithdrawals() : null,
  ])
}

function addedMessage(e) {
  if (e.paid_from_account_id && e.repay_to_savings) return `Gasto registrado y sumado a lo que falta reponer a ${e.paid_from_account?.name ?? 'la cuenta'}`
  if (e.paid_from_account_id) return `Gasto registrado y descontado de ${e.paid_from_account?.name ?? 'la cuenta'}`
  if (e.savings_account_id) return 'Ahorro registrado y sumado a la cuenta'
  return 'Gasto registrado'
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
    await refreshAccounts(get, data)
    get().showToast(addedMessage(data), 'success')
    return data
  },

  // Gasto dividido entre categorías: `rows` son las partes ya armadas (con id y
  // split_group_id estables). Se guardan en una transacción: o todas o ninguna.
  addSplitExpense: async (rows) => {
    const queueAll = () => {
      rows.forEach((r) => get().queueOffline('expense', r))
      return rows
    }
    if (globalThis.navigator?.onLine === false) return queueAll()
    let data
    try {
      data = await expenseService.saveSplitGroup(rows[0].split_group_id, rows)
    } catch (err) {
      // Si la respuesta se perdió pero sí se guardó, al sincronizar cada parte
      // choca por id duplicado y se da por sincronizada: no se duplica nada.
      if (isRetryableError(err)) return queueAll()
      throw err
    }
    const ids = new Set(data.map((r) => r.id))
    set((s) => ({ expenses: [...data, ...s.expenses.filter((e) => !ids.has(e.id))] }))
    await refreshAccounts(get, ...data)
    get().showToast(`Gasto dividido en ${data.length} categorías`, 'success')
    return data
  },

  // Guarda la edición de un gasto dividido: `oldRows` son las partes que había y
  // `newRows` las que quedan. Si queda una sola parte sin grupo, el gasto deja
  // de estar dividido. Es atómico e idempotente: si falla, no cambió nada y se
  // puede volver a intentar con el mismo formulario.
  saveSplitGroup: async (groupId, oldRows, newRows) => {
    let data
    try {
      data = await expenseService.saveSplitGroup(groupId, newRows)
    } catch (err) {
      if (isRetryableError(err)) throw new Error('Sin conexión: no se guardó ningún cambio. Vuelve a intentarlo.')
      throw err
    }
    const byId = new Map(data.map((r) => [r.id, r]))
    const removed = new Set(oldRows.map((r) => r.id).filter((id) => !byId.has(id)))
    set((s) => ({
      expenses: [
        ...data.filter((r) => !s.expenses.some((e) => e.id === r.id)),
        ...s.expenses.filter((e) => !removed.has(e.id)).map((e) => byId.get(e.id) ?? e),
      ],
    }))
    await refreshAccounts(get, ...oldRows, ...data)
    get().showToast(newRows.length > 1 ? `Gasto dividido actualizado (${newRows.length} partes)` : 'Gasto actualizado', 'success')
  },

  updateExpense: async (id, payload) => {
    const previous = get().expenses.find((e) => e.id === id)
    const data = await expenseService.update(id, payload)
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? data : e)),
    }))
    await refreshAccounts(get, previous, data)
    get().showToast('Gasto actualizado', 'success')
    return data
  },

  // Mismo cambio (p. ej. categoría) para varios gastos.
  updateManyExpenses: async (ids, patch, message) => {
    const previous = get().expenses.filter((e) => ids.includes(e.id))
    const rows = await expenseService.updateMany(ids, patch)
    const byId = new Map(rows.map((r) => [r.id, r]))
    set((s) => ({ expenses: s.expenses.map((e) => byId.get(e.id) ?? e) }))
    await refreshAccounts(get, ...previous, ...rows)
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
    if (previous?._pending) {
      const pendingGroup = previous.split_group_id
        ? get().expenses.filter((e) => e._pending && e.split_group_id === previous.split_group_id)
        : [previous]
      pendingGroup.forEach((e) => get().discardPending('expense', e.id))
      return
    }
    // Una parte de un gasto dividido se elimina junto con las demás.
    if (previous?.split_group_id) return get().removeSplitGroup(previous.split_group_id)
    await expenseService.remove(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    await refreshAccounts(get, previous)
    get().showToast('Gasto eliminado', 'info', previous && {
      label: 'Deshacer',
      onClick: () => get().restoreExpenses([previous]),
    })
  },

  // Un solo DELETE por grupo: o se borran todas las partes o ninguna, y
  // repetirlo no hace nada.
  removeSplitGroup: async (groupId) => {
    const rows = await expenseService.removeGroup(groupId)
    set((s) => ({ expenses: s.expenses.filter((e) => e.split_group_id !== groupId) }))
    if (!rows.length) return
    await refreshAccounts(get, ...rows)
    get().showToast(`Gasto dividido eliminado (${rows.length} partes)`, 'info', {
      label: 'Deshacer',
      onClick: () => get().restoreExpenses(rows),
    })
  },

  removeManyExpenses: async (ids) => {
    const previous = get().expenses.filter((e) => ids.includes(e.id))
    await expenseService.removeMany(ids)
    set((s) => ({ expenses: s.expenses.filter((e) => !ids.includes(e.id)) }))
    await refreshAccounts(get, ...previous)
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
      await refreshAccounts(get, ...restored)
      get().showToast(restored.length > 1 ? `${restored.length} gastos restaurados` : 'Gasto restaurado', 'success')
    } catch (err) {
      get().showToast(`No se pudo deshacer: ${err.message}`, 'error')
    }
  },
})
