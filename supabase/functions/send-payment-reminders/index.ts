// Disparada a diario por Supabase Cron (pg_cron + pg_net, ver migración
// 006_recurring_payments.sql) — no por un usuario autenticado, así que se
// debe desplegar con `supabase functions deploy send-payment-reminders
// --no-verify-jwt` y la autorización real la hace el header x-cron-secret
// comprobado más abajo. Corre con SUPABASE_SERVICE_ROLE_KEY para poder leer
// y escribir datos de todos los usuarios (bypassa RLS a propósito).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'
import { currentPeriodDueDate, daysUntil, type RecurringPaymentRow } from '../_shared/recurringPaymentSchedule.ts'

interface ActiveRecurringPayment extends RecurringPaymentRow {
  user_id: string
  name: string
  amount: number | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const VAPID_KEYS_JSON = Deno.env.get('VAPID_KEYS_JSON')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(amount)
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
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
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function sendPush(subscriptionRow: { id: string; endpoint: string; p256dh: string; auth: string }, title: string, body: string) {
  if (!VAPID_KEYS_JSON) return
  const appServer = await getAppServer()
  const subscriber = appServer.subscribe({
    endpoint: subscriptionRow.endpoint,
    keys: { p256dh: subscriptionRow.p256dh, auth: subscriptionRow.auth },
  })
  try {
    await subscriber.pushTextMessage(JSON.stringify({ title, body, url: '/pagos-recurrentes' }), {})
  } catch (err) {
    // Suscripción caducada/inválida (navegador desinstalado, permiso
    // revocado, etc.) — se borra para no reintentar en vano cada día.
    if (err instanceof webpush.PushMessageError && err.isGone()) {
      await supabase.from('push_subscriptions').delete().eq('id', subscriptionRow.id)
    } else {
      console.error('Error enviando push', subscriptionRow.id, err)
    }
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('recurring_payments')
    .select('id, user_id, name, amount, schedule_type, due_day_of_month, next_due_date, reminder_days_before')
    .eq('is_active', true)
  if (paymentsError) return new Response(paymentsError.message, { status: 500 })
  if (!payments.length) return new Response('OK — sin pagos activos', { status: 200 })

  const { data: ledger, error: ledgerError } = await supabase
    .from('recurring_payment_payments')
    .select('recurring_payment_id, period_date')
    .in('recurring_payment_id', payments.map((p) => p.id))
  if (ledgerError) return new Response(ledgerError.message, { status: 500 })

  const isPeriodPaid = (payment: RecurringPaymentRow, due: string) =>
    ledger.some((l) => l.recurring_payment_id === payment.id && l.period_date === due)

  type DesiredAlert = { user_id: string; recurring_payment_id: string; period_date: string; type: 'DUE_SOON' | 'OVERDUE'; severity: string; message: string }
  const desired: DesiredAlert[] = []

  for (const payment of payments as ActiveRecurringPayment[]) {
    const due = currentPeriodDueDate(payment)
    if (isPeriodPaid(payment, due)) continue

    const days = daysUntil(due)
    const amountLabel = payment.amount ? ` de ${formatCurrency(payment.amount)}` : ''

    if (days < 0) {
      desired.push({
        user_id: payment.user_id, recurring_payment_id: payment.id, period_date: due,
        type: 'OVERDUE', severity: 'danger',
        message: `Pago atrasado: "${payment.name}"${amountLabel} venció el ${formatDate(due)} y sigue sin registrarse como pagado.`,
      })
    } else if (days <= payment.reminder_days_before) {
      desired.push({
        user_id: payment.user_id, recurring_payment_id: payment.id, period_date: due,
        type: 'DUE_SOON', severity: 'warning',
        message: `Pago próximo a vencer: "${payment.name}"${amountLabel} vence en ${days} día${days !== 1 ? 's' : ''} (${formatDate(due)}).`,
      })
    }
  }

  if (desired.length) {
    const { error } = await supabase
      .from('recurring_payment_alerts')
      .upsert(desired, { onConflict: 'recurring_payment_id,period_date,type', ignoreDuplicates: true })
    if (error) return new Response(error.message, { status: 500 })
  }

  // Alertas vigentes que aún no se notificaron hoy (nuevas, o vencidas desde
  // hace días pero cuyo último aviso fue en un día distinto a hoy).
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data: pending, error: pendingError } = await supabase
    .from('recurring_payment_alerts')
    .select('id, user_id, recurring_payment_id, message, notified_at')
    .in('recurring_payment_id', payments.map((p) => p.id))
    .or(`notified_at.is.null,notified_at.lt.${todayStr}`)
  if (pendingError) return new Response(pendingError.message, { status: 500 })
  if (!pending.length) return new Response('OK — nada nuevo que notificar', { status: 200 })

  const userIds = [...new Set(pending.map((a) => a.user_id))]
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase.from('profiles').select('id, telegram_chat_id').in('id', userIds),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds),
  ])
  const chatIdByUser = new Map((profiles ?? []).map((p) => [p.id, p.telegram_chat_id]))
  const subsByUser = new Map<string, typeof subscriptions>()
  for (const s of subscriptions ?? []) {
    subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])
  }

  for (const alert of pending) {
    const chatId = chatIdByUser.get(alert.user_id)
    if (chatId) await sendTelegram(chatId, `💰 GodMoney\n${alert.message}`)

    for (const sub of subsByUser.get(alert.user_id) ?? []) {
      await sendPush(sub, 'Pago recurrente', alert.message)
    }

    await supabase.from('recurring_payment_alerts').update({ notified_at: new Date().toISOString() }).eq('id', alert.id)
  }

  return new Response(`OK — ${pending.length} alerta(s) notificada(s)`, { status: 200 })
})
