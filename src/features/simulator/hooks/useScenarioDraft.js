import { useCallback, useMemo } from 'react'
import { usePersistentState } from '@/hooks/usePersistentState'
import { createScenario, normalizeScenario, scenarioReducer } from '@/lib/simulation/scenarioModel'

const DRAFT_KEY = 'godmoney.simulator.draft'
const BASELINE_KEY = 'godmoney.simulator.baseline'

const isObject = (v) => v !== null && typeof v === 'object'

// Huella comparable de un escenario (para saber si hay cambios sin guardar).
export const fingerprint = (s) => (s ? JSON.stringify({ name: s.name, config: s.config, events: s.events }) : '')

/**
 * Escenario en edición. Se recuerda en este dispositivo (localStorage) para
 * no perder lo armado al cerrar la app; guardarlo en la nube es explícito.
 * `baseline` es la versión "A" que queda al crear una variante, para poder
 * compararla aunque no se haya guardado.
 */
export function useScenarioDraft() {
  const [rawDraft, setRawDraft] = usePersistentState(DRAFT_KEY, null, isObject)
  const [rawBaseline, setBaseline] = usePersistentState(BASELINE_KEY, null, (v) => v === null || isObject(v))

  const draft = useMemo(() => (rawDraft ? normalizeScenario(rawDraft) : createScenario()), [rawDraft])
  const baseline = useMemo(() => (rawBaseline ? normalizeScenario(rawBaseline) : null), [rawBaseline])

  const dispatch = useCallback((action) => {
    setRawDraft((current) => scenarioReducer(current ? normalizeScenario(current) : createScenario(), action))
  }, [setRawDraft])

  return { draft, dispatch, baseline, setBaseline }
}
