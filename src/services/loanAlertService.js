import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const DUE_SOON_DAYS = 3

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

function daysUntil(dateStr) {
  return differenceInCalendarDays(parseISO(dateStr), new Date())
}

function buildDesiredAlerts(loans, installments, userId) {
  const desired = []

  for (const loan of loans) {
    if (loan.status === 'CANCELLED') continue

    if (loan.status === 'ACTIVE') {
      const days = daysUntil(loan.due_date)
      if (days < 0) {
        desired.push({
          user_id: userId, loan_id: loan.id, installment_id: null,
          type: 'LOAN_OVERDUE', severity: 'danger',
          message: loan.type === 'BORROWED'
            ? `Pago atrasado: tienes una deuda de ${formatCurrency(loan.remaining_principal + loan.remaining_interest)} con ${loan.person_name} vencida desde el ${formatDate(loan.due_date)}.`
            : `Cobro atrasado: ${loan.person_name} te debe ${formatCurrency(loan.remaining_principal + loan.remaining_interest)} desde el ${formatDate(loan.due_date)}.`,
        })
      } else if (days <= DUE_SOON_DAYS) {
        desired.push({
          user_id: userId, loan_id: loan.id, installment_id: null,
          type: 'LOAN_DUE_SOON', severity: 'warning',
          message: loan.type === 'BORROWED'
            ? `Préstamo próximo a vencer: debes pagar ${formatCurrency(loan.remaining_principal + loan.remaining_interest)} a ${loan.person_name} en ${days} día${days !== 1 ? 's' : ''}.`
            : `Préstamo próximo a vencer: ${loan.person_name} debe pagarte ${formatCurrency(loan.remaining_principal + loan.remaining_interest)} en ${days} día${days !== 1 ? 's' : ''}.`,
        })
      }
    }
  }

  for (const inst of installments) {
    if (inst.status === 'PAID' || !inst.loan || inst.loan.status === 'CANCELLED') continue
    const days = daysUntil(inst.due_date)
    const pending = Number(inst.total_amount) - Number(inst.paid_amount)

    if (days < 0) {
      desired.push({
        user_id: userId, loan_id: inst.loan_id, installment_id: inst.id,
        type: 'INSTALLMENT_OVERDUE', severity: 'danger',
        message: `Cuota vencida: tienes una cuota de ${formatCurrency(pending)} de ${inst.loan.person_name} vencida hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}.`,
      })
    } else if (days <= DUE_SOON_DAYS) {
      desired.push({
        user_id: userId, loan_id: inst.loan_id, installment_id: inst.id,
        type: 'INSTALLMENT_DUE_SOON', severity: 'warning',
        message: `Cuota próxima a vencer: ${formatCurrency(pending)} de ${inst.loan.person_name} en ${days} día${days !== 1 ? 's' : ''}.`,
      })
    }
  }

  return desired
}

export const loanAlertService = {
  async getAll() {
    const { data, error } = await supabase
      .from('loan_alerts')
      .select('*, loan:loans(id,person_name,type)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async markRead(id) {
    const { error } = await supabase.from('loan_alerts').update({ is_read: true }).eq('id', id)
    if (error) throw error
  },

  async markAllRead() {
    const { error } = await supabase.from('loan_alerts').update({ is_read: true }).eq('is_read', false)
    if (error) throw error
  },

  async notifyLoanPaid(loan) {
    const userId = await getUserId()
    const message = `Préstamo liquidado: terminaste de ${loan.type === 'BORROWED' ? 'pagar' : 'cobrar'} ${formatCurrency(loan.principal_amount)} ${loan.type === 'BORROWED' ? 'a' : 'de'} ${loan.person_name}.`
    const { error } = await supabase
      .from('loan_alerts')
      .upsert(
        { user_id: userId, loan_id: loan.id, installment_id: null, type: 'LOAN_PAID', severity: 'success', message },
        { onConflict: 'loan_id,dedupe_key,type', ignoreDuplicates: true }
      )
    if (error) throw error
  },

  /**
   * Recalcula qué alertas de vencimiento deberían existir ahora mismo y
   * sincroniza la tabla: crea las que faltan (idempotente por unique index)
   * y borra las que ya no aplican (cuota pagada, préstamo cancelado, etc).
   * No hay cron en esta app: se ejecuta cada vez que se abre el módulo.
   */
  async sync(loans, installments) {
    const userId = await getUserId()
    const desired = buildDesiredAlerts(loans, installments, userId)

    if (desired.length) {
      const { error } = await supabase
        .from('loan_alerts')
        .upsert(desired, { onConflict: 'loan_id,installment_id,type', ignoreDuplicates: true })
      if (error) throw error
    }

    const activeLoanIds = new Set(loans.filter((l) => l.status === 'ACTIVE').map((l) => l.id))
    const pendingInstallmentIds = new Set(installments.filter((i) => i.status !== 'PAID').map((i) => i.id))

    const { data: existing, error: fetchError } = await supabase
      .from('loan_alerts')
      .select('id, loan_id, installment_id, type')
      .in('type', ['LOAN_DUE_SOON', 'LOAN_OVERDUE', 'INSTALLMENT_DUE_SOON', 'INSTALLMENT_OVERDUE'])
    if (fetchError) throw fetchError

    const staleIds = existing
      .filter((a) => {
        if (a.installment_id) return !pendingInstallmentIds.has(a.installment_id)
        return !activeLoanIds.has(a.loan_id)
      })
      .map((a) => a.id)

    if (staleIds.length) {
      const { error: deleteError } = await supabase.from('loan_alerts').delete().in('id', staleIds)
      if (deleteError) throw deleteError
    }
  },
}
