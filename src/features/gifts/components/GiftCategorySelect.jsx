import { useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { Select } from '@/components/ui/Select/Select'

// Selector de categoría que arranca en "Regalos" si existe. Vacío = el slice
// usa (o crea) la categoría "Regalos".
export function GiftCategorySelect({ type, value, onChange, label = 'Categoría' }) {
  const { categories } = useCategories(type)
  const giftCategory = categories.find((c) => c.name.trim().toLowerCase() === 'regalos')

  useEffect(() => {
    if (!value && giftCategory) onChange(giftCategory.id)
  }, [giftCategory?.id])

  const options = [
    ...(giftCategory ? [] : [{ value: '', label: 'Regalos (se creará)' }]),
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return <Select label={label} options={options} value={value} onChange={(e) => onChange(e.target.value)} />
}
