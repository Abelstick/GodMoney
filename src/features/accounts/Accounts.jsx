import { useState, useEffect } from 'react'
import { IconWallet, IconArrowsExchange, IconPigMoney } from '@tabler/icons-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useStore } from '@/store'
import { Card } from '@/components/ui/Card/Card'
import { Button }      from '@/components/ui/Button/Button'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { Skeleton }    from '@/components/common/Skeleton/Skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { AccountCard } from './components/AccountCard'
import { AccountForm } from './components/AccountForm'
import { TransferForm } from './components/TransferForm'
import { TransferList } from './components/TransferList'
import { WithdrawalForm } from './components/WithdrawalForm'
import { WithdrawalList } from './components/WithdrawalList'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { formatCurrency } from '@/lib/formatters'
import styles from './Accounts.module.css'

export function Accounts() {
  const { accounts, loading, addAccount, updateAccount, removeAccount, adjustAccountBalance } = useAccounts()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)

  const transfers       = useStore((s) => s.transfers)
  const fetchTransfers  = useStore((s) => s.fetchTransfers)
  const addTransfer     = useStore((s) => s.addTransfer)
  const removeTransfer  = useStore((s) => s.removeTransfer)
  const [transferOpen,   setTransferOpen]   = useState(false)
  const [transferSaving, setTransferSaving] = useState(false)

  const withdrawals              = useStore((s) => s.savingsWithdrawals)
  const fetchSavingsWithdrawals  = useStore((s) => s.fetchSavingsWithdrawals)
  const addSavingsWithdrawal     = useStore((s) => s.addSavingsWithdrawal)
  const forgiveSavingsWithdrawal = useStore((s) => s.forgiveSavingsWithdrawal)
  const reopenSavingsWithdrawal  = useStore((s) => s.reopenSavingsWithdrawal)
  const removeSavingsWithdrawal  = useStore((s) => s.removeSavingsWithdrawal)
  const showToast                = useStore((s) => s.showToast)
  const [repaying,         setRepaying]         = useState(null)
  const [withdrawalOpen,   setWithdrawalOpen]   = useState(false)
  const [withdrawalSaving, setWithdrawalSaving] = useState(false)
  const [forgiving,        setForgiving]        = useState(null)
  const [removingDebt,     setRemovingDebt]     = useState(null)
  const [debtBusy,         setDebtBusy]         = useState(false)

  useEffect(() => { fetchTransfers() }, [fetchTransfers])
  useEffect(() => { fetchSavingsWithdrawals() }, [fetchSavingsWithdrawals])

  const totalPending = withdrawals.reduce((acc, w) => acc + pendingAmount(w), 0)
  const activeCount  = accounts.filter((a) => !a.is_archived).length

  function closeTransfer() {
    setTransferOpen(false)
    setRepaying(null)
  }

  async function handleTransfer(payload, { willRepay, target_date } = {}) {
    setTransferSaving(true)
    try {
      const transfer = await addTransfer(repaying ? { ...payload, repays_withdrawal_id: repaying.id } : payload)
      if (willRepay) {
        try {
          await addSavingsWithdrawal({
            savings_account_id: transfer.from_account_id,
            transfer_id: transfer.id,
            origin: 'WITHDRAWAL',
            amount: transfer.amount,
            reason: payload.note,
            target_date,
          })
        } catch (err) {
          // La transferencia ya se hizo: no se pierde, solo se avisa.
          showToast(`La transferencia se guardó, pero no se pudo registrar la deuda: ${err.message}`, 'error')
        }
      }
      closeTransfer()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setTransferSaving(false)
    }
  }

  async function handleWithdrawal(payload) {
    setWithdrawalSaving(true)
    try {
      await addSavingsWithdrawal(payload)
      setWithdrawalOpen(false)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setWithdrawalSaving(false)
    }
  }

  async function runDebtAction(action, done) {
    setDebtBusy(true)
    try {
      await action()
      done()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDebtBusy(false)
    }
  }

  const deletingAccount = accounts.find((a) => a.id === deletingId)

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateAccount(editing.id, payload)
      else         await addAccount(payload)
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await removeAccount(deletingId)
      setDeletingId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Cuentas"
        subtitle="Tus cuentas y billeteras — base para préstamos y deudas"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={activeCount < 2}
              onClick={() => { setRepaying(null); setTransferOpen(true) }}
            >
              <IconArrowsExchange size={16} stroke={1.75} /> Transferir
            </Button>
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nueva cuenta</Button>
          </>
        }
      />

      {loading ? (
        <div className={styles.grid}>
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<IconWallet size={44} stroke={1.5} />}
          title="Sin cuentas"
          description="Crea al menos una cuenta para poder registrar préstamos y deudas"
          action={<Button onClick={() => setModalOpen(true)}>Crear cuenta</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(a) => { setEditing(a); setModalOpen(true) }}
              onDelete={(id) => setDeletingId(id)}
              onAdjustBalance={adjustAccountBalance}
            />
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <section className={styles.transfers}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Deudas con tu ahorro</h2>
              <p className={styles.sectionHint}>
                {totalPending > 0
                  ? <>Le debes <strong>{formatCurrency(totalPending)}</strong> a tu ahorro</>
                  : 'Dinero que sacaste del ahorro y quieres reponer'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setWithdrawalOpen(true)}>
              + Registrar deuda
            </Button>
          </div>
          {withdrawals.length > 0 ? (
            <Card padded={false}>
              <WithdrawalList
                withdrawals={withdrawals}
                onRepay={(w) => { setRepaying(w); setTransferOpen(true) }}
                onForgive={setForgiving}
                onReopen={(w) => runDebtAction(() => reopenSavingsWithdrawal(w.id), () => {})}
                onDelete={setRemovingDebt}
              />
            </Card>
          ) : (
            <EmptyState
              icon={<IconPigMoney size={40} stroke={1.5} />}
              title="Sin deudas con tu ahorro"
              description="Al transferir desde una cuenta de ahorro marca «Lo voy a reponer», o registra aquí un déficit pasado."
            />
          )}
        </section>
      )}

      {transfers.length > 0 && (
        <section className={styles.transfers}>
          <h2 className={styles.sectionTitle}>Transferencias recientes</h2>
          <Card padded={false}>
            <TransferList transfers={transfers} onDelete={removeTransfer} />
          </Card>
        </section>
      )}

      <Modal isOpen={transferOpen} onClose={closeTransfer}
        title={repaying ? 'Reponer a tu ahorro' : 'Transferir entre cuentas'}>
        <TransferForm
          key={repaying?.id ?? 'new'}
          accounts={accounts}
          repaying={repaying}
          pending={repaying ? pendingAmount(repaying) : 0}
          onSubmit={handleTransfer}
          onCancel={closeTransfer}
          loading={transferSaving}
        />
      </Modal>

      <Modal isOpen={withdrawalOpen} onClose={() => setWithdrawalOpen(false)} title="Registrar deuda con tu ahorro">
        <WithdrawalForm
          accounts={accounts}
          onSubmit={handleWithdrawal}
          onCancel={() => setWithdrawalOpen(false)}
          loading={withdrawalSaving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!forgiving}
        onClose={() => setForgiving(null)}
        onConfirm={() => runDebtAction(() => forgiveSavingsWithdrawal(forgiving.id), () => setForgiving(null))}
        loading={debtBusy}
        title="Ya no lo repongo"
        description={forgiving
          ? `Se cerrará la deuda sin reponer los ${formatCurrency(pendingAmount(forgiving))} que faltan. Lo ya repuesto se mantiene y podrás reabrirla después.`
          : ''}
      />

      <ConfirmDialog
        isOpen={!!removingDebt}
        onClose={() => setRemovingDebt(null)}
        onConfirm={() => runDebtAction(() => removeSavingsWithdrawal(removingDebt.id), () => setRemovingDebt(null))}
        loading={debtBusy}
        title="Eliminar deuda"
        description="Se borra el registro de la deuda. Las transferencias (el retiro y las reposiciones) y los saldos no cambian."
      />

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar cuenta"
        description={
          deletingAccount
            ? `¿Eliminar la cuenta "${deletingAccount.name}"? Esta acción no se puede deshacer. No podrás eliminarla si tiene préstamos asociados.`
            : '¿Eliminar esta cuenta? Esta acción no se puede deshacer.'
        }
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <AccountForm
          initial={editing ? {
            name:    editing.name,
            balance: String(editing.balance),
            color:   editing.color,
            icon:    editing.icon,
            is_savings: Boolean(editing.is_savings),
          } : undefined}
          isEditing={!!editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
