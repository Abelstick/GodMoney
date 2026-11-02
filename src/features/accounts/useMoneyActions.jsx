import { useState } from 'react'
import { useStore } from '@/store'
import { Modal } from '@/components/common/Modal/Modal'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { TransferForm } from './components/TransferForm'
import { RepayForm } from './components/RepayForm'

/** Lo que falta reponer a una cuenta de ahorro (suma de sus deudas abiertas). */
export function pendingFor(accountId, withdrawals) {
  return withdrawals
    .filter((w) => w.savings_account_id === accountId)
    .reduce((acc, w) => acc + pendingAmount(w), 0)
}

/**
 * Transferir / Saqué dinero / Reponer, con sus modales. Lo usan Cuentas y el
 * detalle de una cuenta. onChange se llama tras cada operación exitosa.
 *   const { openTransfer, openWithdraw, openRepay, modals } = useMoneyActions({ accounts })
 */
export function useMoneyActions({ accounts, onChange }) {
  const addTransfer          = useStore((s) => s.addTransfer)
  const addSavingsWithdrawal = useStore((s) => s.addSavingsWithdrawal)
  const repaySavings         = useStore((s) => s.repaySavings)
  const withdrawals          = useStore((s) => s.savingsWithdrawals)
  const showToast            = useStore((s) => s.showToast)

  const [transfer, setTransfer] = useState(null) // { preset } | null
  const [repayAccount, setRepayAccount] = useState(null)
  const [saving, setSaving] = useState(false)

  async function run(action, close) {
    setSaving(true)
    try {
      await action()
      close()
      onChange?.()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleTransfer(payload, { willRepay, target_date } = {}) {
    return run(async () => {
      const t = await addTransfer(payload)
      if (!willRepay) return
      try {
        await addSavingsWithdrawal({
          savings_account_id: t.from_account_id,
          transfer_id: t.id,
          origin: 'WITHDRAWAL',
          amount: t.amount,
          reason: payload.note,
          target_date,
        })
      } catch (err) {
        // La transferencia ya se hizo: no se pierde, solo se avisa.
        showToast(`La transferencia se guardó, pero no se pudo registrar la deuda: ${err.message}`, 'error')
      }
    }, () => setTransfer(null))
  }

  const preset = transfer?.preset
  const withdrawing = Boolean(preset?.willRepay)

  const modals = (
    <>
      <Modal isOpen={Boolean(transfer)} onClose={() => setTransfer(null)}
        title={withdrawing ? 'Saqué dinero de mi ahorro' : 'Transferir entre cuentas'}>
        {transfer && (
          <TransferForm
            accounts={accounts}
            preset={preset}
            onSubmit={handleTransfer}
            onCancel={() => setTransfer(null)}
            loading={saving}
          />
        )}
      </Modal>

      <Modal isOpen={Boolean(repayAccount)} onClose={() => setRepayAccount(null)}
        title={repayAccount ? `Reponer a ${repayAccount.name}` : 'Reponer'}>
        {repayAccount && (
          <RepayForm
            savingsAccount={repayAccount}
            accounts={accounts}
            pending={pendingFor(repayAccount.id, withdrawals)}
            onSubmit={(payload) => run(() => repaySavings(payload), () => setRepayAccount(null))}
            onCancel={() => setRepayAccount(null)}
            loading={saving}
          />
        )}
      </Modal>
    </>
  )

  return {
    openTransfer: () => setTransfer({ preset: null }),
    openWithdraw: (account) => setTransfer({ preset: { from_account_id: account.id, willRepay: true } }),
    openRepay: (account) => setRepayAccount(account),
    modals,
  }
}
