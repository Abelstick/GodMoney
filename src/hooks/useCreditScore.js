import { useEffect, useMemo } from 'react'
import { useStore } from '@/store'

export function useCreditScore() {
  const creditScores      = useStore((s) => s.creditScores)
  const loading           = useStore((s) => s.creditScoresLoading)
  const fetchCreditScores = useStore((s) => s.fetchCreditScores)
  const addCreditScore    = useStore((s) => s.addCreditScore)
  const updateCreditScore = useStore((s) => s.updateCreditScore)
  const removeCreditScore = useStore((s) => s.removeCreditScore)

  useEffect(() => {
    fetchCreditScores()
  }, [])

  // Ordenados ascendente por fecha (para el gráfico); el más reciente es el
  // último. La tendencia compara el último registro contra el anterior.
  const latest   = creditScores[creditScores.length - 1] ?? null
  const previous = creditScores[creditScores.length - 2] ?? null
  const delta    = latest && previous ? latest.score - previous.score : null

  const chartData = useMemo(
    () => creditScores.map((c) => ({
      date: c.recorded_date,
      score: c.score,
    })),
    [creditScores]
  )

  return {
    creditScores,
    loading,
    latest,
    previous,
    delta,
    chartData,
    addCreditScore,
    updateCreditScore,
    removeCreditScore,
  }
}
