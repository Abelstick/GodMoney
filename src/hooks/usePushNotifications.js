import { useState, useEffect, useCallback } from 'react'
import { pushSubscriptionService } from '@/services/pushSubscriptionService'

export function usePushNotifications() {
  const supported = pushSubscriptionService.isSupported()
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!supported) { setLoading(false); return }
    const subscription = await pushSubscriptionService.getCurrentSubscription()
    setSubscribed(!!subscription)
    setLoading(false)
  }, [supported])

  useEffect(() => { refresh() }, [refresh])

  async function subscribe() {
    setError(null)
    setLoading(true)
    try {
      await pushSubscriptionService.subscribe()
      setSubscribed(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setError(null)
    setLoading(true)
    try {
      await pushSubscriptionService.unsubscribe()
      setSubscribed(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscribed, loading, error, subscribe, unsubscribe }
}
