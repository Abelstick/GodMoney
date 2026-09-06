import { useEffect } from 'react'
import { useStore } from '@/store'

export function useRecurringPaymentAlerts() {
  const alerts          = useStore((s) => s.recurringPaymentAlerts)
  const loading         = useStore((s) => s.recurringPaymentAlertsLoading)
  const fetchAlerts     = useStore((s) => s.fetchRecurringPaymentAlerts)
  const markAlertRead   = useStore((s) => s.markRecurringPaymentAlertRead)
  const markAllAlertsRead = useStore((s) => s.markAllRecurringPaymentAlertsRead)

  useEffect(() => {
    fetchAlerts()
  }, [])

  return { alerts, loading, markAlertRead, markAllAlertsRead }
}
