import { useEffect } from 'react'
import { useStore } from '@/store'

export function useLoans() {
  const loans               = useStore((s) => s.loans)
  const loading             = useStore((s) => s.loansLoading)
  const pendingInstallments = useStore((s) => s.pendingInstallments)
  const fetchLoans          = useStore((s) => s.fetchLoans)
  const addLoan             = useStore((s) => s.addLoan)
  const updateLoan          = useStore((s) => s.updateLoan)
  const cancelLoan          = useStore((s) => s.cancelLoan)
  const removeLoan          = useStore((s) => s.removeLoan)
  const registerLoanPayment = useStore((s) => s.registerLoanPayment)
  const fetchLoanDetail     = useStore((s) => s.fetchLoanDetail)
  const installmentsByLoan  = useStore((s) => s.installmentsByLoan)
  const paymentsByLoan      = useStore((s) => s.paymentsByLoan)

  useEffect(() => {
    fetchLoans()
  }, [])

  return {
    loans,
    loading,
    pendingInstallments,
    addLoan,
    updateLoan,
    cancelLoan,
    removeLoan,
    registerLoanPayment,
    fetchLoanDetail,
    installmentsByLoan,
    paymentsByLoan,
  }
}
