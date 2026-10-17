import { useState, useEffect, useCallback } from 'react'

// Selección múltiple por id. Si los items cambian (filtro, mes, borrado), los
// ids que ya no existen se quitan para no actuar sobre registros invisibles.
export function useSelection(items) {
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const alive = new Set(items.map((i) => i.id))
      const next = new Set([...prev].filter((id) => alive.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids) => setSelected(new Set(ids)), [])
  const clear     = useCallback(() => setSelected(new Set()), [])

  return { selected, toggle, selectAll, clear }
}
