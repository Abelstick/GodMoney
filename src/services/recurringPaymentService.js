import { supabase } from '@/lib/supabase'

export const recurringPaymentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('recurring_payments')
      .select('*, category:categories(id,name,color,icon)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Pagos de los últimos 12 meses de todos los pagos recurrentes del
  // usuario — suficiente para calcular "¿pagado este periodo?" sin traer
  // el ledger completo.
  async getRecentPayments() {
    const since = new Date()
    since.setMonth(since.getMonth() - 12)
    const { data, error } = await supabase
      .from('recurring_payment_payments')
      .select('*')
      .gte('period_date', since.toISOString().slice(0, 10))
      .order('period_date', { ascending: false })
    if (error) throw error
    return data
  },

  async getPayments(recurringPaymentId) {
    const { data, error } = await supabase
      .from('recurring_payment_payments')
      .select('*, expense:expenses(id,description,amount,date)')
      .eq('recurring_payment_id', recurringPaymentId)
      .order('period_date', { ascending: false })
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData.user.id
    const { data, error } = await supabase
      .from('recurring_payments')
      .insert({
        user_id,
        name: payload.name,
        description: payload.description || null,
        amount: payload.amount ?? null,
        category_id: payload.category_id || null,
        schedule_type: payload.schedule_type,
        due_day_of_month: payload.schedule_type === 'FIXED_DAY' ? Number(payload.due_day_of_month) : null,
        next_due_date: payload.schedule_type === 'MANUAL' ? payload.next_due_date : null,
        reminder_days_before: Number(payload.reminder_days_before) || 3,
      })
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('recurring_payments')
      .update({
        name: payload.name,
        description: payload.description || null,
        amount: payload.amount ?? null,
        category_id: payload.category_id || null,
        reminder_days_before: Number(payload.reminder_days_before) || 3,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async setActive(id, isActive) {
    const { data, error } = await supabase
      .from('recurring_payments')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('recurring_payments').delete().eq('id', id)
    if (error) throw error
  },

  async pay(payload) {
    const { data: payment, error } = await supabase.rpc('pay_recurring_payment', {
      p_recurring_payment_id: payload.recurring_payment_id,
      p_period_date: payload.period_date,
      p_amount: Number(payload.amount),
      p_expense_id: payload.expense_id || null,
      p_notes: payload.notes || null,
      p_next_due_date: payload.next_due_date || null,
    })
    if (error) throw error

    const { data: recurringPayment, error: rpError } = await supabase
      .from('recurring_payments')
      .select('*, category:categories(id,name,color,icon)')
      .eq('id', payload.recurring_payment_id)
      .single()
    if (rpError) throw rpError

    return { payment, recurringPayment }
  },
}
