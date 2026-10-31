import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'

const DAYS_PER_MONTH = 30.44
// Con menos de 2 semanas de historia el ritmo no es fiable para proyectar.
const MIN_DAYS_FOR_PACE = 14

/**
 * Proyección de un objetivo de ahorro (solo presentación).
 * - estimatedDate: cuándo se cumpliría al ritmo promedio desde que se creó.
 *   Es aproximado: si el objetivo nació con dinero ya ahorrado, el ritmo sale
 *   más alto de lo real.
 * - monthlyNeeded: cuánto ahorrar por mes para llegar a la fecha límite.
 * - onTrack: true/false si hay fecha límite y estimación; null si no se puede saber.
 */
export function getGoalForecast(goal, now = new Date()) {
  const current = Number(goal.progressAmount ?? goal.current_amount ?? 0)
  const target  = Number(goal.target_amount ?? 0)
  const remaining = Math.max(target - current, 0)
  const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

  if (remaining <= 0) {
    return { current, target, remaining: 0, percent: 100, done: true, estimatedDate: null, monthlyNeeded: null, daysLeft: null, onTrack: true, targetPassed: false }
  }

  let estimatedDate = null
  const created = goal.created_at ? new Date(goal.created_at) : null
  const elapsedDays = created ? differenceInCalendarDays(now, created) : 0
  if (current > 0 && elapsedDays >= MIN_DAYS_FOR_PACE) {
    const perDay = current / elapsedDays
    estimatedDate = addDays(now, Math.ceil(remaining / perDay))
  }

  let monthlyNeeded = null
  let daysLeft = null
  let targetPassed = false
  if (goal.target_date) {
    const deadline = parseISO(goal.target_date)
    daysLeft = differenceInCalendarDays(deadline, now)
    targetPassed = daysLeft < 0
    if (!targetPassed) {
      const monthsLeft = Math.max(daysLeft / DAYS_PER_MONTH, 1)
      monthlyNeeded = Math.ceil((remaining / monthsLeft) * 100) / 100
    }
  }

  let onTrack = null
  if (goal.target_date && targetPassed) onTrack = false
  else if (goal.target_date && estimatedDate) onTrack = estimatedDate <= parseISO(goal.target_date)

  return { current, target, remaining, percent, done: false, estimatedDate, monthlyNeeded, daysLeft, onTrack, targetPassed }
}
