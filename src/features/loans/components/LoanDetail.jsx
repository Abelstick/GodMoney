import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Input } from '@/components/ui/Input/Input'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  getEffectiveLoanStatus, getEffectiveInstallmentStatus, getLoanProgress, getNextInstallment,
  LOAN_STATUS_META, LOAN_TYPE, LOAN_TYPE_META,
} from '@/lib/loanStatus'
import { useLoans } from '@/hooks/useLoans'
import { InstallmentTable } from './InstallmentTable'
import { LoanPaymentForm } from './LoanPaymentForm'
import styles from './LoanDetail.module.css'

export function LoanDetail({ loan, isOpen, onClose }) {
  const { fetchLoanDetail, installmentsByLoan, paymentsByLoan, updateLoan, cancelLoan, registerLoanPayment } = useLoans()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payingLoading, setPayingLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (isOpen && loan) fetchLoanDetail(loan.id)
  }, [isOpen, loan?.id])

  const installments = installmentsByLoan[loan?.id] ?? []
  const payments = paymentsByLoan[loan?.id] ?? []

  const originalInterestTotal = useMemo(
    () => installments.reduce((acc, i) => acc + Number(i.interest_amount), 0),
    [installments]
  )

  if (!loan) return null

  const status = getEffectiveLoanStatus(loan)
  const statusMeta = LOAN_STATUS_META[status]
  const typeMeta = LOAN_TYPE_META[loan.type]
  const progress = getLoanProgress(loan)
  const canAct = status !== 'PAID' && status !== 'CANCELLED'
  const nextInstallment = canAct ? getNextInstallment(installments) : null
  const pendingInstallments = installments.filter((i) => getEffectiveInstallmentStatus(i) !== 'PAID')

  const principalPaid = Number(loan.principal_amount) - Number(loan.remaining_principal)
  const interestPaid = Math.max(originalInterestTotal - Number(loan.remaining_interest), 0)

  async function handlePayment(payload) {
    setPayingLoading(true)
    try {
      await registerLoanPayment(payload)
      setPaymentOpen(false)
    } finally {
      setPayingLoading(false)
    }
  }

  function startEdit() {
    setEditForm({
      person_name: loan.person_name,
      description: loan.description ?? '',
      notes: loan.notes ?? '',
    })
    setEditOpen(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditSaving(true)
    try {
      await updateLoan(loan.id, {
        person_name: editForm.person_name.trim(),
        description: editForm.description.trim() || null,
        notes: editForm.notes.trim() || null,
      })
      setEditOpen(false)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleCancelLoan() {
    setCancelling(true)
    try {
      await cancelLoan(loan.id)
      setCancelOpen(false)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`${typeMeta.label} — ${loan.person_name}`}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <Badge color={typeMeta.color}>{typeMeta.label}</Badge>
            <Badge color={statusMeta.color} withDot>{statusMeta.label}</Badge>
          </div>

          {loan.description && <p className={styles.description}>{loan.description}</p>}

          <ProgressBar
            percent={progress}
            color={loan.type === LOAN_TYPE.LENT ? 'var(--color-success)' : undefined}
            leftLabel={`${progress}% ${loan.type === LOAN_TYPE.LENT ? 'cobrado' : 'pagado'}`}
            rightLabel={`Vence ${formatDate(loan.due_date)}`}
          />

          <div className={styles.amountsGrid}>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Monto original</span>
              <span className={styles.amountValue}>{formatCurrency(loan.principal_amount)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Capital pagado</span>
              <span className={styles.amountValue}>{formatCurrency(principalPaid)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Capital pendiente</span>
              <span className={`${styles.amountValue} ${styles.emphasis}`}>{formatCurrency(loan.remaining_principal)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Intereses pagados</span>
              <span className={styles.amountValue}>{formatCurrency(interestPaid)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Intereses pendientes</span>
              <span className={styles.amountValue}>{formatCurrency(loan.remaining_interest)}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Próximo pago</span>
              <span className={styles.amountValue}>
                {nextInstallment
                  ? `${formatCurrency(nextInstallment.total_amount - nextInstallment.paid_amount)} · ${formatDate(nextInstallment.due_date)}`
                  : '—'}
              </span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Cuenta relacionada</span>
              <span className={styles.amountValue}>{loan.account?.name ?? '—'}</span>
            </div>
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>Fecha de inicio</span>
              <span className={styles.amountValue}>{formatDate(loan.start_date)}</span>
            </div>
          </div>

          {canAct && (
            <div className={styles.actions}>
              <Button onClick={() => setPaymentOpen(true)}>Registrar pago</Button>
              <Button variant="secondary" onClick={startEdit}>Editar</Button>
              <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancelar préstamo</Button>
            </div>
          )}

          {installments.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Cronograma de cuotas</h3>
              <InstallmentTable installments={installments} showStatus />
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Historial de pagos</h3>
            {payments.length === 0 ? (
              <p className={styles.emptyText}>Sin pagos registrados todavía</p>
            ) : (
              <div className={styles.paymentList}>
                {payments.map((p) => (
                  <div key={p.id} className={styles.paymentRow}>
                    <div className={styles.paymentDate}>{formatDate(p.payment_date)}</div>
                    <div className={styles.paymentAmounts}>
                      Capital {formatCurrency(p.principal_amount)} · Interés {formatCurrency(p.interest_amount)}
                    </div>
                    <div className={styles.paymentTotal}>{formatCurrency(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loan.notes && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Notas</h3>
              <p className={styles.emptyText}>{loan.notes}</p>
            </div>
          )}
        </div>
      </Modal>

      {paymentOpen && (
        <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Registrar pago">
          <LoanPaymentForm
            loan={loan}
            pendingInstallments={pendingInstallments}
            onSubmit={handlePayment}
            onCancel={() => setPaymentOpen(false)}
            loading={payingLoading}
          />
        </Modal>
      )}

      {editOpen && editForm && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar préstamo">
          <form className={styles.editForm} onSubmit={handleEditSubmit}>
            <p className={styles.emptyText}>
              El monto, la tasa, las cuotas y la cuenta no se pueden modificar porque ya generaron movimientos reales.
            </p>
            <Input label="Persona / entidad" value={editForm.person_name}
              onChange={(e) => setEditForm((f) => ({ ...f, person_name: e.target.value }))} required />
            <Input label="Descripción" value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Notas" value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className={styles.actions}>
              <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? 'Guardando…' : 'Actualizar'}</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelLoan}
        loading={cancelling}
        title="Cancelar préstamo"
        description={`¿Cancelar el préstamo con ${loan.person_name}? El saldo pendiente (${formatCurrency(Number(loan.remaining_principal) + Number(loan.remaining_interest))}) quedará en S/ 0 — ya no se contará como deuda ni en "Me deben"/"Yo debo". Esto NO revierte el saldo de la cuenta ni los pagos ya registrados, solo da por saldado lo que faltaba.`}
        confirmLabel="Cancelar préstamo"
      />
    </>
  )
}
