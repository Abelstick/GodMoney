import { useEffect } from 'react'
import { useStore } from '@/store'

export function useAccounts() {
  const accounts       = useStore((s) => s.accounts)
  const loading        = useStore((s) => s.accountsLoading)
  const fetchAccounts  = useStore((s) => s.fetchAccounts)
  const addAccount     = useStore((s) => s.addAccount)
  const updateAccount  = useStore((s) => s.updateAccount)
  const removeAccount  = useStore((s) => s.removeAccount)
  const adjustAccountBalance = useStore((s) => s.adjustAccountBalance)

  useEffect(() => {
    fetchAccounts()
  }, [])

  return { accounts, loading, addAccount, updateAccount, removeAccount, adjustAccountBalance }
}
