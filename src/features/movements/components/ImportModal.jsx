import { useState, useMemo, useRef, useEffect } from 'react'
import { IconUpload } from '@tabler/icons-react'
import { parseCSV } from '@/lib/csv'
import { guessMapping, rowsToMovements, movementKey } from '@/lib/importParser'
import { movementService } from '@/services/movementService'
import { useCategories } from '@/hooks/useCategories'
import { useStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import styles from './ImportModal.module.css'

const MODES = [
  { value: 'signed',  label: 'Una columna de monto (negativo = gasto, positivo = ingreso)' },
  { value: 'split',   label: 'Columnas separadas de cargo (gasto) y abono (ingreso)' },
  { value: 'expense', label: 'Todo son gastos' },
  { value: 'income',  label: 'Todo son ingresos' },
]

const MAX_BYTES = 5 * 1024 * 1024
const PREVIEW_ROWS = 8

export function ImportModal({ onClose, onImported }) {
  const showToast = useStore((s) => s.showToast)
  const { categories } = useCategories()
  const fileRef = useRef(null)

  const [fileName, setFileName] = useState('')
  const [headers, setHeaders]   = useState([])
  const [rows, setRows]         = useState([])
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping]   = useState({ date: -1, description: -1, amount: -1, debit: -1, credit: -1 })
  const [mode, setMode]         = useState('signed')
  const [expenseCat, setExpenseCat] = useState('')
  const [incomeCat, setIncomeCat]   = useState('')
  const [skipDupes, setSkipDupes]   = useState(true)
  const [existing, setExisting] = useState(null) // Set de claves ya guardadas
  const [error, setError]       = useState('')
  const [importing, setImporting] = useState(false)

  const [rawRows, setRawRows] = useState([])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (file.size > MAX_BYTES) return setError('El archivo supera los 5 MB.')
    if (!/\.(csv|txt)$/i.test(file.name))
      return setError('Por ahora solo se aceptan archivos CSV. Si tienes Excel, usa Archivo → Guardar como → CSV.')

    try {
      const parsed = parseCSV(await file.text())
      if (parsed.length < 2) return setError('El archivo no tiene movimientos.')
      setFileName(file.name)
      setRawRows(parsed)
      const header = parsed[0]
      const guess = guessMapping(header)
      const looksLikeHeader = guess.mapping.date >= 0 || guess.mapping.amount >= 0 || guess.mapping.debit >= 0
      setHasHeader(looksLikeHeader)
      setHeaders(looksLikeHeader ? header : header.map((_, i) => `Columna ${i + 1}`))
      setRows(looksLikeHeader ? parsed.slice(1) : parsed)
      setMapping(looksLikeHeader ? guess.mapping : { date: 0, description: 1, amount: 2, debit: -1, credit: -1 })
      setMode(guess.mode)
      setExisting(null)

    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  function toggleHeader(value) {
    setHasHeader(value)
    if (!rawRows.length) return
    setHeaders(value ? rawRows[0] : rawRows[0].map((_, i) => `Columna ${i + 1}`))
    setRows(value ? rawRows.slice(1) : rawRows)
  }

  const parsed = useMemo(
    () => (rows.length ? rowsToMovements(rows, mapping, mode) : []),
    [rows, mapping, mode],
  )
  const valid = parsed.filter((m) => !m.error)

  // Claves de lo ya registrado en el rango de fechas del archivo (para detectar duplicados)
  const range = useMemo(() => {
    if (!valid.length) return null
    const dates = valid.map((m) => m.date).sort()
    return { from: dates[0], to: dates[dates.length - 1] }
  }, [valid])

  const rangeFrom = range?.from
  const rangeTo   = range?.to
  useEffect(() => {
    if (!rangeFrom) return undefined
    let cancelled = false
    movementService.getRange(rangeFrom, rangeTo)
      .then((list) => { if (!cancelled) setExisting(new Set(list.map((m) => movementKey(m.kind, m.date, m.amount, m.description)))) })
      .catch(() => { if (!cancelled) setExisting(new Set()) })
    return () => { cancelled = true }
  }, [rangeFrom, rangeTo])

  const items = useMemo(() => parsed.map((m) => ({
    ...m,
    duplicate: !m.error && existing?.has(movementKey(m.kind, m.date, m.amount, m.description)),
  })), [parsed, existing])

  const toImport = items.filter((m) => !m.error && !(skipDupes && m.duplicate))
  const dupes = items.filter((m) => m.duplicate).length
  const errors = items.filter((m) => m.error).length

  const colOptions = (allowNone = false) => [
    { value: '-1', label: allowNone ? '— Ninguna —' : 'Selecciona columna' },
    ...headers.map((h, i) => ({ value: String(i), label: h || `Columna ${i + 1}` })),
  ]
  const setCol = (field) => (e) => setMapping((m) => ({ ...m, [field]: Number(e.target.value) }))

  const needsAmount = mode !== 'split'
  const mappingOk = mapping.date >= 0 && (needsAmount ? mapping.amount >= 0 : mapping.debit >= 0 || mapping.credit >= 0)

  const catOptions = (type) => [
    { value: '', label: 'Sin categoría' },
    ...categories.filter((c) => c.type === type || c.type === 'both').map((c) => ({ value: c.id, label: c.name })),
  ]

  async function handleImport() {
    setImporting(true)
    setError('')
    try {
      const result = await movementService.bulkInsert(toImport.map((m) => ({
        kind: m.kind, date: m.date, amount: m.amount, description: m.description,
        category_id: m.kind === 'expense' ? expenseCat : incomeCat,
      })))
      showToast(`Importados ${result.expenses} gastos y ${result.incomes} ingresos`, 'success')
      onImported()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (!rows.length) {
    return (
      <div className={styles.root}>
        <p className={styles.help}>
          Sube un archivo <strong>CSV</strong> con tus movimientos (por ejemplo, el extracto que descargas de tu banco).
          Después eliges qué columna es cada dato y revisas una vista previa antes de importar.
        </p>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={handleFile} />
        <button type="button" className={styles.drop} onClick={() => fileRef.current?.click()}>
          <IconUpload size={22} stroke={1.5} />
          <span>Elegir archivo CSV</span>
        </button>
        <p className={styles.hint}>
          ¿Tu banco solo entrega Excel o PDF? Abre el archivo en Excel y usa «Guardar como → CSV».
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <p className={styles.help}>
        <strong>{fileName}</strong> · {rows.length} filas.{' '}
        <button type="button" className={styles.link} onClick={() => { setRows([]); setRawRows([]) }}>
          Elegir otro archivo
        </button>
      </p>

      <label className={styles.check}>
        <input type="checkbox" checked={hasHeader} onChange={(e) => toggleHeader(e.target.checked)} />
        La primera fila contiene los nombres de las columnas
      </label>

      <Select label="¿Cómo vienen los montos?" options={MODES} value={mode} onChange={(e) => setMode(e.target.value)} />

      <div className={styles.grid}>
        <Select label="Columna de fecha" options={colOptions()} value={String(mapping.date)} onChange={setCol('date')} />
        <Select label="Columna de descripción" options={colOptions(true)} value={String(mapping.description)} onChange={setCol('description')} />
        {needsAmount ? (
          <Select label="Columna de monto" options={colOptions()} value={String(mapping.amount)} onChange={setCol('amount')} />
        ) : (
          <>
            <Select label="Columna de cargo (gasto)" options={colOptions(true)} value={String(mapping.debit)} onChange={setCol('debit')} />
            <Select label="Columna de abono (ingreso)" options={colOptions(true)} value={String(mapping.credit)} onChange={setCol('credit')} />
          </>
        )}
      </div>

      <div className={styles.grid}>
        <Select label="Categoría para gastos" options={catOptions('expense')} value={expenseCat} onChange={(e) => setExpenseCat(e.target.value)} />
        <Select label="Categoría para ingresos" options={catOptions('income')} value={incomeCat} onChange={(e) => setIncomeCat(e.target.value)} />
      </div>

      {mappingOk && (
        <>
          <div className={styles.summary} aria-live="polite">
            <span><strong>{toImport.length}</strong> se importarán</span>
            {dupes > 0 && <span>{dupes} posibles duplicados</span>}
            {errors > 0 && <span className={styles.warn}>{errors} filas con error (se omiten)</span>}
          </div>

          {dupes > 0 && (
            <label className={styles.check}>
              <input type="checkbox" checked={skipDupes} onChange={(e) => setSkipDupes(e.target.checked)} />
              Omitir movimientos que ya tengo registrados (misma fecha, monto y descripción)
            </label>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Fecha</th><th>Descripción</th><th>Tipo</th><th className={styles.n}>Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {items.slice(0, PREVIEW_ROWS).map((m) => (
                  <tr key={m.index}>
                    <td>{m.date ? formatDate(m.date) : '—'}</td>
                    <td className={styles.descCell}>{m.description || '—'}</td>
                    <td>{m.kind === 'income' ? 'Ingreso' : m.kind === 'expense' ? 'Gasto' : '—'}</td>
                    <td className={styles.n}>{m.amount !== null ? formatCurrency(m.amount) : '—'}</td>
                    <td className={m.error ? styles.warn : undefined}>
                      {m.error ?? (m.duplicate ? 'Duplicado' : 'Nuevo')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length > PREVIEW_ROWS && (
            <p className={styles.hint}>Mostrando {PREVIEW_ROWS} de {items.length} filas.</p>
          )}
        </>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!mappingOk || !toImport.length || importing} onClick={handleImport}>
          {importing ? 'Importando…' : `Importar ${toImport.length} movimientos`}
        </Button>
      </div>
    </div>
  )
}
