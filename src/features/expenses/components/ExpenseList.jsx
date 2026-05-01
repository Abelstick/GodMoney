import { useState, useEffect, useMemo } from 'react'
import { Pagination } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './ExpenseList.module.css'

const PAGE_SIZE = 8

export function ExpenseList({ expenses, onEdit, onDelete }) {
  const [page,       setPage]       = useState(1)
  const [query,      setQuery]      = useState('')
  const [activeCats, setActiveCats] = useState(new Set())
  const [onlyFixed,  setOnlyFixed]  = useState(false)

  useEffect(() => { setPage(1) }, [query, activeCats, onlyFixed])
  useEffect(() => { setPage(1); setActiveCats(new Set()); setOnlyFixed(false) }, [expenses])

  // Categorías únicas derivadas de la lista completa
  const categories = useMemo(() => {
    const map = new Map()
    expenses.forEach((e) => {
      const name = e.category?.name ?? 'Sin categoría'
      if (!map.has(name)) map.set(name, { color: e.category?.color ?? '#94a3b8', count: 0 })
      map.get(name).count++
    })
    return [...map.entries()]
      .map(([name, { color, count }]) => ({ name, color, count }))
      .sort((a, b) => b.count - a.count)
  }, [expenses])

  const hasFixed = useMemo(() => expenses.some((e) => e.is_fixed), [expenses])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return expenses.filter((e) => {
      if (q && !e.description?.toLowerCase().includes(q) && !e.category?.name?.toLowerCase().includes(q)) return false
      if (activeCats.size > 0 && !activeCats.has(e.category?.name ?? 'Sin categoría')) return false
      if (onlyFixed && !e.is_fixed) return false
      return true
    })
  }, [expenses, query, activeCats, onlyFixed])

  const hasActiveFilters = query || activeCats.size > 0 || onlyFixed

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
    setOnlyFixed(false)
  }

  if (!expenses.length) {
    return (
      <EmptyState icon="💸" title="Sin gastos este mes" description="Registra tu primer gasto del mes" />
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
      {(categories.length > 1 || hasFixed) && (
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

          {hasFixed && (
            <button
              className={`${styles.chip} ${onlyFixed ? styles.chipActive : ''}`}
              onClick={() => setOnlyFixed((v) => !v)}
            >
              📌 Fijo
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
            {slice.map((expense) => (
              <div key={expense.id} className={styles.item}>
                <div
                  className={styles.iconWrap}
                  style={{ background: (expense.category?.color ?? '#ef4444') + '20' }}
                >
                  💸
                </div>
                <div className={styles.info}>
                  <div className={styles.description}>
                    {expense.description || expense.category?.name || 'Sin descripción'}
                  </div>
                  <div className={styles.meta}>
                    <span>{formatDate(expense.date)}</span>
                    {expense.category && <Badge color={expense.category.color}>{expense.category.name}</Badge>}
                    {expense.is_fixed && <Badge color="var(--color-warning)">Fijo</Badge>}
                  </div>
                </div>
                <div className={styles.right}>
                  <span className={styles.amount}>-{formatCurrency(expense.amount)}</span>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => onEdit(expense)}>✏️</button>
                    <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(expense.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationWrap}>
              <span className={styles.paginationInfo}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                {hasActiveFilters && ` (de ${expenses.length})`}
              </span>
              <Pagination total={totalPages} value={page} onChange={setPage} size="sm" color="violet" radius="md" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
