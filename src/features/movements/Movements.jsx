import { useState, useEffect, useMemo, useCallback } from 'react'
import { MultiSelect } from '@mantine/core'
import {
  IconSearch, IconX, IconDownload, IconFileTypePdf, IconUpload,
  IconArrowUpRight, IconArrowDownRight, IconFilterOff,
} from '@tabler/icons-react'
import { format, startOfYear, endOfYear, subYears, subMonths } from 'date-fns'
import { movementService } from '@/services/movementService'
import { useCategories } from '@/hooks/useCategories'
import { useStore } from '@/store'
import { getMonthRange, formatCurrency, formatDate } from '@/lib/formatters'
import { summarize, exportMovementsCSV, printMovementsReport } from '@/lib/movementReport'
import { Card }  from '@/components/ui/Card/Card'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { Modal } from '@/components/common/Modal/Modal'
import { AttachmentStrip } from '@/components/common/Attachments/AttachmentStrip'
import { ImportModal } from './components/ImportModal'
import styles from './Movements.module.css'

const ymd = (d) => format(d, 'yyyy-MM-dd')

const PRESETS = [
  { id: 'month',     label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
  { id: 'year',      label: 'Este año' },
  { id: 'lastYear',  label: 'Año pasado' },
  { id: 'custom',    label: 'Personalizado' },
]

function presetRange(id) {
  const now = new Date()
  switch (id) {
    case 'lastMonth': return getMonthRange(subMonths(now, 1))
    case 'year':      return { from: ymd(startOfYear(now)), to: ymd(endOfYear(now)) }
    case 'lastYear':  return { from: ymd(startOfYear(subYears(now, 1))), to: ymd(endOfYear(subYears(now, 1))) }
    default:          return getMonthRange(now)
  }
}

const KINDS = [
  { id: 'all',     label: 'Todos' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income',  label: 'Ingresos' },
]

const PAGE_SIZE = 50

const FIELD_STYLES = {
  input: {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  label: { color: 'var(--color-text-secondary)', fontWeight: 500 },
}

export function Movements() {
  const showToast = useStore((s) => s.showToast)
  const { categories } = useCategories()

  const [preset, setPreset] = useState('month')
  const [range, setRange]   = useState(() => presetRange('month'))
  const [kind, setKind]     = useState('all')
  const [catIds, setCatIds] = useState([])
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [query, setQuery]   = useState('')
  const [tag, setTag]       = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAll(await movementService.getRange(range.from, range.to))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => { load() }, [load])

  function choosePreset(id) {
    setPreset(id)
    if (id !== 'custom') setRange(presetRange(id))
  }

  const catOptions = useMemo(() => {
    const seen = new Set()
    return categories
      .filter((c) => (seen.has(c.id) ? false : seen.add(c.id)))
      .map((c) => ({ value: c.id, label: c.name }))
  }, [categories])

  const allTags = useMemo(() => {
    const set = new Set()
    all.forEach((m) => (m.tags ?? []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [all])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const min = minAmount === '' ? null : Number(minAmount)
    const max = maxAmount === '' ? null : Number(maxAmount)
    return all.filter((m) => {
      if (kind !== 'all' && m.kind !== kind) return false
      if (catIds.length && !catIds.includes(m.category_id)) return false
      const amount = Number(m.amount)
      if (min !== null && amount < min) return false
      if (max !== null && amount > max) return false
      if (tag && !(m.tags ?? []).includes(tag)) return false
      if (q) {
        const hay = `${m.description ?? ''} ${m.notes ?? ''} ${m.category?.name ?? ''} ${(m.tags ?? []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [all, kind, catIds, minAmount, maxAmount, tag, query])

  useEffect(() => { setVisible(PAGE_SIZE) }, [filtered])

  const totals = useMemo(() => summarize(filtered), [filtered])

  const hasFilters = kind !== 'all' || catIds.length || minAmount || maxAmount || query || tag

  function clearFilters() {
    setKind('all'); setCatIds([]); setMinAmount(''); setMaxAmount(''); setQuery(''); setTag('')
  }

  const periodLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`
  const fileBase = `movimientos-${range.from}_${range.to}`

  function handleCSV() {
    if (!filtered.length) return showToast('No hay movimientos para exportar', 'info')
    exportMovementsCSV(filtered, `${fileBase}.csv`)
  }

  function handlePDF() {
    if (!filtered.length) return showToast('No hay movimientos para exportar', 'info')
    printMovementsReport(filtered, { title: 'Reporte de movimientos', periodLabel })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Movimientos</h1>
          <p className={styles.subtitle}>Busca, filtra, exporta e importa tus ingresos y gastos</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <IconUpload size={16} stroke={1.75} /> Importar
          </Button>
          <Button variant="secondary" onClick={handleCSV}>
            <IconDownload size={16} stroke={1.75} /> CSV
          </Button>
          <Button onClick={handlePDF}>
            <IconFileTypePdf size={16} stroke={1.75} /> PDF
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <Card padded>
        <div className={styles.chips} role="group" aria-label="Periodo">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id}
              className={`${styles.chip} ${preset === p.id ? styles.chipActive : ''}`}
              onClick={() => choosePreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          <Input label="Desde" type="date" value={range.from} max={range.to}
            onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, from: e.target.value })) }} />
          <Input label="Hasta" type="date" value={range.to} min={range.from}
            onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, to: e.target.value })) }} />
          <Input label="Monto mínimo" type="number" min="0" step="0.01" prefix="S/" value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)} />
          <Input label="Monto máximo" type="number" min="0" step="0.01" prefix="S/" value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)} />
        </div>

        <div className={styles.grid}>
          <MultiSelect
            label="Categorías"
            placeholder={catIds.length ? undefined : 'Todas'}
            data={catOptions}
            value={catIds}
            onChange={setCatIds}
            searchable
            clearable
            styles={FIELD_STYLES}
          />
          <div className={styles.searchField}>
            <Input label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Descripción, nota, categoría…"
              prefix={<IconSearch size={15} stroke={1.75} />}
              suffix={query ? (
                <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                  <IconX size={14} stroke={2} />
                </button>
              ) : undefined} />
          </div>
        </div>

        <div className={styles.rowBetween}>
          <div className={styles.chips} role="group" aria-label="Tipo">
            {KINDS.map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id}
                className={`${styles.chip} ${kind === k.id ? styles.chipActive : ''}`}
                onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button type="button" className={styles.clearAll} onClick={clearFilters}>
              <IconFilterOff size={15} stroke={1.75} /> Limpiar filtros
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className={styles.chips} role="group" aria-label="Etiquetas">
            {allTags.map((t) => (
              <button key={t} type="button" aria-pressed={tag === t}
                className={`${styles.chip} ${tag === t ? styles.chipActive : ''}`}
                onClick={() => setTag(tag === t ? '' : t)}>
                #{t}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── Totales del filtro ── */}
      <div className={styles.totals} aria-live="polite">
        <div className={styles.total}>
          <span>Ingresos</span>
          <strong className={styles.income}>{formatCurrency(totals.income)}</strong>
        </div>
        <div className={styles.total}>
          <span>Gastos</span>
          <strong className={styles.expense}>{formatCurrency(totals.expense)}</strong>
        </div>
        <div className={styles.total}>
          <span>Neto</span>
          <strong>{formatCurrency(totals.net)}</strong>
        </div>
        <div className={styles.total}>
          <span>Movimientos</span>
          <strong>{filtered.length}{filtered.length !== all.length ? ` / ${all.length}` : ''}</strong>
        </div>
      </div>

      {/* ── Resultados ── */}
      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span>No pudimos cargar los movimientos.</span>
          <Button size="sm" variant="secondary" onClick={load}>Reintentar</Button>
        </div>
      ) : loading ? (
        <p className={styles.state}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={44} stroke={1.5} />}
          title="Sin resultados"
          description={all.length ? 'Prueba con otros filtros' : 'No hay movimientos en este periodo'}
        />
      ) : (
        <Card padded={false}>
          <ul className={styles.list}>
            {filtered.slice(0, visible).map((m) => {
              const isIncome = m.kind === 'income'
              return (
                <li key={`${m.kind}-${m.id}`} className={styles.item}>
                  <span className={`${styles.kindIcon} ${isIncome ? styles.kindIncome : styles.kindExpense}`} aria-hidden="true">
                    {isIncome ? <IconArrowDownRight size={16} stroke={2} /> : <IconArrowUpRight size={16} stroke={2} />}
                  </span>
                  <div className={styles.info}>
                    <div className={styles.desc}>{m.description || m.category?.name || 'Sin descripción'}</div>
                    <div className={styles.meta}>
                      <span>{formatDate(m.date)}</span>
                      {m.category && <Badge color={m.category.color}>{m.category.name}</Badge>}
                      {(m.tags ?? []).map((t) => <span key={t} className={styles.tag}>#{t}</span>)}
                    </div>
                    {m.notes && <div className={styles.note}>{m.notes}</div>}
                    <AttachmentStrip attachments={m.attachments} />
                  </div>
                  <span className={`${styles.amount} ${isIncome ? styles.income : styles.expense}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(m.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
          {visible < filtered.length && (
            <div className={styles.more}>
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Mostrar más ({filtered.length - visible} restantes)
              </Button>
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Importar movimientos" size="lg">
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); load() }}
        />
      </Modal>
    </div>
  )
}
