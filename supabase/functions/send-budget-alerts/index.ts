// Disparada cada pocas horas por Supabase Cron (ver migración
// 012_budget_alert_log.sql). Avisa por push y Telegram cuando un presupuesto
// llega al 80 % o al 100 % de su límite en el periodo vigente.
//
// Igual que send-payment-reminders: se despliega con --no-verify-jwt y la
// autorización real es el header x-cron-secret. Corre con service role, así que
// bypassa RLS a propósito para leer los datos de todos los usuarios.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const VAPID_KEYS_JSON = Deno.env.get('VAPID_KEYS_JSON')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

// La app es para Perú (UTC-5, sin horario de verano): los periodos se cortan en hora local.
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type Threshold = 80 | 100

interface BudgetRow {
  id: string
  user_id: string
  name: string
  amount: number
  period: 'monthly' | 'weekly' | 'yearly'
  budget_categories: { category_id: string }[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(amount)
}

const toCents = (v: number) => Math.round(Number(v) * 100)
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

// Rango [from, to] (YYYY-MM-DD) y clave única del periodo vigente de un presupuesto.
function currentPeriod(period: BudgetRow['period'], today: Date) {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  if (period === 'yearly') return { from: `${y}-01-01`, to: `${y}-12-31`, key: String(y) }
  if (period === 'weekly') {
    const monday = addDays(today, -((today.getUTCDay() + 6) % 7))
    return { from: isoDay(monday), to: isoDay(addDays(monday, 6)), key: `W:${isoDay(monday)}` }
  }
  const first = new Date(Date.UTC(y, m, 1))
  const last = new Date(Date.UTC(y, m + 1, 0))
  return { from: isoDay(first), to: isoDay(last), key: isoDay(first).slice(0, 7) }
}

// Umbral más alto alcanzado: 100 si gastó el límite o más, 80 si va por 80 % o más.
function crossedThreshold(spent: number, amount: number): Threshold | null {
  const limit = toCents(amount)
  if (limit <= 0) return null
  const used = toCents(spent)
  if (used >= limit) return 100
  if (used * 100 >= limit * 80) return 80
  return null
}

function buildMessage(budget: BudgetRow, threshold: Threshold, spent: number) {
  const limit = formatCurrency(budget.amount)
  if (threshold === 100) {
    const over = toCents(spent) - toCents(budget.amount)
    return over > 0
      ? `Presupuesto "${budget.name}" excedido: gastaste ${formatCurrency(spent)} de ${limit} (${formatCurrency(over / 100)} de más).`
      : `Presupuesto "${budget.name}" alcanzado: llegaste a tu límite de ${limit}.`
  }
  const left = formatCurrency((toCents(budget.amount) - toCents(spent)) / 100)
  return `Presupuesto "${budget.name}" al 80 %: llevas ${formatCurrency(spent)} de ${limit}, te quedan ${left}.`
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null
function getAppServer(): Promise<webpush.ApplicationServer> {
  if (!appServerPromise) {
    if (!VAPID_KEYS_JSON) throw new Error('Falta el secret VAPID_KEYS_JSON')
    appServerPromise = webpush.importVapidKeys(JSON.parse(VAPID_KEYS_JSON), { extractable: false })
      .then((vapidKeys) => webpush.ApplicationServer.new({ contactInformation: VAPID_SUBJECT, vapidKeys }))
  }
  return appServerPromise
}

async function sendTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch (err) {
    console.error('Error enviando Telegram', err)
  }
}

async function sendPush(sub: { id: string; endpoint: string; p256dh: string; auth: string }, title: string, body: string) {
  if (!VAPID_KEYS_JSON) return
  try {
    const appServer = await getAppServer()
    const subscriber = appServer.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
    await subscriber.pushTextMessage(JSON.stringify({ title, body, url: '/presupuestos' }), {})
  } catch (err) {
    // Suscripción caducada: se borra para no reintentar en vano.
    if (err instanceof webpush.PushMessageError && err.isGone()) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    } else {
      console.error('Error enviando push', sub.id, err)
    }
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('id, user_id, name, amount, period, budget_categories(category_id)')
  if (budgetsError) return new Response(budgetsError.message, { status: 500 })

  const withCategories = (budgets as BudgetRow[]).filter((b) => b.budget_categories.length > 0)
  if (!withCategories.length) return new Response('OK — sin presupuestos con categorías', { status: 200 })

  const today = new Date(Date.now() + LIMA_OFFSET_MS)
  const byUser = new Map<string, BudgetRow[]>()
  for (const b of withCategories) byUser.set(b.user_id, [...(byUser.get(b.user_id) ?? []), b])

  type Hit = { budget: BudgetRow; periodKey: string; threshold: Threshold; spent: number }
  const hits: Hit[] = []

  for (const [userId, userBudgets] of byUser) {
    const periods = userBudgets.map((b) => ({ budget: b, ...currentPeriod(b.period, today) }))
    const earliest = periods.reduce((min, p) => (p.from < min ? p.from : min), periods[0].from)
    const latest = periods.reduce((max, p) => (p.to > max ? p.to : max), periods[0].to)
    const categoryIds = [...new Set(userBudgets.flatMap((b) => b.budget_categories.map((c) => c.category_id)))]

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('category_id, amount, date')
      .eq('user_id', userId)
      .in('category_id', categoryIds)
      .gte('date', earliest)
      .lte('date', latest)
    if (error) {
      console.error('Error leyendo gastos', userId, error.message)
      continue
    }

    for (const p of periods) {
      const cats = new Set(p.budget.budget_categories.map((c) => c.category_id))
      const spent = expenses
        .filter((e) => cats.has(e.category_id) && e.date >= p.from && e.date <= p.to)
        .reduce((acc, e) => acc + Number(e.amount), 0)
      const threshold = crossedThreshold(spent, p.budget.amount)
      if (threshold) hits.push({ budget: p.budget, periodKey: p.key, threshold, spent })
    }
  }

  if (!hits.length) return new Response('OK — ningún presupuesto sobre el 80 %', { status: 200 })

  // Qué umbrales ya se avisaron en el periodo vigente.
  const { data: logged, error: loggedError } = await supabase
    .from('budget_alert_log')
    .select('budget_id, period_key, threshold')
    .in('budget_id', hits.map((h) => h.budget.id))
  if (loggedError) return new Response(loggedError.message, { status: 500 })
  const alreadySent = new Set(logged.map((l) => `${l.budget_id}|${l.period_key}|${l.threshold}`))

  const toNotify = hits.filter((h) => !alreadySent.has(`${h.budget.id}|${h.periodKey}|${h.threshold}`))
  if (!toNotify.length) return new Response('OK — nada nuevo que notificar', { status: 200 })

  const userIds = [...new Set(toNotify.map((h) => h.budget.user_id))]
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase.from('profiles').select('id, telegram_chat_id').in('id', userIds),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds),
  ])
  const chatIdByUser = new Map((profiles ?? []).map((p) => [p.id, p.telegram_chat_id]))
  const subsByUser = new Map<string, NonNullable<typeof subscriptions>>()
  for (const s of subscriptions ?? []) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])

  for (const hit of toNotify) {
    const { budget, threshold, spent, periodKey } = hit
    const message = buildMessage(budget, threshold, spent)

    // Se registra antes de enviar: si el envío falla a medias, es preferible
    // perder un aviso que repetirlo cada 3 horas. Si el insert choca (otra
    // ejecución simultánea), no se envía.
    const rows = threshold === 100
      ? [80, 100].map((t) => ({ budget_id: budget.id, user_id: budget.user_id, period_key: periodKey, threshold: t }))
      : [{ budget_id: budget.id, user_id: budget.user_id, period_key: periodKey, threshold }]
    const { error: logError } = await supabase
      .from('budget_alert_log')
      .upsert(rows, { onConflict: 'budget_id,period_key,threshold', ignoreDuplicates: true })
    if (logError) {
      console.error('Error registrando alerta', budget.id, logError.message)
      continue
    }

    const chatId = chatIdByUser.get(budget.user_id)
    if (chatId) await sendTelegram(chatId, `💰 GodMoney\n${message}`)
    for (const sub of subsByUser.get(budget.user_id) ?? []) {
      await sendPush(sub, threshold === 100 ? 'Presupuesto al límite' : 'Presupuesto al 80 %', message)
    }
  }

  return new Response(`OK — ${toNotify.length} alerta(s) notificada(s)`, { status: 200 })
})
