import { useState, useEffect } from 'react'
import { categoryService } from '@/services/categoryService'

export function useCategories(type = null) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoryService.getAll(type)
      .then(setCategories)
      .finally(() => setLoading(false))
  }, [type])

  return { categories, loading }
}
