import { addDays, addMonths, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { REPEAT_VALUES } from './recurrence'
import { isPositiveAmount, toCents } from './money'

// Modelo de un escenario hipotético. Vive solo en el simulador (borrador local
// o tabla simulation_scenarios): nunca se convierte en movimientos reales.

const ISO = 'yyyy-MM-dd'
export const todayISO = (now = new Date()) => format(now, ISO)

// direction: +1 entra dinero al disponible, −1 sale, 0 se mueve entre cuentas.
// categoryType: qué categorías reales se ofrecen para etiquetar el evento.
export const EVENT_TYPES = {
  income:   { label: 'Ingreso',        short: 'Ingreso',       direction: 1,  categoryType: 'income'  },
  expense:  { label: 'Gasto',          short: 'Gasto',         direction: -1, categoryType: 'expense' },
  debt:     { label: 'Pago de deuda',  short: 'Deuda',         direction: -1, categoryType: 'expense' },
  saving:   { label: 'Ahorro',         short: 'Ahorro',        direction: -1, categoryType: 'expense' },
  transfer: { label: 'Transferencia',  short: 'Transferencia', direction: 0,  categoryType: null      },
}
export const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES)

export const HORIZONS = [
  { value: '7d',     label: '7 días',  short: '7d'  },
  { value: '15d',    label: '15 días', short: '15d' },
  { value: '1m',     label: '1 mes',   short: '1m'  },
  { value: '2m',     label: '2 meses', short: '2m'  },
  { value: '3m',     label: '3 meses', short: '3m'  },
  { value: 'custom', label: 'Personalizado', short: 'Otro' },
]

// Rango máximo de una proyección: más allá de dos años la simulación diaria
// deja de ser útil y solo cuesta rendimiento.
export const MAX_RANGE_DAYS = 730

// Fecha final del horizonte (inclusive). "1 mes" desde el 2 nov = 2 dic.
export function horizonEnd(startDate, horizon, customEnd) {
  const start = parseISO(startDate)
  switch (horizon) {
    case '7d':  return format(addDays(start, 7), ISO)
    case '15d': return format(addDays(start, 15), ISO)
    case '1m':  return format(addMonths(start, 1), ISO)
    case '2m':  return format(addMonths(start, 2), ISO)
    case '3m':  return format(addMonths(start, 3), ISO)
    default: {
      if (!customEnd || customEnd < startDate) return format(addMonths(start, 1), ISO)
      const max = format(addDays(start, MAX_RANGE_DAYS), ISO)
      return customEnd > max ? max : customEnd
    }
  }
}

export function rangeDays(from, to) {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEvent(partial = {}, now = new Date()) {
  return {
    id: uid(),
    type: 'expense',
    description: '',
    amount: '',
    date: todayISO(now),
    repeat: 'once',
    until: null,
    categoryId: null,
    categoryName: null,
    accountId: null,
    toAccountId: null,
    enabled: true,
    source: null,
    ...partial,
  }
}

export function createScenario(partial = {}, now = new Date()) {
  return {
    id: null, // null = todavía no guardado en la nube
    name: 'Mi escenario',
    config: {
      // 'manual': un único saldo; 'accounts': foto de los saldos de tus cuentas.
      balanceMode: 'manual',
      initialBalance: '',
      accountBalances: [],
      startDate: todayISO(now),
      horizon: '1m',
      customEnd: null,
      threshold: '',
    },
    events: [],
    ...partial,
  }
}

// Saldo inicial total del escenario, en céntimos.
export function initialCentsOf(config) {
  if (config.balanceMode === 'accounts') {
    return config.accountBalances.reduce((acc, a) => acc + toCents(a.amount), 0)
  }
  return toCents(config.initialBalance)
}

const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s))

