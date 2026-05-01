import { useState, useEffect, useMemo } from 'react'
import { Pagination } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './IncomeList.module.css'

const PAGE_SIZE = 8

export function IncomeList({ incomes, onEdit, onDelete }) {
  const [page,          setPage]          = useState(1)
  const [query,         setQuery]         = useState('')
  const [activeCats,    setActiveCats]    = useState(new Set())
  const [onlyRecurring, setOnlyRecurring] = useState(false)

  useEffect(() => { setPage(1) }, [query, activeCats, onlyRecurring])
  useEffect(() => { setPage(1); setActiveCats(new Set()); setOnlyRecurring(false) }, [incomes])

  const categories = useMemo(() => {
    const map = new Map()
    incomes.forEach((i) => {
      const name = i.category?.name ?? 'Sin categoría'
      if (!map.has(name)) map.set(name, { color: i.category?.color ?? '#94a3b8', count: 0 })
      map.get(name).count++
    })
    return [...map.entries()]
      .map(([name, { color, count }]) => ({ name, color, count }))
      .sort((a, b) => b.count - a.count)
  }, [incomes])

  const hasRecurring = useMemo(() => incomes.some((i) => i.is_recurring), [incomes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return incomes.filter((i) => {
      if (q && !i.description?.toLowerCase().includes(q) && !i.category?.name?.toLowerCase().includes(q)) return false
      if (activeCats.size > 0 && !activeCats.has(i.category?.name ?? 'Sin categoría')) return false
      if (onlyRecurring && !i.is_recurring) return false
      return true
    })
  }, [incomes, query, activeCats, onlyRecurring])

  const hasActiveFilters = query || activeCats.size > 0 || onlyRecurring

  function toggleCat(name) {
    setActiveCats((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function clearAll() {
    setQuery('')
    setActiveCats(new Set())
    setOnlyRecurring(false)
  }

  if (!incomes.length) {
    return (
      <EmptyState icon="💰" title="Sin ingresos este mes" description="Registra tu primer ingreso del mes" />
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.root}>
      {/* Buscador */}
      <div className={styles.searchWrap}>
        <IconSearch size={15} stroke={1.75} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por descripción o categoría…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>}
      </div>

      {/* Filtros dinámicos */}
      {(categories.length > 1 || hasRecurring) && (
        <div className={styles.filters}>
          {categories.length > 1 && categories.map((cat) => {
            const active = activeCats.has(cat.name)
            return (
              <button
                key={cat.name}
                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                style={active ? { borderColor: cat.color, background: cat.color + '18' } : {}}
                onClick={() => toggleCat(cat.name)}
              >
                <span className={styles.chipDot} style={{ background: cat.color }} />
                {cat.name}
                <span className={styles.chipCount}>{cat.count}</span>
              </button>
            )
          })}

          {hasRecurring && (
            <button
              className={`${styles.chip} ${onlyRecurring ? styles.chipActive : ''}`}
              onClick={() => setOnlyRecurring((v) => !v)}
            >
              🔁 Recurrente
            </button>
          )}

          {hasActiveFilters && (
            <button className={styles.clearFilters} onClick={clearAll}>
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Lista o vacío */}
      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Sin resultados" description="Prueba con otros filtros" />
      ) : (
        <>
          <div className={styles.list}>
            {slice.map((income) => (
              <div key={income.id} className={styles.item}>
                <div
                  className={styles.iconWrap}
                  style={{ background: (income.category?.color ?? '#10b981') + '20' }}
                >
                  💰
                </div>
                <div className={styles.info}>
                  <div className={styles.description}>
                    {income.description || income.category?.name || 'Sin descripción'}
                  </div>
                  <div className={styles.meta}>
                    <span>{formatDate(income.date)}</span>
                    {income.category && (
                      <Badge color={income.category.color}>{income.category.name}</Badge>
                    )}
                    {income.is_recurring && (
                      <Badge color="var(--color-info)">Recurrente</Badge>
                    )}
                  </div>
                </div>
                <div className={styles.right}>
                  <span className={styles.amount}>+{formatCurrency(income.amount)}</span>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => onEdit(income)}>✏️</button>
                    <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(income.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationWrap}>
              <span className={styles.paginationInfo}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                {hasActiveFilters && ` (de ${incomes.length})`}
              </span>
              <Pagination total={totalPages} value={page} onChange={setPage} size="sm" color="violet" radius="md" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
