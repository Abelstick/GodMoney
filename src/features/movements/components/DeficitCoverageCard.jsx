import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { transferService } from '@/services/transferService'
import { loanService } from '@/services/loanService'
import { savingsWithdrawalService } from '@/services/savingsWithdrawalService'
import { buildDeficitCoverage, periodLabelFor } from '@/lib/deficitCoverage'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { useStore } from '@/store'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { WithdrawalForm } from '@/features/accounts/components/WithdrawalForm'
import styles from './DeficitCoverageCard.module.css'

/**
 * Si el periodo cerró en negativo (ingresos < consumo), muestra con qué se
 * cubrió y ofrece registrarlo como deuda con el ahorro.
 * deficit: summarize(movimientos SIN filtrar).deficit
 */
export function DeficitCoverageCard({ deficit, range, movements = [] }) {
  const accounts      = useStore((s) => s.accounts)
  const fetchAccounts = useStore((s) => s.fetchAccounts)
  const addSavingsWithdrawal = useStore((s) => s.addSavingsWithdrawal)
  const showToast     = useStore((s) => s.showToast)

  const [data, setData] = useState(null) // { transfers, loans, debts }
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accounts.length) fetchAccounts()
  }, [])

  useEffect(() => {
    if (deficit <= 0) return
    let alive = true
    setData(null)
    Promise.all([
      transferService.getRange(range.from, range.to),
      loanService.getAll(),
      savingsWithdrawalService.getAll(),
    ])
      .then(([transfers, loans, debts]) => { if (alive) setData({ transfers, loans, debts }) })
      // Sin estos datos la tarjeta solo muestra el déficit.
      .catch(() => { if (alive) setData({ transfers: [], loans: [], debts: [] }) })
    return () => { alive = false }
  }, [deficit > 0, range.from, range.to])

  const period = periodLabelFor(range, formatDate)
  const coverage = useMemo(
    () => data && buildDeficitCoverage({
      deficit, range, accounts, transfers: data.transfers, loans: data.loans,
      expenses: movements.filter((m) => m.kind === 'expense'),
    }),
    [data, deficit, range, accounts, movements],
  )
  // Lo que ya está anotado como deuda para este periodo: deudas de déficit con
  // la misma etiqueta + retiros y gastos del periodo que ya generaron su deuda.
  const registered = useMemo(() => {
    if (!data) return 0
    const transferIds = new Set(data.transfers.map((t) => t.id))
    const expenseIds = new Set(movements.filter((m) => m.kind === 'expense').map((m) => m.id))
    return data.debts
      .filter((d) => (d.origin === 'DEFICIT' && d.period_label === period)
        || (d.transfer_id && transferIds.has(d.transfer_id))
        || (d.expense_id && expenseIds.has(d.expense_id)))
      .reduce((acc, d) => acc + Number(d.amount), 0)
  }, [data, period, movements])

  if (deficit <= 0) return null

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      const debt = await addSavingsWithdrawal(payload)
      setData((d) => ({ ...d, debts: [debt, ...d.debts] }))
      setOpen(false)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const rows = coverage ? [
    ...coverage.savingsByAccount.map((r) => ({ key: r.id, label: `Sacado de ${r.name}`, amount: r.amount })),
    coverage.fromLoans > 0 && { key: 'loans', label: 'Préstamos recibidos', amount: coverage.fromLoans },
    coverage.unexplained > 0 && {
      key: 'unexplained', label: 'Sin explicar', amount: coverage.unexplained,
      hint: 'Dinero que salió de algún lado y no está registrado (ahorro sacado sin transferencia, gastos con tarjeta de crédito…)',
    },
  ].filter(Boolean) : []

  const suggested = coverage ? Math.max(0, coverage.suggestedDebt - registered) : 0

  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <span className={styles.icon}><IconAlertTriangle size={18} stroke={1.75} /></span>
        <div>
          <h2 className={styles.title}>
            Este periodo {range.to < toInputDate(new Date()) ? 'cerró con' : 'va en'}{' '}
            <strong>−{formatCurrency(deficit)}</strong>
          </h2>
          <p className={styles.sub}>Gastaste más de lo que ganaste (sin contar lo que apartaste a ahorro).</p>
        </div>
      </div>

      {!coverage ? (
        <p className={styles.sub}>Calculando cómo lo cubriste…</p>
      ) : (
        <>
          <p className={styles.label}>Lo cubriste con:</p>
          <ul className={styles.rows}>
            {rows.map((r) => (
              <li key={r.key} className={r.key === 'unexplained' ? styles.muted : undefined}>
                <span className={styles.amount}>{formatCurrency(r.amount)}</span>
                <span>
                  {r.label}
                  {r.hint && <small className={styles.hint}>{r.hint}</small>}
                </span>
              </li>
            ))}
          </ul>
          {!accounts.some((a) => a.is_savings) && (
            <p className={styles.hint}>Marca tus cuentas de ahorro en Cuentas → Editar para identificar los retiros.</p>
          )}

          <div className={styles.footer}>
            {registered > 0 && (
              <span className={styles.done}>
                Ya tienes {formatCurrency(registered)} de este periodo anotado como deuda con tu ahorro.
              </span>
            )}
            {suggested > 0 && (
              <Button size="sm" onClick={() => setOpen(true)}>
                Convertir en deuda con mi ahorro
              </Button>
            )}
          </div>
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Registrar deuda con tu ahorro">
        <WithdrawalForm
          accounts={accounts}
          initial={{
            origin: 'DEFICIT',
            period_label: period,
            amount: suggested ? String(Math.round(suggested * 100) / 100) : '',
            savings_account_id: coverage?.savingsByAccount[0]?.id
              ?? accounts.find((a) => a.is_savings && !a.is_archived)?.id
              ?? accounts.find((a) => !a.is_archived)?.id ?? '',
          }}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          loading={saving}
        />
      </Modal>
    </Card>
  )
}
