import { useEffect, useMemo } from 'react'
import { useStore } from '@/store'
import { useAccounts } from './useAccounts'
import { useLoans } from './useLoans'
import { getGoalDerivedAmount } from '@/lib/goalProgress'
import { getAccountLoanImpact } from '@/lib/loanStatus'

export function useGoals() {
  const goals          = useStore((s) => s.goals)
  const loading        = useStore((s) => s.goalsLoading)
  const fetchGoals     = useStore((s) => s.fetchGoals)
  const addGoal        = useStore((s) => s.addGoal)
  const updateGoal     = useStore((s) => s.updateGoal)
  const addGoalProgress = useStore((s) => s.addGoalProgress)
  const removeGoal     = useStore((s) => s.removeGoal)

  const { accounts } = useAccounts()
  const { loans } = useLoans()
  const goalAccountLinks       = useStore((s) => s.goalAccountLinks)
  const fetchGoalAccountLinks  = useStore((s) => s.fetchGoalAccountLinks)
  const linkGoalAccount        = useStore((s) => s.linkGoalAccount)
  const unlinkGoalAccount      = useStore((s) => s.unlinkGoalAccount)

  useEffect(() => {
    fetchGoals()
    fetchGoalAccountLinks()
  }, [])

  const accountsById = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  // Saldos "hipotéticos": cómo quedaría cada cuenta si todos sus préstamos
  // activos se liquidaran hoy (te devuelven lo prestado / terminas de pagar
  // lo que debes). Sirve para el monto potencial de los objetivos.
  const potentialAccountsById = useMemo(() => {
    const map = {}
    for (const account of accounts) {
      const impact = getAccountLoanImpact(account.id, loans)
      map[account.id] = { ...account, balance: Number(account.balance) + impact }
    }
    return map
  }, [accounts, loans])

  // progressAmount = lo que se debe usar para barras de progreso y montos
  // mostrados: si el objetivo tiene cuentas vinculadas, es el monto derivado
  // (prorrateado si el saldo real no alcanza); si no, es el manual de siempre.
  // potentialAmount = lo mismo, pero asumiendo que todos los préstamos
  // ligados a esas cuentas ya se liquidaron (te pagaron / pagaste todo).
  const enrichedGoals = useMemo(() => goals.map((goal) => {
    const links = goalAccountLinks.filter((l) => l.goal_id === goal.id)
    const derived = getGoalDerivedAmount(goal.id, goalAccountLinks, accountsById)
    const potential = getGoalDerivedAmount(goal.id, goalAccountLinks, potentialAccountsById)
    const progressAmount = derived ?? Number(goal.current_amount)
    return {
      ...goal,
      isAccountLinked: links.length > 0,
      linkedAccounts: links,
      progressAmount,
      potentialAmount: potential ?? progressAmount,
    }
  }), [goals, goalAccountLinks, accountsById, potentialAccountsById])

  return {
    goals: enrichedGoals,
    loading,
    addGoal,
    updateGoal,
    addGoalProgress,
    removeGoal,
    accounts,
    goalAccountLinks,
    linkGoalAccount,
    unlinkGoalAccount,
  }
}
