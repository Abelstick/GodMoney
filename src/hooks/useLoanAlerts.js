import { useEffect } from 'react'
import { useStore } from '@/store'

export function useLoanAlerts() {
  const alerts            = useStore((s) => s.loanAlerts)
  const loading           = useStore((s) => s.loanAlertsLoading)
  const fetchLoanAlerts   = useStore((s) => s.fetchLoanAlerts)
  const markLoanAlertRead = useStore((s) => s.markLoanAlertRead)
  const markAllLoanAlertsRead = useStore((s) => s.markAllLoanAlertsRead)

  useEffect(() => {
    fetchLoanAlerts()
  }, [])

  return { alerts, loading, markLoanAlertRead, markAllLoanAlertsRead }
}
