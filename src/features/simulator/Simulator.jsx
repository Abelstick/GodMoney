import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { SegmentedControl } from '@mantine/core'
import { IconArrowRight } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useAccounts } from '@/hooks/useAccounts'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { Card } from '@/components/ui/Card/Card'
import { Money } from '@/components/ui/Money/Money'
import { Modal } from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { Disclaimer } from '@/components/common/Disclaimer/Disclaimer'
import { formatDate } from '@/lib/formatters'
import { humanizeError } from '@/lib/errorMessages'
import { createScenario, normalizeScenario } from '@/lib/simulation/scenarioModel'
import { runProjection } from '@/lib/simulation/projection'
import { buildInsights } from '@/lib/simulation/insights'
import { fromCents } from '@/lib/simulation/money'
import { useScenarioDraft, fingerprint } from './hooks/useScenarioDraft'
import { ScenarioBar } from './components/ScenarioBar'
import { ScenarioConfig } from './components/ScenarioConfig'
import { EventList } from './components/EventList'
import { EventForm } from './components/EventForm'
import { ImportModal } from './components/ImportModal'
import { HorizonPicker } from './components/HorizonPicker'
import { ResultsHero } from './components/ResultsHero'
import { CheckpointStrip } from './components/CheckpointStrip'
import { BalanceChart } from './components/BalanceChart'
import { InsightsList } from './components/InsightsList'
import { AccountBreakdown } from './components/AccountBreakdown'
import { ComparisonPanel } from './components/ComparisonPanel'
import styles from './Simulator.module.css'

const TABS = [
  { value: 'build',   label: 'Escenario' },
  { value: 'results', label: 'Resultados' },
  { value: 'compare', label: 'Comparar' },
]

const CURRENT = 'current'
const BASELINE = 'baseline'

