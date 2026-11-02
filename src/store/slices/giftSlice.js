import { giftService } from '@/services/giftService'
import { categoryCache } from '@/lib/categoryCache'

function requireOnline() {
  if (globalThis.navigator?.onLine === false) {
    throw new Error('Necesitas conexión para registrar regalos')
  }
}

// El gasto/ingreso se creó en el servidor: se recarga el periodo visible si
// la fecha cae en él, y se olvida la lista de categorías guardada por si la
// RPC creó "Regalos".
async function refreshMovements(get, kind, date) {
  categoryCache.set(kind, null)
  const s = get()
  const range = kind === 'expense' ? s.expensesRange : s.incomesRange
  if (!range || date < range.from || date > range.to) return
  if (kind === 'expense') await s.fetchExpenses(range.from, range.to)
  else await s.fetchIncomes(range.from, range.to)
}

function giftDescription(gift, people) {
  const person = people.find((p) => p.id === gift.person_id)
  return person ? `Regalo para ${person.name}: ${gift.title}` : `Regalo: ${gift.title}`
}

export const createGiftSlice = (set, get) => ({
  giftPeople: [],
  giftOccasions: [],
  gifts: [],
  giftsLoading: false,
  giftsLoaded: false,

  // silent: desde el Resumen un fallo (p. ej. sin la migración 016) no debe molestar.
  fetchGiftData: async ({ silent = false } = {}) => {
    set({ giftsLoading: true })
    try {
      const [giftPeople, giftOccasions, gifts] = await Promise.all([
        giftService.getPeople(),
        giftService.getOccasions(),
        giftService.getGifts(),
      ])
      set({ giftPeople, giftOccasions, gifts, giftsLoading: false, giftsLoaded: true })
    } catch (err) {
      set({ giftsLoading: false })
      if (!silent) get().showToast(err.message, 'error')
    }
  },

  // ── Personas ──
  addGiftPerson: async (payload) => {
    const data = await giftService.createPerson(payload)
    set((s) => ({ giftPeople: [...s.giftPeople, data].sort((a, b) => a.name.localeCompare(b.name)) }))
    get().showToast('Persona agregada', 'success')
    return data
  },

  updateGiftPerson: async (id, payload) => {
    const data = await giftService.updatePerson(id, payload)
    set((s) => ({ giftPeople: s.giftPeople.map((p) => (p.id === id ? data : p)) }))
    // El cumpleaños pudo mover su ocasión: se recargan las ocasiones.
    const giftOccasions = await giftService.getOccasions()
    set({ giftOccasions })
    get().showToast('Persona actualizada', 'success')
    return data
  },

  removeGiftPerson: async (id) => {
    await giftService.removePerson(id)
    set((s) => ({
      giftPeople: s.giftPeople.filter((p) => p.id !== id),
      giftOccasions: s.giftOccasions.filter((o) => o.person_id !== id),
      gifts: s.gifts.map((g) => (g.person_id === id ? { ...g, person_id: null, person: null } : g)),
    }))
    get().showToast('Persona eliminada', 'info')
  },

  // ── Ocasiones ──
  addGiftOccasion: async (payload) => {
    const data = await giftService.createOccasion(payload)
    set((s) => ({ giftOccasions: [...s.giftOccasions, data] }))
    get().showToast('Ocasión creada', 'success')
    return data
  },

  updateGiftOccasion: async (id, payload, message = 'Ocasión actualizada') => {
    const data = await giftService.updateOccasion(id, payload)
    set((s) => ({ giftOccasions: s.giftOccasions.map((o) => (o.id === id ? data : o)) }))
    if (message) get().showToast(message, 'success')
    return data
  },

  removeGiftOccasion: async (id) => {
    await giftService.removeOccasion(id)
    set((s) => ({
      giftOccasions: s.giftOccasions.filter((o) => o.id !== id),
      gifts: s.gifts.map((g) => (g.occasion_id === id ? { ...g, occasion_id: null, occasion: null } : g)),
    }))
    get().showToast('Ocasión eliminada', 'info')
  },

  // Crea un objetivo de ahorro por el presupuesto del ciclo y lo vincula a ese
  // año: al pasar la fecha, la ocasión deja de usarlo y ofrece uno nuevo.
  createOccasionSavingsGoal: async (occasion, { year, date }) => {
    const goal = await get().addGoal({
      name: `Regalos · ${occasion.name} ${year}`,
      target_amount: Number(occasion.budget),
      target_date: date,
      color: '#ec4899',
    })
    return get().updateGiftOccasion(occasion.id, { goal_id: goal.id, goal_year: year }, null)
  },

  // ── Regalos ──
  addGift: async (payload) => {
    requireOnline()
    const data = await giftService.createGift(payload)
    set((s) => ({ gifts: [data, ...s.gifts] }))
    get().showToast(payload.status === 'IDEA' ? 'Idea guardada' : 'Regalo guardado', 'success')
    return data
  },

  updateGift: async (id, payload, message = 'Regalo actualizado') => {
    const data = await giftService.updateGift(id, payload)
    set((s) => ({ gifts: s.gifts.map((g) => (g.id === id ? data : g)) }))
    if (message) get().showToast(message, 'success')
    return data
  },

  removeGift: async (id) => {
    await giftService.removeGift(id)
    set((s) => ({ gifts: s.gifts.filter((g) => g.id !== id) }))
    get().showToast('Regalo eliminado', 'info')
  },

  // Marca un regalo como comprado y registra el gasto vinculado en una sola
  // transacción (RPC purchase_gift). `gift` = columnas de gifts, con id si ya existe.
  purchaseGift: async (gift, { amount, date, category_id, createExpense = true }) => {
    requireOnline()
    const { id, ...fields } = gift
    const data = await giftService.purchase({
      giftId: id,
      gift: fields,
      amount,
      date,
      categoryId: category_id,
      createExpense,
      description: giftDescription(gift, get().giftPeople),
    })
    set((s) => ({
      gifts: id ? s.gifts.map((g) => (g.id === id ? data : g)) : [data, ...s.gifts],
    }))
    if (data.expense_id) await refreshMovements(get, 'expense', date)
    get().showToast(data.expense_id ? 'Regalo comprado y gasto registrado' : 'Regalo marcado como comprado', 'success')
    return data
  },

  // Registra un regalo recibido; si fue dinero, puede crear el ingreso (RPC receive_gift).
  receiveGift: async (gift, { createIncome = false, category_id } = {}) => {
    requireOnline()
    const data = await giftService.receive({
      gift,
      createIncome: gift.is_money && createIncome,
      categoryId: category_id,
      description: giftDescription(gift, get().giftPeople).replace('Regalo para', 'Regalo de'),
    })
    set((s) => ({ gifts: [data, ...s.gifts] }))
    if (data.income_id) await refreshMovements(get, 'income', gift.date)
    get().showToast(data.income_id ? 'Regalo recibido y ingreso registrado' : 'Regalo recibido guardado', 'success')
    return data
  },
})
