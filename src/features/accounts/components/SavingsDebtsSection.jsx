import { useState } from 'react'
import { IconPigMoney } from '@tabler/icons-react'
import { useStore } from '@/store'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { formatCurrency } from '@/lib/formatters'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { WithdrawalForm } from './WithdrawalForm'
import { WithdrawalList } from './WithdrawalList'
import styles from './SavingsDebtsSection.module.css'

/**
 * Lista de deudas con el ahorro + registrar / cerrar / reabrir / eliminar.
 * - withdrawals: las deudas a mostrar (todas o las de una cuenta)
 * - onRepay(account): abre el formulario de reposición de esa cuenta de ahorro
 * - savingsAccountId: si se indica, el formulario de registro arranca con esa cuenta
 */
export function SavingsDebtsSection({ accounts, withdrawals, onRepay, savingsAccountId = null, title = 'Deudas con tu ahorro' }) {
  const addSavingsWithdrawal     = useStore((s) => s.addSavingsWithdrawal)
  const forgiveSavingsWithdrawal = useStore((s) => s.forgiveSavingsWithdrawal)
  const reopenSavingsWithdrawal  = useStore((s) => s.reopenSavingsWithdrawal)
  const removeSavingsWithdrawal  = useStore((s) => s.removeSavingsWithdrawal)
  const showToast                = useStore((s) => s.showToast)

  const [registerOpen, setRegisterOpen] = useState(false)
  const [forgiving, setForgiving] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const totalPending = withdrawals.reduce((acc, w) => acc + pendingAmount(w), 0)

  async function run(action, done) {
    setBusy(true)
    try {
      await action()
      done()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function repay(w) {
    const account = accounts.find((a) => a.id === w.savings_account_id)
    if (account) onRepay(account)
  }

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.hint}>
            {totalPending > 0
              ? <>Le debes <strong>{formatCurrency(totalPending)}</strong> a tu ahorro</>
              : 'Dinero que sacaste del ahorro y quieres reponer'}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setRegisterOpen(true)}>
          + Retiro anterior
        </Button>
      </div>

      {withdrawals.length > 0 ? (
        <Card padded={false}>
          <WithdrawalList
            withdrawals={withdrawals}
            onRepay={repay}
            onForgive={setForgiving}
            onReopen={(w) => run(() => reopenSavingsWithdrawal(w.id), () => {})}
            onDelete={setRemoving}
          />
        </Card>
      ) : (
        <EmptyState
          icon={<IconPigMoney size={40} stroke={1.5} />}
          title="Sin deudas con tu ahorro"
          description="Cuando pagues un gasto «desde» tu cuenta de ahorro o uses «Saqué dinero», aparecerá aquí para que lo repongas por partes."
        />
      )}

      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Registrar un retiro anterior">
        {registerOpen && (
          <WithdrawalForm
            accounts={accounts}
            initial={savingsAccountId ? { savings_account_id: savingsAccountId, origin: 'MANUAL' } : undefined}
            onSubmit={(payload) => run(() => addSavingsWithdrawal(payload), () => setRegisterOpen(false))}
            onCancel={() => setRegisterOpen(false)}
            loading={busy}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!forgiving}
        onClose={() => setForgiving(null)}
        onConfirm={() => run(() => forgiveSavingsWithdrawal(forgiving.id), () => setForgiving(null))}
        loading={busy}
        title="Ya no lo repongo"
        description={forgiving
          ? `Se cerrará esta deuda sin reponer los ${formatCurrency(pendingAmount(forgiving))} que faltan. Lo ya repuesto se mantiene y podrás reabrirla después.`
          : ''}
      />

      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => run(() => removeSavingsWithdrawal(removing.id), () => setRemoving(null))}
        loading={busy}
        title="Eliminar deuda"
        description={removing?.origin === 'EXPENSE'
          ? 'Se borra solo el registro de la deuda; el gasto y los saldos no cambian. Si vuelves a editar ese gasto, la deuda se creará de nuevo: para evitarlo, desmarca «Lo voy a reponer» en el gasto.'
          : 'Se borra el registro de la deuda. Las transferencias (el retiro y las reposiciones) y los saldos no cambian.'}
      />
    </section>
  )
}
