import { useState, useEffect } from 'react'
import { categoryService } from '@/services/categoryService'
import { categoryCache } from '@/lib/categoryCache'

export function useCategories(type = null) {
  // Arranca con la última lista conocida para que el formulario sirva sin conexión.
  const [categories, setCategories] = useState(() => categoryCache.get(type) ?? [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoryService.getAll(type)
      .then((list) => { categoryCache.set(type, list); setCategories(list) })
      .catch(() => { /* sin conexión: se queda con la lista guardada */ })
      .finally(() => setLoading(false))
  }, [type])

  return { categories, loading }
}
