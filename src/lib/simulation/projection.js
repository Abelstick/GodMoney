import { addDays, format, parseISO } from 'date-fns'
import { simulate } from './engine'
import { checkpoints, summarize } from './metrics'
import { horizonEnd } from './scenarioModel'
import { toCents } from './money'

const ISO = 'yyyy-MM-dd'
// Los cortes 7/15/30/60 días se calculan siempre, aunque el horizonte elegido
// sea más corto: la simulación corre al menos 60 días.
const CHECKPOINT_SPAN = 60

// Ventana de fechas que define la configuración del escenario.
export function scenarioWindow(config) {
  return { from: config.startDate, to: horizonEnd(config.startDate, config.horizon, config.customEnd) }
}

/**
 * Proyección completa de un escenario: resultado diario, indicadores del
 * horizonte elegido y saldos en los cortes fijos.
 * `window` permite forzar otra ventana (p. ej. al comparar).
 */
export function runProjection(scenario, window = scenarioWindow(scenario.config)) {
  const minEnd = format(addDays(parseISO(window.from), CHECKPOINT_SPAN), ISO)
  const extended = simulate(scenario, { from: window.from, to: window.to > minEnd ? window.to : minEnd })
  const thresholdCents = Math.max(0, toCents(scenario.config.threshold))
  const summary = summarize(extended, { until: window.to, thresholdCents })
  return {
    window,
    thresholdCents,
    result: extended,
    // Solo los días del horizonte elegido (para el gráfico).
    points: extended.points.filter((p) => p.date <= window.to),
    summary,
    checkpoints: checkpoints(extended),
  }
}
