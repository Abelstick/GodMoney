import { describe, it, expect } from 'vitest'
import { getRecentCategoryIds, rememberCategory } from './recentCategories'

const categories = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))

describe('getRecentCategoryIds', () => {
  it('pone primero las últimas usadas, luego las frecuentes y completa con el resto', () => {
    const transactions = [
      { category_id: 'c', date: '2026-10-01' },
      { category_id: 'c', date: '2026-10-02' },
      { category_id: 'd', date: '2026-10-05' },
    ]
    expect(getRecentCategoryIds({ lastUsed: ['b'], transactions, categories, limit: 4 }))
      .toEqual(['b', 'c', 'd', 'a'])
  })

  it('desempata la frecuencia por la fecha más reciente', () => {
    const transactions = [
      { category_id: 'a', date: '2026-10-01' },
      { category_id: 'e', date: '2026-10-20' },
    ]
    expect(getRecentCategoryIds({ transactions, categories, limit: 2 })).toEqual(['e', 'a'])
  })

  it('descarta categorías que ya no existen', () => {
    expect(getRecentCategoryIds({ lastUsed: ['zzz', 'a'], categories, limit: 2 })).toEqual(['a', 'b'])
  })
})

describe('rememberCategory', () => {
  it('mueve la categoría al frente sin duplicarla y respeta el máximo', () => {
    expect(rememberCategory(['a', 'b', 'c'], 'c', 3)).toEqual(['c', 'a', 'b'])
    expect(rememberCategory(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b'])
  })
})
