import { giftService } from '@/services/giftService'
import { categoryService } from '@/services/categoryService'
import { categoryCache } from '@/lib/categoryCache'

const GIFT_CATEGORY_NAME = 'Regalos'

function requireOnline() {
  if (globalThis.navigator?.onLine === false) {
    throw new Error('Necesitas conexión para registrar regalos')
  }
}

// Categoría "Regalos" del tipo pedido; se crea la primera vez si no existe
// para que los gastos de regalos se agrupen solos en presupuestos y reportes.
async function ensureGiftCategory(type) {
  const list = await categoryService.getAll(type)
  const found = list.find((c) => c.name.trim().toLowerCase() === GIFT_CATEGORY_NAME.toLowerCase())
  if (found) return found.id
  const created = await categoryService.create({ name: GIFT_CATEGORY_NAME, type, color: '#a855f7', icon: 'gift' })
  categoryCache.set(type, [...list, created])
  return created.id
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

  // Crea un objetivo de ahorro por el presupuesto del ciclo y lo vincula.
  createOccasionSavingsGoal: async (occasion, { year, date }) => {
    const goal = await get().addGoal({
      name: `Regalos · ${occasion.name} ${year}`,
      target_amount: Number(occasion.budget),
      target_date: date,
      color: '#ec4899',
    })
    return get().updateGiftOccasion(occasion.id, { goal_id: goal.id }, null)
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

  // Marca un regalo como comprado y registra el gasto vinculado.
  // `gift` puede ser uno existente (con id) o uno nuevo (sin id).
  purchaseGift: async (gift, { amount, date, category_id, createExpense = true }) => {
    requireOnline()
    let expenseId = null
    if (createExpense) {
      const categoryId = category_id || await ensureGiftCategory('expense')
      const expense = await get().addExpense({
        amount: Number(amount),
        date,
        category_id: categoryId,
        description: giftDescription(gift, get().giftPeople),
        tags: ['regalo'],
      })
      expenseId = expense?._pending ? null : expense?.id ?? null
    }
    // `fields` son columnas de gifts (sin relaciones embebidas).
    const { id, ...fields } = gift
    const row = {
      ...fields, status: 'DONE', direction: 'GIVEN', amount: Number(amount), date, expense_id: expenseId,
    }
    const data = id ? await giftService.updateGift(id, row) : await giftService.createGift(row)
    set((s) => ({
      gifts: id ? s.gifts.map((g) => (g.id === id ? data : g)) : [data, ...s.gifts],
    }))
    get().showToast(expenseId ? 'Regalo comprado y gasto registrado' : 'Regalo marcado como comprado', 'success')
    return data
  },

  // Registra un regalo recibido; si fue dinero, puede crear el ingreso.
  receiveGift: async (gift, { createIncome = false, category_id } = {}) => {
    requireOnline()
    let incomeId = null
    if (gift.is_money && createIncome && gift.amount) {
      const categoryId = category_id || await ensureGiftCategory('income')
      const income = await get().addIncome({
        amount: Number(gift.amount),
        date: gift.date,
        category_id: categoryId,
        description: giftDescription(gift, get().giftPeople).replace('Regalo para', 'Regalo de'),
        tags: ['regalo'],
      })
      incomeId = income?._pending ? null : income?.id ?? null
    }
    const data = await giftService.createGift({ ...gift, direction: 'RECEIVED', status: 'DONE', income_id: incomeId })
    set((s) => ({ gifts: [data, ...s.gifts] }))
    get().showToast(incomeId ? 'Regalo recibido y ingreso registrado' : 'Regalo recibido guardado', 'success')
    return data
  },
})
