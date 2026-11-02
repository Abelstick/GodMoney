import { supabase } from '@/lib/supabase'

const GIFT_SELECT = '*, person:gift_people(id,name), occasion:gift_occasions(id,name,kind)'
const OCCASION_SELECT = '*, person:gift_people(id,name)'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

const stamp = (payload) => ({ ...payload, updated_at: new Date().toISOString() })

export const giftService = {
  // ── Personas ──
  async getPeople() {
    const { data, error } = await supabase.from('gift_people').select('*').order('name')
    if (error) throw error
    return data
  },

  async createPerson(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase.from('gift_people').insert({ ...payload, user_id }).select().single()
    if (error) throw error
    return data
  },

  // Si cambia el cumpleaños, la ocasión de cumpleaños de esa persona lo sigue.
  async updatePerson(id, payload) {
    const { data, error } = await supabase.from('gift_people').update(stamp(payload)).eq('id', id).select().single()
    if (error) throw error
    if (data.birth_month && data.birth_day) {
      const { error: occError } = await supabase
        .from('gift_occasions')
        .update(stamp({ month: data.birth_month, day: data.birth_day }))
        .eq('person_id', id)
        .eq('kind', 'BIRTHDAY')
      if (occError) throw occError
    }
    return data
  },

  async removePerson(id) {
    const { error } = await supabase.from('gift_people').delete().eq('id', id)
    if (error) throw error
  },

  // ── Ocasiones ──
  async getOccasions() {
    const { data, error } = await supabase.from('gift_occasions').select(OCCASION_SELECT).order('month').order('day')
    if (error) throw error
    return data
  },

  async createOccasion(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase
      .from('gift_occasions').insert({ ...payload, user_id }).select(OCCASION_SELECT).single()
    if (error) throw error
    return data
  },

  async updateOccasion(id, payload) {
    const { data, error } = await supabase
      .from('gift_occasions').update(stamp(payload)).eq('id', id).select(OCCASION_SELECT).single()
    if (error) throw error
    return data
  },

  async removeOccasion(id) {
    const { error } = await supabase.from('gift_occasions').delete().eq('id', id)
    if (error) throw error
  },

  // ── Regalos ──
  async getGifts() {
    const { data, error } = await supabase.from('gifts').select(GIFT_SELECT).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async createGift(payload) {
    const user_id = await getUserId()
    const { data, error } = await supabase.from('gifts').insert({ ...payload, user_id }).select(GIFT_SELECT).single()
    if (error) throw error
    return data
  },

  async updateGift(id, payload) {
    const { data, error } = await supabase.from('gifts').update(stamp(payload)).eq('id', id).select(GIFT_SELECT).single()
    if (error) throw error
    return data
  },

  async removeGift(id) {
    const { error } = await supabase.from('gifts').delete().eq('id', id)
    if (error) throw error
  },
}
