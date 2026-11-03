import { addDays, format, parseISO } from 'date-fns'
import { expandOccurrences } from './recurrence'
import { toCents } from './money'
import { EVENT_TYPES, TYPE_ORDER, initialCentsOf, isValidEvent } from './scenarioModel'

const ISO = 'yyyy-MM-dd'

// Cubo para el dinero sin cuenta asignada (saldo manual o eventos sin cuenta).
export const GENERAL_BUCKET = '__general__'

function initialBuckets(config) {
  const buckets = new Map()
  if (config.balanceMode === 'accounts' && config.accountBalances.length) {
    for (const a of config.accountBalances) buckets.set(a.accountId, toCents(a.amount))
  } else {
    buckets.set(GENERAL_BUCKET, toCents(config.initialBalance))
  }
  return buckets
}

const bucketOf = (accountId) => accountId || GENERAL_BUCKET

/**
 * Motor de simulación: procesa cronológicamente todos los eventos activos del
 * escenario entre `from` y `to` (inclusive) y devuelve el saldo al cierre de
 * cada día. Todo en céntimos enteros.
 *
 * Reglas:
 * - Ingreso suma; gasto, pago de deuda y ahorro restan del disponible.
 *   El ahorro se acumula aparte en `totals.saving` (sale del disponible pero
 *   no es consumo).
 * - Transferencia mueve dinero entre cuentas: no cambia el total.
 * - El mismo día se aplican primero los ingresos y luego las salidas, así el
 *   saldo del día no muestra un "hueco" que en realidad no existe.
 * - Eventos inválidos o desactivados no participan.
 *
 * Es una función pura: no lee ni escribe datos reales.
 */
export function simulate(scenario, { from, to }) {
  const config = scenario.config
  const initial = initialCentsOf(config)
  const buckets = initialBuckets(config)

  const occurrences = []
  scenario.events.forEach((event, index) => {
    if (!event.enabled || !isValidEvent(event)) return
    const cents = toCents(event.amount)
    for (const date of expandOccurrences(event, from, to)) {
      occurrences.push({ date, event, index, cents })
    }
  })
  occurrences.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    const byType = TYPE_ORDER[a.event.type] - TYPE_ORDER[b.event.type]
    return byType !== 0 ? byType : a.index - b.index
  })

  const totals = { income: 0, expense: 0, debt: 0, saving: 0, transfer: 0 }
  const points = []
  let balance = initial
  let cursor = 0
  const end = parseISO(to)

  for (let day = parseISO(from); day <= end; day = addDays(day, 1)) {
    const date = format(day, ISO)
    let inflow = 0
    let outflow = 0
    const items = []

    while (cursor < occurrences.length && occurrences[cursor].date === date) {
      const { event, cents } = occurrences[cursor]
      const direction = EVENT_TYPES[event.type].direction
      if (event.type === 'transfer') {
        const fromKey = bucketOf(event.accountId)
        const toKey = bucketOf(event.toAccountId)
        buckets.set(fromKey, (buckets.get(fromKey) ?? 0) - cents)
        buckets.set(toKey, (buckets.get(toKey) ?? 0) + cents)
      } else {
        const key = bucketOf(event.accountId)
        buckets.set(key, (buckets.get(key) ?? 0) + direction * cents)
        balance += direction * cents
        if (direction > 0) inflow += cents
        else outflow += cents
      }
      totals[event.type] += cents
      items.push({
        eventId: event.id,
        type: event.type,
        description: event.description,
        cents,
        delta: direction * cents,
        balanceAfter: balance,
      })
      cursor += 1
    }

    points.push({ date, balance, inflow, outflow, items })
  }

  return {
    from,
    to,
    initial,
    points,
    totals,
    finalBuckets: Object.fromEntries(buckets),
    initialBuckets: Object.fromEntries(initialBuckets(config)),
  }
}
