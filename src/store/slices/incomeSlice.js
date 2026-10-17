import { incomeService } from '@/services/incomeService'

export const createIncomeSlice = (set, get) => ({
  incomes: [],
  incomesRange: null,
  incomesLoading: false,
  incomesError: null,

  fetchIncomes: async (from, to) => {
    set({ incomesLoading: true, incomesError: null })
    try {
      const data = await incomeService.getByMonth(from, to)
      set({ incomes: data, incomesRange: { from, to }, incomesLoading: false })
    } catch (err) {
      set({ incomesError: err.message, incomesLoading: false })
    }
  },

  addIncome: async (payload) => {
    const data = await incomeService.create(payload)
    set((s) => ({ incomes: [data, ...s.incomes] }))
    get().showToast('Ingreso registrado', 'success')
    return data
  },

  updateIncome: async (id, payload) => {
    const data = await incomeService.update(id, payload)
    set((s) => ({
      incomes: s.incomes.map((i) => (i.id === id ? data : i)),
    }))
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
    await incomeService.remove(id)
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }))
    get().showToast('Ingreso eliminado', 'info', previous && {
      label: 'Deshacer',
      onClick: () => get().restoreIncomes([previous]),
    })
  },

  removeManyIncomes: async (ids) => {
    const previous = get().incomes.filter((i) => ids.includes(i.id))
    await incomeService.removeMany(ids)
    set((s) => ({ incomes: s.incomes.filter((i) => !ids.includes(i.id)) }))
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
      get().showToast(restored.length > 1 ? `${restored.length} ingresos restaurados` : 'Ingreso restaurado', 'success')
    } catch (err) {
      get().showToast(`No se pudo deshacer: ${err.message}`, 'error')
    }
  },
})