// Simulador "¿Qué pasaría si…?". Todo se calcula en el cliente a partir del
// escenario en edición: nunca crea ni modifica movimientos, saldos ni
// presupuestos reales.
export function Simulator() {
  const { accounts: allAccounts, loading: accountsLoading } = useAccounts()
  const accounts = useMemo(() => allAccounts.filter((a) => !a.is_archived), [allAccounts])
  const scenarios = useStore((s) => s.scenarios)
  const scenariosError = useStore((s) => s.scenariosError)
  const fetchScenarios = useStore((s) => s.fetchScenarios)
  const saveScenario = useStore((s) => s.saveScenario)
  const removeScenario = useStore((s) => s.removeScenario)
  const showToast = useStore((s) => s.showToast)

  const { draft, dispatch, baseline, setBaseline } = useScenarioDraft()
  const [tab, setTab] = useState('build')
  const [eventModal, setEventModal] = useState(null) // { event? }
  const [importOpen, setImportOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind: 'delete'|'discard', then? }
  const [busy, setBusy] = useState(false)
  const [compareKeys, setCompareKeys] = useState({ a: null, b: CURRENT })

  useEffect(() => { fetchScenarios() }, [fetchScenarios])

  // El cálculo usa una versión diferida del borrador: escribir un monto no se
  // traba aunque el escenario tenga muchos movimientos.
  const scenario = useDeferredValue(draft)
  const projection = useMemo(() => runProjection(scenario), [scenario])
  const insights = useMemo(
    () => buildInsights(scenario, projection.window, { thresholdCents: projection.thresholdCents }),
    [scenario, projection.window, projection.thresholdCents],
  )
  const { summary, window } = projection
  const hasEvents = draft.events.length > 0
  const usesAccounts = draft.config.balanceMode === 'accounts'
    || draft.events.some((e) => e.accountId || e.toAccountId)

  // ── Estado guardado ──
  const savedRow = draft.id ? scenarios.find((s) => s.id === draft.id) : null
  const dirty = draft.id
    ? !savedRow || fingerprint(normalizeScenario(savedRow)) !== fingerprint(draft)
    : hasEvents
  const hasUnsavedWork = dirty && hasEvents

  async function save() {
    setBusy(true)
    try {
      const row = await saveScenario(draft)
      dispatch({ type: 'load', scenario: { ...draft, id: row.id } })
      return row
    } catch (err) {
      showToast(humanizeError(err.message), 'error')
      return null
    } finally {
      setBusy(false)
    }
  }

  // Guarda la versión actual como "A" y sigue editando una copia ("B").
  async function createVariant() {
    let original = draft
    if (dirty || !draft.id) {
      try {
        const row = await saveScenario(draft)
        original = { ...draft, id: row.id }
      } catch {
        // Sin migración 019 o sin conexión: la versión A queda solo en este dispositivo.
      }
    }
    setBaseline(original)
    dispatch({ type: 'load', scenario: { ...draft, id: null, name: `${draft.name} · variante`.slice(0, 80) } })
    setCompareKeys({ a: original.id ?? BASELINE, b: CURRENT })
    showToast('Variante creada: cámbiala y compárala con la original', 'success')
  }

  function guarded(action) {
    if (hasUnsavedWork) setConfirm({ kind: 'discard', then: action })
    else action()
  }

  const startNew = () => {
    dispatch({ type: 'load', scenario: createScenario({ config: { ...createScenario().config, threshold: draft.config.threshold } }) })
    setTab('build')
  }
  const openSaved = (row) => {
    dispatch({ type: 'load', scenario: normalizeScenario(row) })
    setTab('results')
  }

  async function confirmAction() {
    if (confirm.kind === 'discard') {
      confirm.then()
      setConfirm(null)
      return
    }
    setBusy(true)
    try {
      await removeScenario(draft.id)
      // El contenido sigue en pantalla como borrador por si lo quieres rehacer.
      dispatch({ type: 'load', scenario: { ...draft, id: null } })
      setConfirm(null)
    } catch (err) {
      showToast(humanizeError(err.message), 'error')
    } finally {
      setBusy(false)
    }
  }

  // ── Eventos ──
  function submitEvent(event, { addAnother }) {
    const editing = draft.events.some((e) => e.id === event.id)
    dispatch({ type: editing ? 'update_event' : 'add_event', event })
    if (!addAnother) setEventModal(null)
    if (!editing) showToast(addAnother ? 'Agregado. Sigue con el siguiente' : 'Movimiento agregado a la simulación', 'success')
  }

  function removeEvent(event) {
    const index = draft.events.findIndex((e) => e.id === event.id)
    dispatch({ type: 'remove_event', id: event.id })
    showToast('Movimiento quitado de la simulación', 'info', {
      label: 'Deshacer',
      onClick: () => dispatch({ type: 'restore_event', event, index }),
    })
  }

  function importEvents(events) {
    if (!events.length) return
    dispatch({ type: 'import_events', events })
    showToast(`${events.length} ${events.length === 1 ? 'movimiento importado' : 'movimientos importados'}`, 'success')
  }

  const setConfig = (patch) => dispatch({ type: 'set_config', patch })

  // ── Opciones de comparación ──
  const compareOptions = useMemo(() => {
    const list = [{ key: CURRENT, label: `${draft.name} (actual)`, scenario }]
    const savedIds = new Set(scenarios.map((s) => s.id))
    // La versión A local (sin guardar en la nube) solo se ofrece si no está ya
    // en la lista de guardados ni es el escenario abierto.
    if (baseline && (!baseline.id || (!savedIds.has(baseline.id) && baseline.id !== draft.id))) {
      list.push({ key: baseline.id ?? BASELINE, label: baseline.name, scenario: baseline })
    }
    for (const row of scenarios) {
      if (row.id === draft.id) continue
      list.push({ key: row.id, label: row.name, scenario: normalizeScenario(row) })
    }
    return list
  }, [draft.name, draft.id, scenario, scenarios, baseline])

  const keys = compareOptions.map((o) => o.key)
  const aKey = keys.includes(compareKeys.a) ? compareKeys.a : keys.find((k) => k !== CURRENT) ?? CURRENT
  const bKey = keys.includes(compareKeys.b) ? compareKeys.b : CURRENT

  return (
    <div className={styles.page}>
      <PageHeader
        title="¿Qué pasaría si…?"
        subtitle="Prueba decisiones antes de tomarlas. Nada de lo que hagas aquí cambia tus cuentas, movimientos ni presupuestos."
      />

      <ScenarioBar
        draft={draft}
        dirty={dirty}
        saving={busy}
        scenarios={scenarios}
        scenariosError={scenariosError}
        onRename={(name) => dispatch({ type: 'rename', name })}
        onSave={save}
        onNew={() => guarded(startNew)}
        onVariant={createVariant}
        onOpen={(row) => guarded(() => openSaved(row))}
        onDelete={() => setConfirm({ kind: 'delete' })}
      />

      <SegmentedControl
        className={styles.tabs}
        fullWidth
        value={tab}
        onChange={setTab}
        data={TABS}
        aria-label="Secciones del simulador"
      />

      <div className={styles.layout}>
        <div className={styles.workspace}>
          <div className={styles.builder} data-active={tab === 'build' || undefined}>
            {hasEvents && (
              <button type="button" className={styles.peek} onClick={() => setTab('results')}>
                <span className={styles.peekItem}>
                  <span className={styles.peekLabel}>Al {formatDate(window.to)}</span>
                  <Money value={fromCents(summary.final)} tone={summary.final < 0 ? 'expense' : 'neutral'} className={styles.peekValue} />
                </span>
                <span className={styles.peekItem}>
                  <span className={styles.peekLabel}>Mínimo</span>
                  <Money value={fromCents(summary.min.balance)} tone={summary.min.balance < 0 ? 'expense' : 'neutral'} className={styles.peekValue} />
                </span>
                <span className={styles.peekGo}>Ver <IconArrowRight size={16} aria-hidden="true" /></span>
              </button>
            )}

            <ScenarioConfig config={draft.config} accounts={accounts} loading={accountsLoading} onChange={setConfig} />

            <EventList
              events={draft.events}
              window={window}
              accounts={accounts}
              onAdd={() => setEventModal({})}
              onImport={() => setImportOpen(true)}
              onEdit={(event) => setEventModal({ event })}
              onDuplicate={(id) => dispatch({ type: 'duplicate_event', id })}
              onRemove={removeEvent}
              onToggle={(id) => dispatch({ type: 'toggle_event', id })}
            />
          </div>

          <div className={styles.results} data-active={tab === 'results' || undefined}>
            <ResultsHero summary={summary} window={window} />

            <section aria-labelledby="sim-periods" className={styles.block}>
              <h2 id="sim-periods" className={styles.blockTitle}>Saldo proyectado por período</h2>
              <CheckpointStrip checkpoints={projection.checkpoints} thresholdCents={projection.thresholdCents} />
            </section>

            <Card>
              <div className={styles.chartHead}>
                <div>
                  <h2 className={styles.blockTitle}>Evolución del saldo</h2>
                  <p className={styles.blockSub}>{formatDate(window.from)} – {formatDate(window.to)}</p>
                </div>
                <HorizonPicker config={draft.config} windowEnd={window.to} onChange={setConfig} />
              </div>
              <BalanceChart points={projection.points} thresholdCents={projection.thresholdCents} />
            </Card>

            {insights.length > 0 && (
              <section aria-labelledby="sim-insights" className={styles.block}>
                <h2 id="sim-insights" className={styles.blockTitle}>Alertas y recomendaciones</h2>
                <InsightsList insights={insights} />
              </section>
            )}

            {usesAccounts && (
              <Card><AccountBreakdown result={projection.result} accounts={accounts} /></Card>
            )}
          </div>
        </div>

        <div className={styles.compare} data-active={tab === 'compare' || undefined}>
          <ComparisonPanel
            options={compareOptions}
            aKey={aKey}
            bKey={bKey}
            window={window}
            onChange={setCompareKeys}
          />
        </div>
      </div>

      <p className={styles.footNote}>
        Las proyecciones usan solo los datos de este escenario y suponen que todo ocurre en las fechas indicadas. Son una guía, no una certeza.
      </p>
      <Disclaimer kind="prediction" />

      <Modal
        isOpen={Boolean(eventModal)}
        onClose={() => setEventModal(null)}
        title={eventModal?.event ? 'Editar movimiento' : 'Nuevo movimiento hipotético'}
      >
        {eventModal && (
          <EventForm
            key={eventModal.event?.id ?? 'new'}
            initial={eventModal.event}
            defaultDate={draft.config.startDate}
            accounts={accounts}
            onSubmit={submitEvent}
            onCancel={() => setEventModal(null)}
          />
        )}
      </Modal>

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        window={window}
        existingEvents={draft.events}
        onImport={importEvents}
      />

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        loading={busy}
        title={confirm?.kind === 'delete' ? `¿Eliminar «${draft.name}»?` : '¿Descartar los cambios?'}
        description={confirm?.kind === 'delete'
          ? 'Se borra el escenario guardado. Lo que ves en pantalla queda como borrador sin guardar. Tus cuentas reales no se tocan.'
          : 'Este escenario tiene cambios sin guardar y se perderán.'}
        confirmLabel={confirm?.kind === 'delete' ? 'Eliminar escenario' : 'Descartar'}
      />
    </div>
  )
}
