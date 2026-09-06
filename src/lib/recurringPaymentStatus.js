import { currentPeriodDueDate, isPeriodPaid, daysUntil } from './recurringPaymentSchedule'

export const RECURRING_STATUS = {
  PAUSED:     'PAUSED',
  UP_TO_DATE: 'UP_TO_DATE',
  DUE_SOON:   'DUE_SOON',
  OVERDUE:    'OVERDUE',
}

export const RECURRING_STATUS_META = {
  [RECURRING_STATUS.PAUSED]:     { label: 'Pausado',        color: 'var(--color-text-muted)' },
  [RECURRING_STATUS.UP_TO_DATE]: { label: 'Al día',         color: 'var(--color-success)'    },
  [RECURRING_STATUS.DUE_SOON]:   { label: 'Próximo a vencer', color: 'var(--color-warning)'  },
  [RECURRING_STATUS.OVERDUE]:    { label: 'Vencido',        color: 'var(--color-danger)'     },
}

/**
 * Igual que getEffectiveLoanStatus: se calcula en el momento a partir de
 * la fecha de vencimiento vigente y el ledger de pagos, sin depender de
 * que un cron haya corrido recientemente.
 */
export function getEffectiveRecurringStatus(payment, ledger) {
  if (!payment.is_active) return RECURRING_STATUS.PAUSED
  if (isPeriodPaid(payment, ledger)) return RECURRING_STATUS.UP_TO_DATE

  const days = daysUntil(currentPeriodDueDate(payment))
  if (days < 0) return RECURRING_STATUS.OVERDUE
  if (days <= payment.reminder_days_before) return RECURRING_STATUS.DUE_SOON
  return RECURRING_STATUS.UP_TO_DATE
}
