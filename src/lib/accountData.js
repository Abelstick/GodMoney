import { format } from 'date-fns'

// Qué entra en "Descargar mis datos". `order` da un orden estable para paginar.
const byId = ['id']
export const EXPORT_TABLES = {
  profiles: byId,
  accounts: byId,
  categories: byId,
  incomes: byId,
  expenses: byId,
  transfers: byId,
  savings_withdrawals: byId,
  budgets: byId,
  budget_categories: ['budget_id', 'category_id'],
  goals: byId,
  goal_account_links: byId,
  loans: byId,
  loan_installments: byId,
  loan_payments: byId,
  recurring_payments: byId,
  recurring_payment_payments: byId,
  recurring_transactions: byId,
  recurring_transaction_runs: ['template_id', 'period_date'],
  credit_scores: byId,
  gift_people: byId,
  gift_occasions: byId,
  gifts: byId,
  simulation_scenarios: byId,
}

// Tablas que no se exportan, a propósito. Un test exige que toda tabla nueva
// aparezca aquí o en EXPORT_TABLES, para que nadie la olvide.
export const NOT_EXPORTED_TABLES = {
  push_subscriptions: 'credenciales de este dispositivo',
  telegram_link_tokens: 'credenciales temporales',
  budget_alert_log: 'registro interno, sin acceso desde la app',
  loan_alerts: 'avisos que la app vuelve a generar',
  recurring_payment_alerts: 'avisos que la app vuelve a generar',
}

// Un archivo descargado se reenvía y se guarda en cualquier sitio: sin secretos.
const SECRET_PROFILE_FIELDS = ['gemini_api_key', 'telegram_chat_id']

export function buildAccountExport(user, data, now = new Date()) {
  const profiles = (data.profiles ?? []).map((profile) => {
    const clean = { ...profile }
    SECRET_PROFILE_FIELDS.forEach((field) => delete clean[field])
    return clean
  })
  return {
    app: 'GodMoney',
    formatVersion: 1,
    exportedAt: now.toISOString(),
    account: { id: user.id, email: user.email ?? null },
    data: { ...data, profiles },
  }
}

export const exportFilename = (now = new Date()) => `godmoney-datos-${format(now, 'yyyy-MM-dd')}.json`

const LOCAL_PREFIXES = ['godmoney.', 'godmoney:', 'gm.']

// Borra del dispositivo lo que la app guarda del usuario (borradores, cola sin
// conexión, caché de categorías). No toca el tema claro/oscuro ni otras webs.
export function clearLocalUserData(storage = globalThis.localStorage) {
  if (!storage) return
  const keys = []
  for (let i = 0; i < storage.length; i++) keys.push(storage.key(i))
  keys
    .filter((key) => LOCAL_PREFIXES.some((prefix) => key?.startsWith(prefix)))
    .forEach((key) => storage.removeItem(key))
}
