import { useEffect } from 'react'
import { useStore } from '@/store'

export function useGoals() {
  const goals          = useStore((s) => s.goals)
  const loading        = useStore((s) => s.goalsLoading)
  const fetchGoals     = useStore((s) => s.fetchGoals)
  const addGoal        = useStore((s) => s.addGoal)
  const updateGoal     = useStore((s) => s.updateGoal)
  const addGoalProgress = useStore((s) => s.addGoalProgress)
  const removeGoal     = useStore((s) => s.removeGoal)

  useEffect(() => {
    fetchGoals()
  }, [])

  return { goals, loading, addGoal, updateGoal, addGoalProgress, removeGoal }
}
