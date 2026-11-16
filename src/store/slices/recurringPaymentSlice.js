import { recurringPaymentService } from '@/services/recurringPaymentService'
import { recurringPaymentAlertService } from '@/services/recurringPaymentAlertService'
import {
  matchExpensesToRecurringPayments, pendingRecurringPayments, periodWindow, unlinkKey,
} from '@/lib/recurringPaymentMatch'

// Pares pago:gasto que el usuario desvinculó a mano, para que la vinculación
// automática no los vuelva a unir. Se guarda por dispositivo.
const UNLINKED_KEY = 'godmoney:recurring-unlinked'

function readUnlinked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(UNLINKED_KEY)) ?? [])
  } catch {
    return new Set()
  }
}

function rememberUnlinked(key) {
  try {
    localStorage.setItem(UNLINKED_KEY, JSON.stringify([...readUnlinked().add(key)].slice(-200)))
  } catch {
    // Sin almacenamiento local solo se pierde la memoria de lo desvinculado.
  }
}

// Evita dos conciliaciones a la vez; si llega otra mientras corre, se repite al terminar.
let reconciling = false
let reconcileAgain = false

export const createRecurringPaymentSlice = (set, get) => ({
  recurringPayments: [],
  recurringPaymentsLoading: false,
  recurringPaymentLedger: [],
  paymentsByRecurringPayment: {},
  recurringPaymentAlerts: [],
  recurringPaymentAlertsLoading: false,

  fetchRecurringPayments: async () => {
    set({ recurringPaymentsLoading: true })
    try {
      const [recurringPayments, recurringPaymentLedger] = await Promise.all([
        recurringPaymentService.getAll(),
        recurringPaymentService.getRecentPayments(),
      ])
      set({ recurringPayments, recurringPaymentLedger, recurringPaymentsLoading: false })
      // Si concilia algo, ella misma sincroniza las alertas al terminar.
      const linked = await get().reconcileRecurringPayments()
      if (!linked) get().syncRecurringPaymentAlerts()
    } catch (err) {
      set({ recurringPaymentsLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  fetchRecurringPaymentDetail: async (id) => {
    const payments = await recurringPaymentService.getPayments(id)
    set((s) => ({ paymentsByRecurringPayment: { ...s.paymentsByRecurringPayment, [id]: payments } }))
    return payments
  },

  addRecurringPayment: async (payload) => {
    const data = await recurringPaymentService.create(payload)
    set((s) => ({ recurringPayments: [data, ...s.recurringPayments] }))
    get().showToast('Pago recurrente creado', 'success')
    const linked = await get().reconcileRecurringPayments()
    if (!linked) get().syncRecurringPaymentAlerts()
    return data
  },

  updateRecurringPayment: async (id, payload) => {
    const data = await recurringPaymentService.update(id, payload)
    set((s) => ({ recurringPayments: s.recurringPayments.map((p) => (p.id === id ? data : p)) }))
    get().showToast('Pago recurrente actualizado', 'success')
    // Al cambiar la categoría puede que un gasto ya registrado lo pague.
    const linked = await get().reconcileRecurringPayments()
    if (!linked) get().syncRecurringPaymentAlerts()
    return data
  },

  setRecurringPaymentActive: async (id, isActive) => {
    const data = await recurringPaymentService.setActive(id, isActive)
    set((s) => ({ recurringPayments: s.recurringPayments.map((p) => (p.id === id ? data : p)) }))
    get().showToast(isActive ? 'Pago reactivado' : 'Pago pausado', 'info')
    get().syncRecurringPaymentAlerts()
    return data
  },

  removeRecurringPayment: async (id) => {
    await recurringPaymentService.remove(id)
    set((s) => {
      const paymentsByRecurringPayment = { ...s.paymentsByRecurringPayment }
      delete paymentsByRecurringPayment[id]
      return {
        recurringPayments: s.recurringPayments.filter((p) => p.id !== id),
        recurringPaymentLedger: s.recurringPaymentLedger.filter((l) => l.recurring_payment_id !== id),
        paymentsByRecurringPayment,
      }
    })
    get().showToast('Pago recurrente eliminado', 'info')
    get().syncRecurringPaymentAlerts()
  },

  payRecurringPayment: async (payload) => {
    const { payment, recurringPayment } = await recurringPaymentService.pay(payload)
    set((s) => ({
      recurringPayments: s.recurringPayments.map((p) => (p.id === recurringPayment.id ? recurringPayment : p)),
      recurringPaymentLedger: [payment, ...s.recurringPaymentLedger],
      paymentsByRecurringPayment: {
        ...s.paymentsByRecurringPayment,
        [recurringPayment.id]: [payment, ...(s.paymentsByRecurringPayment[recurringPayment.id] ?? [])],
      },
    }))
    get().showToast('Pago registrado', 'success')
    get().syncRecurringPaymentAlerts()
    return payment
  },

  // Marca como pagados los pagos recurrentes pendientes que ya tienen un gasto
  // registrado en su periodo (misma categoría o nombre en la descripción).
  // `reload` vuelve a leer pagos y ledger: se usa al guardar un gasto, cuando
  // puede que esta pantalla nunca se haya abierto. Devuelve cuántos vinculó.
  reconcileRecurringPayments: async ({ reload = false } = {}) => {
    if (globalThis.navigator?.onLine === false) return 0
    if (reconciling) {
      reconcileAgain = true
      return 0
    }
    reconciling = true
    const linked = []
    try {
      if (reload) {
        const [recurringPayments, recurringPaymentLedger] = await Promise.all([
          recurringPaymentService.getAll(),
          recurringPaymentService.getRecentPayments(),
        ])
        set({ recurringPayments, recurringPaymentLedger })
      }
      const { recurringPayments, recurringPaymentLedger } = get()
      const pending = pendingRecurringPayments(recurringPayments, recurringPaymentLedger)
      if (!pending.length) return 0

      const since = pending.map((p) => periodWindow(p).after).sort()[0]
      const expenses = await recurringPaymentService.getExpensesSince(since)
      const matches = matchExpensesToRecurringPayments(recurringPayments, recurringPaymentLedger, expenses, { excluded: readUnlinked() })

      for (const m of matches) {
        try {
          const { payment, recurringPayment } = await recurringPaymentService.pay({
            recurring_payment_id: m.payment.id,
            period_date: m.period_date,
            amount: m.expense.amount,
            expense_id: m.expense.id,
            next_due_date: m.next_due_date,
          })
          set((s) => ({
            recurringPayments: s.recurringPayments.map((p) => (p.id === recurringPayment.id ? recurringPayment : p)),
            recurringPaymentLedger: [payment, ...s.recurringPaymentLedger],
          }))
          linked.push(m.payment.name)
        } catch {
          // Si otro dispositivo ya lo registró (periodo duplicado) no hay nada que hacer.
        }
      }
      if (linked.length) {
        get().showToast(
          linked.length === 1
            ? `"${linked[0]}" quedó marcado como pagado con el gasto que registraste`
            : `Marcados como pagados con tus gastos: ${linked.join(', ')}`,
          'success'
        )
        get().syncRecurringPaymentAlerts()
      }
    } catch {
      // Conciliar es una ayuda: si falla, el pago se puede marcar a mano.
    } finally {
      reconciling = false
      if (reconcileAgain) {
        reconcileAgain = false
        get().reconcileRecurringPayments({ reload: true })
      }
    }
    return linked.length
  },

  // Deshace el último pago del historial. Si venía de un gasto, se recuerda
  // para que la vinculación automática no lo vuelva a unir.
  removeRecurringPaymentEntry: async (entry) => {
    const current = get().recurringPayments.find((p) => p.id === entry.recurring_payment_id)
    if (!current) return
    const recurringPayment = await recurringPaymentService.removePayment(entry, current)
    if (entry.expense_id) rememberUnlinked(unlinkKey(current.id, entry.expense_id))
    set((s) => ({
      recurringPayments: s.recurringPayments.map((p) => (p.id === recurringPayment.id ? recurringPayment : p)),
      recurringPaymentLedger: s.recurringPaymentLedger.filter((l) => l.id !== entry.id),
      paymentsByRecurringPayment: {
        ...s.paymentsByRecurringPayment,
        [current.id]: (s.paymentsByRecurringPayment[current.id] ?? []).filter((l) => l.id !== entry.id),
      },
    }))
    get().showToast('Pago deshecho', 'info')
    get().syncRecurringPaymentAlerts()
  },

  fetchRecurringPaymentAlerts: async () => {
    set({ recurringPaymentAlertsLoading: true })
    try {
      const data = await recurringPaymentAlertService.getAll()
      set({ recurringPaymentAlerts: data, recurringPaymentAlertsLoading: false })
    } catch (err) {
      set({ recurringPaymentAlertsLoading: false })
    }
  },

  syncRecurringPaymentAlerts: async () => {
    const { recurringPayments, recurringPaymentLedger } = get()
    try {
      await recurringPaymentAlertService.sync(recurringPayments, recurringPaymentLedger)
      await get().fetchRecurringPaymentAlerts()
    } catch {
      // Las alertas son informativas: si falla la sincronización no debe
      // interrumpir el flujo principal de pagos recurrentes.
    }
  },

  markRecurringPaymentAlertRead: async (id) => {
    await recurringPaymentAlertService.markRead(id)
    set((s) => ({ recurringPaymentAlerts: s.recurringPaymentAlerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)) }))
  },

  markAllRecurringPaymentAlertsRead: async () => {
    await recurringPaymentAlertService.markAllRead()
    set((s) => ({ recurringPaymentAlerts: s.recurringPaymentAlerts.map((a) => ({ ...a, is_read: true })) }))
  },
})
