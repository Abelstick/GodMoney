import { supabase } from '@/lib/supabase'
import { buildInstallmentSchedule } from '@/lib/loanAmortization'

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user.id
}

export const loanService = {
  async getAll() {
    const { data, error } = await supabase
      .from('loans')
      .select('*, account:accounts(id,name,color,icon)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getInstallments(loanId) {
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true })
    if (error) throw error
    return data
  },

  // Todas las cuotas no pagadas del usuario, con datos del préstamo — usado
  // por el dashboard de préstamos para "próximos pagos" / "vencidos".
  async getPendingInstallments() {
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*, loan:loans(id,type,person_name,status)')
      .neq('status', 'PAID')
      .order('due_date', { ascending: true })
    if (error) throw error
    // Si un préstamo se liquidó con pagos libres (sin cuota asociada), sus
    // cuotas pueden quedar sin marcar como PAID aunque ya no quede saldo:
    // solo cuentan las cuotas de préstamos todavía ACTIVE.
    return data.filter((i) => i.loan?.status === 'ACTIVE')
  },

  async getPayments(loanId) {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(payload) {
    const installments = buildInstallmentSchedule({
      principal: payload.principal_amount,
      interestRate: payload.interest_rate,
      interestType: payload.interest_type,
      numberOfInstallments: payload.number_of_installments,
      startDate: payload.start_date,
      dueDate: payload.due_date,
    })

    const { data: loan, error } = await supabase.rpc('create_loan_with_installments', {
      p_type: payload.type,
      p_person_name: payload.person_name,
      p_description: payload.description || null,
      p_principal_amount: Number(payload.principal_amount),
      p_interest_rate: Number(payload.interest_rate) || 0,
      p_interest_type: payload.interest_type,
      p_start_date: payload.start_date,
      p_due_date: installments[installments.length - 1].due_date,
      p_number_of_installments: installments.length,
      p_account_id: payload.account_id,
      p_notes: payload.notes || null,
      p_installments: installments,
    })
    if (error) throw error

    const savedInstallments = await this.getInstallments(loan.id)
    return { loan, installments: savedInstallments }
  },

  // Solo metadata editable: la cuenta, el capital, la tasa y el número de
  // cuotas ya generaron movimientos reales y no se pueden alterar sin
  // corromper la contabilidad del préstamo.
  async update(id, payload) {
    const { data, error } = await supabase
      .from('loans')
      .update({
        person_name: payload.person_name,
        description: payload.description || null,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, account:accounts(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async cancel(id) {
    const { data, error } = await supabase
      .from('loans')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, account:accounts(id,name,color,icon)')
      .single()
    if (error) throw error
    return data
  },

  async registerPayment(payload) {
    const { data: payment, error } = await supabase.rpc('register_loan_payment', {
      p_loan_id: payload.loan_id,
      p_installment_id: payload.installment_id || null,
      p_account_id: payload.account_id,
      p_principal: Number(payload.principal_amount) || 0,
      p_interest: Number(payload.interest_amount) || 0,
      p_payment_date: payload.payment_date,
      p_notes: payload.notes || null,
    })
    if (error) throw error

    const [{ data: loan, error: loanError }, installments] = await Promise.all([
      supabase.from('loans').select('*, account:accounts(id,name,color,icon)').eq('id', payload.loan_id).single(),
      this.getInstallments(payload.loan_id),
    ])
    if (loanError) throw loanError

    return { payment, loan, installments }
  },
}
