import { loanService } from '@/services/loanService'
import { loanAlertService } from '@/services/loanAlertService'

export const createLoanSlice = (set, get) => ({
  loans: [],
  loansLoading: false,
  pendingInstallments: [],
  installmentsByLoan: {},
  paymentsByLoan: {},
  loanAlerts: [],
  loanAlertsLoading: false,

  fetchLoans: async () => {
    set({ loansLoading: true })
    try {
      const [loans, pendingInstallments] = await Promise.all([
        loanService.getAll(),
        loanService.getPendingInstallments(),
      ])
      set({ loans, pendingInstallments, loansLoading: false })
      get().syncLoanAlerts()
    } catch (err) {
      set({ loansLoading: false })
      get().showToast(err.message, 'error')
    }
  },

  fetchLoanDetail: async (loanId) => {
    const [installments, payments] = await Promise.all([
      loanService.getInstallments(loanId),
      loanService.getPayments(loanId),
    ])
    set((s) => ({
      installmentsByLoan: { ...s.installmentsByLoan, [loanId]: installments },
      paymentsByLoan: { ...s.paymentsByLoan, [loanId]: payments },
    }))
    return { installments, payments }
  },

  addLoan: async (payload) => {
    const { loan, installments } = await loanService.create(payload)
    set((s) => ({
      loans: [loan, ...s.loans],
      installmentsByLoan: { ...s.installmentsByLoan, [loan.id]: installments },
    }))
    await get().fetchAccounts()
    get().showToast('Préstamo registrado', 'success')
    get().syncLoanAlerts()
    return loan
  },

  updateLoan: async (id, payload) => {
    const data = await loanService.update(id, payload)
    set((s) => ({ loans: s.loans.map((l) => (l.id === id ? data : l)) }))
    get().showToast('Préstamo actualizado', 'success')
    return data
  },

  cancelLoan: async (id) => {
    const data = await loanService.cancel(id)
    set((s) => ({ loans: s.loans.map((l) => (l.id === id ? data : l)) }))
    get().showToast('Préstamo cancelado', 'info')
    get().syncLoanAlerts()
    return data
  },

  registerLoanPayment: async (payload) => {
    const { payment, loan, installments } = await loanService.registerPayment(payload)
    set((s) => ({
      loans: s.loans.map((l) => (l.id === loan.id ? loan : l)),
      installmentsByLoan: { ...s.installmentsByLoan, [loan.id]: installments },
      paymentsByLoan: {
        ...s.paymentsByLoan,
        [loan.id]: [payment, ...(s.paymentsByLoan[loan.id] ?? [])],
      },
    }))
    await get().fetchAccounts()

    if (loan.status === 'PAID') {
      await loanAlertService.notifyLoanPaid(loan)
      get().showToast('¡Préstamo liquidado! 🎉', 'success')
    } else {
      get().showToast('Pago registrado', 'success')
    }

    const pendingInstallments = await loanService.getPendingInstallments()
    set({ pendingInstallments })
    get().syncLoanAlerts()
    return payment
  },

  fetchLoanAlerts: async () => {
    set({ loanAlertsLoading: true })
    try {
      const data = await loanAlertService.getAll()
      set({ loanAlerts: data, loanAlertsLoading: false })
    } catch (err) {
      set({ loanAlertsLoading: false })
    }
  },

  syncLoanAlerts: async () => {
    const { loans, pendingInstallments } = get()
    try {
      await loanAlertService.sync(loans, pendingInstallments)
      await get().fetchLoanAlerts()
    } catch {
      // Las alertas son informativas: si falla la sincronización no debe
      // interrumpir el flujo principal de préstamos.
    }
  },

  markLoanAlertRead: async (id) => {
    await loanAlertService.markRead(id)
    set((s) => ({ loanAlerts: s.loanAlerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)) }))
  },

  markAllLoanAlertsRead: async () => {
    await loanAlertService.markAllRead()
    set((s) => ({ loanAlerts: s.loanAlerts.map((a) => ({ ...a, is_read: true })) }))
  },
})
