import { useState, useEffect, useMemo } from 'react'
import { Pagination } from '@mantine/core'
import { IconSearch, IconChevronDown, IconLayoutGrid, IconList, IconDownload, IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { exportTransactionsCSV } from '@/lib/exportTransactions'
import { SORT_OPTIONS, sortTransactions } from '@/lib/transactionSort'
import { Badge }      from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './IncomeList.module.css'

const PAGE_SIZE = 8

function IncomeItem({ income, onEdit, onDelete }) {
  return (
    <div className={styles.item}>
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
        {income.created_at && (
          <div className={styles.registeredAt}>Registrado el {formatDateTime(income.created_at)}</div>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.amount}>+{formatCurrency(income.amount)}</span>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onEdit(income)}>✏️</button>
          <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => onDelete(income.id)}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

export function IncomeList({ incomes, onEdit, onDelete }) {
  const [query,         setQuery]         = useState('')
  const [activeCats,    setActiveCats]    = useState(new Set())
  const [onlyRecurring, setOnlyRecurring] = useState(false)
  const [grouped,       setGrouped]       = useState(false)
  const [collapsed,     setCollapsed]     = useState(new Set())
  const [page,          setPage]          = useState(1)
  // Por defecto: orden por fecha de registro, ascendente (lo más reciente al final).
  const [sortBy,        setSortBy]        = useState('created_at')
  const [sortDir,       setSortDir]       = useState('asc')

  useEffect(() => { setActiveCats(new Set()); setOnlyRecurring(false); setCollapsed(new Set()); setPage(1) }, [incomes])
  useEffect(() => { setPage(1) }, [query, activeCats, onlyRecurring, grouped, sortBy, sortDir])

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

  const sorted = useMemo(
    () => sortTransactions(filtered, sortBy, sortDir),
    [filtered, sortBy, sortDir]
  )

  // Montos agrupados por categoría, recalculados con cada búsqueda/filtro aplicado
  const groups = useMemo(() => {
    const map = new Map()
    sorted.forEach((i) => {
      const name  = i.category?.name ?? 'Sin categoría'
      const color = i.category?.color ?? '#94a3b8'
      if (!map.has(name)) map.set(name, { name, color, total: 0, count: 0, items: [] })
      const g = map.get(name)
      g.total += Number(i.amount)
      g.count += 1
      g.items.push(i)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [sorted])

  const filteredTotal = useMemo(() => filtered.reduce((a, i) => a + Number(i.amount), 0), [filtered])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const flatSlice  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasActiveFilters = query || activeCats.size > 0 || onlyRecurring

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
    setOnlyRecurring(false)
  }

  function handleExport() {
    exportTransactionsCSV(filtered, {
      filename: `ingresos-${new Date().toISOString().slice(0, 10)}.csv`,
      flagLabel: 'Recurrente',
      flagValue: (i) => i.is_recurring,
    })
  }

  if (!incomes.length) {
    return (
      <EmptyState icon="💰" title="Sin ingresos este mes" description="Registra tu primer ingreso del mes" />
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
                {hasActiveFilters && ` (de ${incomes.length})`}
              </span>
              <span className={styles.filterSummaryAmount}>+{formatCurrency(filteredTotal)}</span>
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
                      <span className={styles.groupTotal}>+{formatCurrency(g.total)}</span>
                      <IconChevronDown
                        size={15}
                        stroke={1.75}
                        className={`${styles.groupChevron} ${isCollapsed ? styles.groupChevronCollapsed : ''}`}
                      />
                    </button>
                    {!isCollapsed && (
                      <div className={styles.list}>
                        {g.items.map((income) => (
                          <IncomeItem key={income.id} income={income} onEdit={onEdit} onDelete={onDelete} />
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
                {flatSlice.map((income) => (
                  <IncomeItem key={income.id} income={income} onEdit={onEdit} onDelete={onDelete} />
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
