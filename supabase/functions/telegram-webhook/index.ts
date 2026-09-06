// Webhook de Telegram: recibe cada mensaje enviado al bot. Solo procesamos
// "/start <token>" para vincular la cuenta (flujo iniciado desde
// Configuración → Telegram en la app). Se despliega con
// `supabase functions deploy telegram-webhook --no-verify-jwt` porque quien
// llama es Telegram, no un usuario autenticado de Supabase — la autorización
// real la da el secret_token que Telegram reenvía (configurado una sola vez
// al registrar el webhook con setWebhook).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function reply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

Deno.serve(async (req) => {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const update = await req.json().catch(() => null)
  const message = update?.message
  const chatId: number | undefined = message?.chat?.id
  const text: string | undefined = message?.text

  if (!chatId || !text?.startsWith('/start ')) {
    return new Response('OK', { status: 200 })
  }

  const token = text.slice('/start '.length).trim()

  const { data: linkToken } = await supabase
    .from('telegram_link_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!linkToken || linkToken.used_at || new Date(linkToken.expires_at) < new Date()) {
    await reply(chatId, '❌ Este link de vinculación no es válido o ya expiró. Genera uno nuevo desde Configuración en GodMoney.')
    return new Response('OK', { status: 200 })
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ telegram_chat_id: String(chatId) })
    .eq('id', linkToken.user_id)

  if (profileError) {
    // UNIQUE(telegram_chat_id): este chat ya estaba vinculado a otra cuenta.
    await reply(chatId, '❌ Este chat de Telegram ya está vinculado a otra cuenta de GodMoney.')
    return new Response('OK', { status: 200 })
  }

  await supabase.from('telegram_link_tokens').update({ used_at: new Date().toISOString() }).eq('id', linkToken.id)
  await reply(chatId, '✅ ¡Listo! Tu cuenta de GodMoney quedó vinculada. A partir de ahora recibirás aquí los avisos de tus pagos recurrentes.')

  return new Response('OK', { status: 200 })
})
