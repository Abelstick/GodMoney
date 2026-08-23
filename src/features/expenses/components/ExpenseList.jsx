import { useState, useEffect, useMemo } from 'react'
import { Pagination } from '@mantine/core'
import { IconSearch, IconChevronDown, IconLayoutGrid, IconList, IconDownload, IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { exportTransactionsCSV } from '@/lib/exportTransactions'
import { SORT_OPTIONS, sortTransactions } from '@/lib/transactionSort'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './ExpenseList.module.css'

const PAGE_SIZE = 8

function ExpenseItem({ expense, onEdit, onDelete }) {
  return (
    <div className={styles.item}>
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
        {expense.created_at && (
          <div className={styles.registeredAt}>Registrado el {formatDateTime(expense.created_at)}</div>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.amount}>-{formatCurrency(expense.amount)}</span>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onEdit(expense)}>✏️</button>
          <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(expense.id)}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

export function ExpenseList({ expenses, onEdit, onDelete }) {
  const [query,      setQuery]      = useState('')
  const [activeCats, setActiveCats] = useState(new Set())
  const [onlyFixed,  setOnlyFixed]  = useState(false)
  const [grouped,    setGrouped]    = useState(false)
  const [collapsed,  setCollapsed]  = useState(new Set())
  const [page,       setPage]       = useState(1)
  // Por defecto: orden por fecha de registro, ascendente (lo más reciente al final).
  const [sortBy,     setSortBy]     = useState('created_at')
  const [sortDir,    setSortDir]    = useState('asc')

  useEffect(() => { setActiveCats(new Set()); setOnlyFixed(false); setCollapsed(new Set()); setPage(1) }, [expenses])
  useEffect(() => { setPage(1) }, [query, activeCats, onlyFixed, grouped, sortBy, sortDir])

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

  const sorted = useMemo(
    () => sortTransactions(filtered, sortBy, sortDir),
    [filtered, sortBy, sortDir]
  )

  // Montos agrupados por categoría, recalculados con cada búsqueda/filtro aplicado
  const groups = useMemo(() => {
    const map = new Map()
    sorted.forEach((e) => {
      const name  = e.category?.name ?? 'Sin categoría'
      const color = e.category?.color ?? '#94a3b8'
      if (!map.has(name)) map.set(name, { name, color, total: 0, count: 0, items: [] })
      const g = map.get(name)
      g.total += Number(e.amount)
      g.count += 1
      g.items.push(e)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [sorted])

  const filteredTotal = useMemo(() => filtered.reduce((a, e) => a + Number(e.amount), 0), [filtered])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const flatSlice  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasActiveFilters = query || activeCats.size > 0 || onlyFixed

  function toggleCat(name) {
    setActiveCats((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleCollapse(name) {
    setCollapsed((prev) => {
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

  function handleExport() {
    exportTransactionsCSV(filtered, {
      filename: `gastos-${new Date().toISOString().slice(0, 10)}.csv`,
      flagLabel: 'Fijo',
      flagValue: (e) => e.is_fixed,
    })
  }

  if (!expenses.length) {
    return (
      <EmptyState icon="💸" title="Sin gastos este mes" description="Registra tu primer gasto del mes" />
    )
  }

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

      {/* Ordenamiento */}
      <div className={styles.sortRow}>
        <span className={styles.sortLabel}>Ordenar por</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.chip} ${sortBy === opt.value ? styles.chipActive : ''}`}
            onClick={() => setSortBy(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button
          className={styles.sortDirBtn}
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          title={sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
        >
          {sortDir === 'asc' ? <IconArrowUp size={15} stroke={1.75} /> : <IconArrowDown size={15} stroke={1.75} />}
        </button>
      </div>

      {/* Lista o vacío */}
      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Sin resultados" description="Prueba con otros filtros" />
      ) : (
        <>
          {/* Resumen del monto agrupado según los filtros activos + controles de vista */}
          <div className={styles.filterSummary}>
            <div className={styles.filterSummaryInfo}>
              <span className={styles.filterSummaryLabel}>
                {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
                {hasActiveFilters && ` (de ${expenses.length})`}
              </span>
              <span className={styles.filterSummaryAmount}>-{formatCurrency(filteredTotal)}</span>
            </div>
            <div className={styles.filterSummaryActions}>
              <button
                className={styles.viewToggle}
                onClick={() => setGrouped((v) => !v)}
                title={grouped ? 'Ver como lista' : 'Agrupar por categoría'}
              >
                {grouped ? <IconList size={15} stroke={1.75} /> : <IconLayoutGrid size={15} stroke={1.75} />}
                {grouped ? 'Lista' : 'Agrupar'}
              </button>
              <button className={styles.exportBtn} onClick={handleExport} title="Descargar en Excel (CSV)">
                <IconDownload size={15} stroke={1.75} />
                Excel
              </button>
            </div>
          </div>

          {grouped ? (
            <div className={styles.groups}>
              {groups.map((g) => {
                const isCollapsed = collapsed.has(g.name)
                return (
                  <div key={g.name} className={styles.group}>
                    <button className={styles.groupHeader} onClick={() => toggleCollapse(g.name)}>
                      <span className={styles.groupDot} style={{ background: g.color }} />
                      <span className={styles.groupName}>{g.name}</span>
                      <span className={styles.groupCount}>{g.count}</span>
                      <span className={styles.groupTotal}>-{formatCurrency(g.total)}</span>
                      <IconChevronDown
                        size={15}
                        stroke={1.75}
                        className={`${styles.groupChevron} ${isCollapsed ? styles.groupChevronCollapsed : ''}`}
                      />
                    </button>
                    {!isCollapsed && (
                      <div className={styles.list}>
                        {g.items.map((expense) => (
                          <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {flatSlice.map((expense) => (
                  <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.paginationWrap}>
                  <span className={styles.paginationInfo}>
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                  </span>
                  <Pagination total={totalPages} value={page} onChange={setPage} size="sm" color="violet" radius="md" />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