export function validateEvent(event) {
  const errors = {}
  if (!EVENT_TYPES[event.type]) errors.type = 'Elige un tipo'
  if (!isPositiveAmount(event.amount)) errors.amount = 'Ingresa un monto mayor a 0'
  if (!validDate(event.date)) errors.date = 'Fecha inválida'
  if (event.until && (!validDate(event.until) || event.until < event.date)) {
    errors.until = 'Debe ser igual o posterior a la fecha'
  }
  if (event.type === 'transfer') {
    if (!event.accountId) errors.accountId = 'Elige la cuenta de origen'
    if (!event.toAccountId) errors.toAccountId = 'Elige la cuenta de destino'
    if (event.accountId && event.accountId === event.toAccountId) errors.toAccountId = 'Debe ser otra cuenta'
  }
  return errors
}

export const isValidEvent = (event) => Object.keys(validateEvent(event)).length === 0

// Repara un escenario leído de almacenamiento (localStorage o BD): campos
// faltantes con su valor por defecto y eventos inválidos descartados, para que
// un dato viejo o corrupto nunca rompa la pantalla.
export function normalizeScenario(raw, now = new Date()) {
  const base = createScenario({}, now)
  if (!raw || typeof raw !== 'object') return base
  const config = { ...base.config, ...(raw.config ?? {}) }
  if (!validDate(config.startDate)) config.startDate = base.config.startDate
  if (!HORIZONS.some((h) => h.value === config.horizon)) config.horizon = '1m'
  if (!validDate(config.customEnd)) config.customEnd = null
  if (!Array.isArray(config.accountBalances)) config.accountBalances = []
  if (config.balanceMode !== 'accounts') config.balanceMode = 'manual'
  const events = (Array.isArray(raw.events) ? raw.events : [])
    .map((e) => createEvent({
      ...e,
      repeat: REPEAT_VALUES.has(e?.repeat) ? e.repeat : 'once',
      enabled: e?.enabled !== false,
    }, now))
    .filter(isValidEvent)
  return {
    id: raw.id ?? null,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : base.name,
    config,
    events,
  }
}

const sourceKey = (source) => (source ? `${source.kind}:${source.id}` : null)

/**
 * Reducer del escenario en edición. Puro: el componente decide dónde guardar.
 */
export function scenarioReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.scenario
    case 'rename':
      return { ...state, name: action.name }
    case 'set_config':
      return { ...state, config: { ...state.config, ...action.patch } }
    case 'add_event':
      return { ...state, events: [...state.events, action.event] }
    case 'update_event':
      return { ...state, events: state.events.map((e) => (e.id === action.event.id ? action.event : e)) }
    case 'duplicate_event': {
      const idx = state.events.findIndex((e) => e.id === action.id)
      if (idx < 0) return state
      // La copia ya no representa el dato real del que vino: sin `source`.
      const copy = { ...state.events[idx], id: uid(), source: null }
      const events = [...state.events]
      events.splice(idx + 1, 0, copy)
      return { ...state, events }
    }
    case 'remove_event':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) }
    case 'restore_event': {
      // Deshacer: vuelve a su posición original si todavía existe ese índice.
      if (state.events.some((e) => e.id === action.event.id)) return state
      const events = [...state.events]
      events.splice(Math.min(action.index ?? events.length, events.length), 0, action.event)
      return { ...state, events }
    }
    case 'toggle_event':
      return { ...state, events: state.events.map((e) => (e.id === action.id ? { ...e, enabled: !e.enabled } : e)) }
    case 'import_events': {
      // Importar dos veces el mismo dato real no lo duplica.
      const existing = new Set(state.events.map((e) => sourceKey(e.source)).filter(Boolean))
      const fresh = action.events.filter((e) => !existing.has(sourceKey(e.source)))
      return { ...state, events: [...state.events, ...fresh] }
    }
    default:
      return state
  }
}

// Orden de presentación: por fecha y, el mismo día, como los procesa el motor.
export const TYPE_ORDER = { income: 0, transfer: 1, saving: 2, debt: 3, expense: 4 }
export function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
  })
}
