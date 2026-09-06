import { useEffect } from 'react'
import { useStore } from '@/store'

export function useRecurringPayments() {
  const recurringPayments        = useStore((s) => s.recurringPayments)
  const loading                  = useStore((s) => s.recurringPaymentsLoading)
  const ledger                   = useStore((s) => s.recurringPaymentLedger)
  const paymentsByRecurringPayment = useStore((s) => s.paymentsByRecurringPayment)
  const fetchRecurringPayments   = useStore((s) => s.fetchRecurringPayments)
  const addRecurringPayment      = useStore((s) => s.addRecurringPayment)
  const updateRecurringPayment   = useStore((s) => s.updateRecurringPayment)
  const setRecurringPaymentActive = useStore((s) => s.setRecurringPaymentActive)
  const removeRecurringPayment   = useStore((s) => s.removeRecurringPayment)
  const payRecurringPayment      = useStore((s) => s.payRecurringPayment)
  const fetchRecurringPaymentDetail = useStore((s) => s.fetchRecurringPaymentDetail)

  useEffect(() => {
    fetchRecurringPayments()
  }, [])

  return {
    recurringPayments,
    loading,
    ledger,
    paymentsByRecurringPayment,
    addRecurringPayment,
    updateRecurringPayment,
    setRecurringPaymentActive,
    removeRecurringPayment,
    payRecurringPayment,
    fetchRecurringPaymentDetail,
  }
}
