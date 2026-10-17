import { useEffect, useMemo, useState } from 'react'
import { expenseService } from '@/services/expenseService'
import { previousRange } from '@/lib/dateRanges'

// Gasto del periodo inmediatamente anterior a [from, to], total y por categoría
// (clave = nombre de categoría, igual que el gráfico de la pantalla de Gastos).
export function usePreviousPeriodTotals(from, to) {
  const prev = useMemo(() => previousRange({ from, to }), [from, to])
  const [state, setState] = useState({ loading: true, total: 0, byCategory: {} })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    expenseService.getByMonth(prev.from, prev.to)
      .then((rows) => {
        if (cancelled) return
        const byCategory = {}
        let total = 0
        rows.forEach((e) => {
          const name = e.category?.name ?? 'Sin categoría'
          byCategory[name] = (byCategory[name] ?? 0) + Number(e.amount)
          total += Number(e.amount)
        })
        setState({ loading: false, total, byCategory })
      })
      .catch(() => { if (!cancelled) setState({ loading: false, total: 0, byCategory: {} }) })
    return () => { cancelled = true }
  }, [prev.from, prev.to])

  return { ...state, prev }
}
