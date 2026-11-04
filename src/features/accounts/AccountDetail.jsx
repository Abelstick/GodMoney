import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, subMonths, startOfMonth } from 'date-fns'
import { IconArrowLeft, IconArrowsExchange } from '@tabler/icons-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useStore } from '@/store'
import { accountActivityService } from '@/services/accountActivityService'
import { buildAccountActivity, activityTotals } from '@/lib/accountActivity'
import { formatCurrency, formatDate, formatMonth } from '@/lib/formatters'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { SavingsDebtsSection } from './components/SavingsDebtsSection'
import { useMoneyActions } from './useMoneyActions'
import styles from './AccountDetail.module.css'

const ymd = (d) => format(d, 'yyyy-MM-dd')
const MONTHS_STEP = 3

const TAGS = {
  'withdrawal':         { label: 'Por reponer', color: 'var(--color-warning)' },
  'expense-withdrawal': { label: 'Por reponer', color: 'var(--color-warning)' },
  'repayment':          { label: 'Reposición',  color: 'var(--color-success)' },
}

export function AccountDetail() {
  const { id } = useParams()
  const { accounts, loading: accountsLoading } = useAccounts()
  const withdrawals             = useStore((s) => s.savingsWithdrawals)
  const fetchSavingsWithdrawals = useStore((s) => s.fetchSavingsWithdrawals)
  const account = accounts.find((a) => a.id === id)

  const [months, setMonths] = useState(MONTHS_STEP)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(null)

  const today = useMemo(() => new Date(), [])
  const range = useMemo(() => ({
    from: ymd(startOfMonth(subMonths(today, months - 1))),
    to: ymd(today),
  }), [months, today])

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await accountActivityService.get(id, range.from, range.to)
      setActivity(buildAccountActivity(id, data))
    } catch (err) {
      setError(err.message)
    }
  }, [id, range.from, range.to])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchSavingsWithdrawals() }, [fetchSavingsWithdrawals])

  const { openTransfer, openWithdraw, openRepay, modals } = useMoneyActions({ accounts, onChange: load })

  const debts = useMemo(() => withdrawals.filter((w) => w.savings_account_id === id), [withdrawals, id])
  const openDebts = debts.filter((d) => d.status === 'OPEN')
  const owed    = openDebts.reduce((acc, d) => acc + Number(d.amount), 0)
  const repaid  = openDebts.reduce((acc, d) => acc + Math.min(Number(d.repaid_amount), Number(d.amount)), 0)
  const pending = owed - repaid
  const fromExpenses = openDebts
    .filter((d) => d.origin === 'EXPENSE')
    .reduce((acc, d) => acc + pendingAmount(d), 0)

  const thisMonth = format(today, 'yyyy-MM')
  const monthTotals = useMemo(() => activityTotals(activity ?? [], thisMonth), [activity, thisMonth])
  const canMove = accounts.filter((a) => !a.is_archived).length >= 2

  if (!account) {
    return accountsLoading || !accounts.length ? (
      <div className={styles.page}><Skeleton style={{ height: 180 }} /></div>
    ) : (
      <EmptyState title="Cuenta no encontrada" description="Puede que la hayas eliminado."
        action={<Button component={Link} to="/cuentas">Volver a Cuentas</Button>} />
    )
  }

  return (
    <div className={styles.page}>
      <Link to="/cuentas" className={styles.back}>
        <IconArrowLeft size={16} stroke={1.75} /> Cuentas
      </Link>

      {/* ── Saldo y deuda con el ahorro ── */}
      <Card className={styles.hero} style={{ '--account-color': account.color }}>
        <div className={styles.heroTop}>
          <h1 className={styles.name}>{account.name}</h1>
          {account.is_savings && <Badge color="var(--color-success)">Ahorro</Badge>}
        </div>
        <div className={styles.balanceLabel}>Saldo actual</div>
        <div className={`${styles.balance} ${Number(account.balance) < 0 ? styles.negative : ''}`}>
          {formatCurrency(account.balance)}
        </div>

        {(account.is_savings || openDebts.length > 0) && (
          <div className={styles.debtBox}>
            {pending > 0 ? (
              <>
                <div className={styles.debtLine}>
                  <span>Por reponer a esta cuenta</span>
                  <strong>{formatCurrency(pending)}</strong>
                </div>
                {(fromExpenses > 0 && pending - fromExpenses > 0.004) && (
                  <p className={styles.debtHint}>
                    {formatCurrency(fromExpenses)} de gastos pagados desde aquí
                    · {formatCurrency(pending - fromExpenses)} de retiros y otros registros
                  </p>
                )}
                <ProgressBar
                  percent={owed > 0 ? (repaid / owed) * 100 : 0}
                  size="sm"
                  leftLabel={`Repuesto ${formatCurrency(repaid)} de ${formatCurrency(owed)}`}
                  rightLabel={`${Math.round((repaid / owed) * 100)}%`}
                />
                <p className={styles.debtHint}>
                  Si lo repones todo, tendrías {formatCurrency(Number(account.balance) + pending)}.
                </p>
              </>
            ) : (
              <p className={styles.debtHint}>No tienes nada por reponer a esta cuenta. 🎉</p>
            )}
          </div>
        )}

        <div className={styles.heroActions}>
          {account.is_savings ? (
            <>
              <Button variant="secondary" disabled={!canMove} onClick={() => openWithdraw(account)}>Saqué dinero</Button>
              <Button variant="success" disabled={!canMove} onClick={() => openRepay(account)}>Reponer</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled={!canMove} onClick={openTransfer}>
                <IconArrowsExchange size={16} stroke={1.75} /> Transferir
              </Button>
              {pending > 0 && (
                <Button variant="success" disabled={!canMove} onClick={() => openRepay(account)}>Reponer</Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ── Este mes ── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Entró en {formatMonth(today)}</span>
          <strong className={styles.in}>+{formatCurrency(monthTotals.incoming)}</strong>
        </div>
        <div className={styles.stat}>
          <span>Salió en {formatMonth(today)}</span>
          <strong className={styles.out}>−{formatCurrency(monthTotals.outgoing)}</strong>
        </div>
      </div>

      {(account.is_savings || debts.length > 0) && (
        <SavingsDebtsSection
          accounts={accounts}
          withdrawals={debts}
          onRepay={openRepay}
          savingsAccountId={account.id}
          title="Por reponer a esta cuenta"
        />
      )}

      {/* ── Historial ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Movimientos de la cuenta</h2>
        {error ? (
          <p className={styles.error} role="alert">No pudimos cargar los movimientos: {error}</p>
        ) : !activity ? (
          <Skeleton style={{ height: 160 }} />
        ) : activity.length === 0 ? (
          <EmptyState
            title="Sin movimientos registrados"
            description="Aquí verás las transferencias y los gastos que registres «Pagado desde» esta cuenta."
          />
        ) : (
          <Card padded={false}>
            <ul className={styles.list}>
              {activity.map((r) => (
                <li key={r.id} className={styles.item}>
                  <div className={styles.info}>
                    <div className={styles.label}>{r.label}</div>
                    <div className={styles.meta}>
                      {formatDate(r.date)} · {r.detail}
                      {TAGS[r.tag] && <> · <Badge color={TAGS[r.tag].color}>{TAGS[r.tag].label}</Badge></>}
                    </div>
                  </div>
                  <span className={r.amount >= 0 ? styles.in : styles.out}>
                    {r.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(r.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {activity && (
          <div className={styles.more}>
            <span>Desde {formatDate(range.from)}</span>
            <Button size="sm" variant="ghost" onClick={() => setMonths((m) => m + MONTHS_STEP)}>
              Ver {MONTHS_STEP} meses más
            </Button>
          </div>
        )}
        <p className={styles.note}>
          Los movimientos de préstamos y los ajustes manuales de saldo cambian el saldo pero no aparecen en esta lista.
        </p>
      </section>

      {modals}
    </div>
  )
}
