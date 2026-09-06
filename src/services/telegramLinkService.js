import { supabase } from '@/lib/supabase'

const TOKEN_TTL_MINUTES = 10

export const telegramLinkService = {
  async getStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return { linked: !!data.telegram_chat_id }
  },

  /** Genera un token de un solo uso y arma el link t.me/<bot>?start=<token>. */
  async createLinkUrl() {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
    if (!botUsername) throw new Error('Falta configurar VITE_TELEGRAM_BOT_USERNAME')

    const { data: { user } } = await supabase.auth.getUser()
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('telegram_link_tokens')
      .insert({ token, user_id: user.id, expires_at: expiresAt })
    if (error) throw error

    return `https://t.me/${botUsername}?start=${token}`
  },

  async unlink() {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', user.id)
    if (error) throw error
  },
}
