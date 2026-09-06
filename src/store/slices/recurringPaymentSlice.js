import { recurringPaymentService } from '@/services/recurringPaymentService'
import { recurringPaymentAlertService } from '@/services/recurringPaymentAlertService'

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
      get().syncRecurringPaymentAlerts()
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
    get().syncRecurringPaymentAlerts()
    return data
  },

  updateRecurringPayment: async (id, payload) => {
    const data = await recurringPaymentService.update(id, payload)
    set((s) => ({ recurringPayments: s.recurringPayments.map((p) => (p.id === id ? data : p)) }))
    get().showToast('Pago recurrente actualizado', 'success')
    get().syncRecurringPaymentAlerts()
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
