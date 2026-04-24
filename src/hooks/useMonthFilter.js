import { useMemo } from 'react'
import { useStore } from '@/store'
import { getMonthRange, getPastMonths } from '@/lib/formatters'
import { parseISO, startOfMonth } from 'date-fns'

export function useMonthFilter() {
  const activeMonth = useStore((s) => s.activeMonth)
  const setActiveMonth = useStore((s) => s.setActiveMonth)

  const { from, to } = useMemo(() => {
    const date = parseISO(`${activeMonth}-01`)
    return getMonthRange(date)
  }, [activeMonth])

  const months = useMemo(() => getPastMonths(12), [])

  return { activeMonth, setActiveMonth, from, to, months }
}
