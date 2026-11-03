import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import { useStore } from '@/store'
import { Modal } from '@/components/common/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { Money } from '@/components/ui/Money/Money'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { recurringTransactionService } from '@/services/recurringTransactionService'
import { loanService } from '@/services/loanService'
import { importCandidates, IMPORT_GROUPS } from '@/lib/simulation/importSources'
import { formatRelativeDay } from '@/lib/formatters'
import { repeatLabel } from '@/lib/simulation/recurrence'
import styles from './Panels.module.css'

const sourceKey = (e) => (e.source ? `${e.source.kind}:${e.source.id}` : null)

// Lee (solo lectura) tus gastos/ingresos automáticos, pagos recurrentes y
// cuotas pendientes, y ofrece copiarlos como movimientos hipotéticos.
async function loadSources(store) {
  const settled = await Promise.allSettled([
    recurringTransactionService.getAll('income'),
    recurringTransactionService.getAll('expense'),
    store.recurringPayments.length ? Promise.resolve(null) : store.fetchRecurringPayments(),
    loanService.getPendingInstallments(),
  ])
  const value = (i) => (settled[i].status === 'fulfilled' ? settled[i].value ?? [] : [])
  const latest = useStore.getState()
  return {
    recurringTransactions: [...value(0), ...value(1)],
    recurringPayments: latest.recurringPayments,
    ledger: latest.recurringPaymentLedger,
    installments: value(3),
    failed: settled.filter((s) => s.status === 'rejected').length,
  }
}

export function ImportModal({ isOpen, onClose, window, existingEvents, onImport }) {
  const [state, setState] = useState({ loading: true, candidates: [], failed: 0 })
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    if (!isOpen) return undefined
    let cancelled = false
    setState({ loading: true, candidates: [], failed: 0 })
    loadSources(useStore.getState()).then((sources) => {
      if (cancelled) return
      const candidates = importCandidates({ ...sources, ...window })
      const existing = new Set(existingEvents.map(sourceKey).filter(Boolean))
      setState({ loading: false, candidates, failed: sources.failed, existing })
      setSelected(new Set(candidates.filter((c) => c.suggested && !existing.has(c.key)).map((c) => c.key)))
    })
    return () => { cancelled = true }
    // Solo al abrir: la lista de eventos cambia mientras el modal está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, window.from, window.to])

  const groups = useMemo(() => IMPORT_GROUPS
    .map((g) => ({ ...g, items: state.candidates.filter((c) => c.group === g.value) }))
    .filter((g) => g.items.length), [state.candidates])

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function confirm() {
    onImport(state.candidates.filter((c) => selected.has(c.key)).map((c) => c.event))
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar de mis datos" size="lg">
      <p className={styles.modalIntro}>
        Se agregan como copias al escenario. Tus pagos, sueldos y préstamos reales no cambian.
      </p>

      {state.loading && (
        <div className={styles.importSkeleton}>
          <Skeleton style={{ height: 18, width: '40%' }} />
          <Skeleton style={{ height: 56 }} />
          <Skeleton style={{ height: 56 }} />
          <Skeleton style={{ height: 56 }} />
        </div>
      )}
      {!state.loading && groups.length === 0 && (
        <EmptyState
          compact
          icon={<IconDownload size={28} stroke={1.5} />}
          title="No hay nada que importar en este periodo"
          description="No encontramos gastos o ingresos automáticos, pagos recurrentes con monto ni cuotas pendientes entre estas fechas."
        />
      )}
      {!state.loading && groups.map((group) => (
        <section key={group.value} className={styles.importGroup}>
          <h3 className={styles.importGroupTitle}>{group.label}</h3>
          <ul className={styles.importList}>
            {group.items.map((c) => {
              const already = state.existing?.has(c.key)
              return (
                <li key={c.key}>
                  <label className={`${styles.importRow} ${already ? styles.importDisabled : ''}`}>
                    <Checkbox
                      checked={already || selected.has(c.key)}
                      disabled={already}
                      onChange={() => toggle(c.key)}
                      aria-label={c.event.description}
                    />
                    <span className={styles.importText}>
                      <span className={styles.importTitle}>{c.event.description}</span>
                      <span className={styles.importMeta}>
                        {already ? 'Ya está en el escenario' : `${formatRelativeDay(c.event.date)} · ${c.event.repeat === 'once' ? 'Única vez' : repeatLabel(c.event.repeat, c.event.date)} · ${c.note}`}
                      </span>
                    </span>
                    <Money value={c.event.amount} tone={c.event.type === 'income' ? 'income' : 'expense'} signed />
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {state.failed > 0 && !state.loading && (
        <p className={styles.modalNote}>Algunas fuentes no se pudieron leer (¿sin conexión?). Lo que ves es lo que sí cargó.</p>
      )}

      <div className={styles.modalActions}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirm} disabled={state.loading || selected.size === 0}>
          {selected.size ? `Agregar ${selected.size}` : 'Agregar'}
        </Button>
      </div>
    </Modal>
  )
}
