import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { currentPeriodDueDate, isPeriodPaid, daysUntil } from '@/lib/recurringPaymentSchedule'

function buildDesiredAlerts(payments, ledger, userId) {
  const desired = []

  for (const payment of payments) {
    if (!payment.is_active) continue
    if (isPeriodPaid(payment, ledger)) continue

    const due = currentPeriodDueDate(payment)
    const days = daysUntil(due)
    const amountLabel = payment.amount ? ` de ${formatCurrency(payment.amount)}` : ''

    if (days < 0) {
      desired.push({
        user_id: userId, recurring_payment_id: payment.id, period_date: due,
        type: 'OVERDUE', severity: 'danger',
        message: `Pago atrasado: "${payment.name}"${amountLabel} venció el ${formatDate(due)} y sigue sin registrarse como pagado.`,
      })
    } else if (days <= payment.reminder_days_before) {
      desired.push({
        user_id: userId, recurring_payment_id: payment.id, period_date: due,
        type: 'DUE_SOON', severity: 'warning',
        message: `Pago próximo a vencer: "${payment.name}"${amountLabel} vence en ${days} día${days !== 1 ? 's' : ''} (${formatDate(due)}).`,
      })
    }
  }

  return desired
}

export const recurringPaymentAlertService = {
  async getAll() {
    const { data, error } = await supabase
      .from('recurring_payment_alerts')
      .select('*, recurring_payment:recurring_payments(id,name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async markRead(id) {
    const { error } = await supabase.from('recurring_payment_alerts').update({ is_read: true }).eq('id', id)
    if (error) throw error
  },

  async markAllRead() {
    const { error } = await supabase.from('recurring_payment_alerts').update({ is_read: true }).eq('is_read', false)
    if (error) throw error
  },

  /**
   * Red de seguridad client-side: recalcula qué alertas deberían existir
   * ahora mismo y sincroniza la tabla (idéntico patrón a
   * loanAlertService.sync). El envío real de push/Telegram lo hace la
   * Edge Function send-payment-reminders vía Supabase Cron, para que
   * funcione aunque el usuario no abra la app — esto solo mantiene la
   * lista in-app fresca cuando sí la abre.
   */
  async sync(payments, ledger) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const userId = session.user.id

    const desired = buildDesiredAlerts(payments, ledger, userId)

    if (desired.length) {
      const { error } = await supabase
        .from('recurring_payment_alerts')
        .upsert(desired, { onConflict: 'recurring_payment_id,period_date,type', ignoreDuplicates: true })
      if (error) throw error
    }

    const activeDueDates = new Map(
      payments.filter((p) => p.is_active && !isPeriodPaid(p, ledger))
        .map((p) => [p.id, currentPeriodDueDate(p)])
    )

    const { data: existing, error: fetchError } = await supabase
      .from('recurring_payment_alerts')
      .select('id, recurring_payment_id, period_date')
    if (fetchError) throw fetchError

    const staleIds = existing
      .filter((a) => activeDueDates.get(a.recurring_payment_id) !== a.period_date)
      .map((a) => a.id)

    if (staleIds.length) {
      const { error: deleteError } = await supabase.from('recurring_payment_alerts').delete().in('id', staleIds)
      if (deleteError) throw deleteError
    }
  },
}
