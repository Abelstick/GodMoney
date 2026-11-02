import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconWallet, IconArrowsExchange } from '@tabler/icons-react'
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
import { TransferList } from './components/TransferList'
import { SavingsDebtsSection } from './components/SavingsDebtsSection'
import { useMoneyActions, pendingFor } from './useMoneyActions'
import styles from './Accounts.module.css'

export function Accounts() {
  const navigate = useNavigate()
  const { accounts, loading, addAccount, updateAccount, removeAccount, adjustAccountBalance } = useAccounts()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)

  const transfers               = useStore((s) => s.transfers)
  const fetchTransfers          = useStore((s) => s.fetchTransfers)
  const removeTransfer          = useStore((s) => s.removeTransfer)
  const withdrawals             = useStore((s) => s.savingsWithdrawals)
  const fetchSavingsWithdrawals = useStore((s) => s.fetchSavingsWithdrawals)

  useEffect(() => { fetchTransfers() }, [fetchTransfers])
  useEffect(() => { fetchSavingsWithdrawals() }, [fetchSavingsWithdrawals])

  const { openTransfer, openWithdraw, openRepay, modals } = useMoneyActions({ accounts })
  const activeCount = accounts.filter((a) => !a.is_archived).length
  const hasSavingsAccount = accounts.some((a) => a.is_savings)

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
        subtitle="Tus cuentas y billeteras: toca una para ver su detalle"
        actions={
          <>
            <Button variant="secondary" disabled={activeCount < 2} onClick={openTransfer}>
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
              pendingDebt={account.is_savings ? pendingFor(account.id, withdrawals) : 0}
              canMove={activeCount >= 2}
              onOpen={() => navigate(`/cuentas/${account.id}`)}
              onWithdraw={() => openWithdraw(account)}
              onRepay={() => openRepay(account)}
              onEdit={(a) => { setEditing(a); setModalOpen(true) }}
              onDelete={(id) => setDeletingId(id)}
              onAdjustBalance={adjustAccountBalance}
            />
          ))}
        </div>
      )}

      {accounts.length > 0 && (hasSavingsAccount || withdrawals.length > 0) && (
        <div className={styles.transfers}>
          <SavingsDebtsSection accounts={accounts} withdrawals={withdrawals} onRepay={openRepay} />
        </div>
      )}

      {accounts.length > 0 && !hasSavingsAccount && (
        <p className={styles.tip}>
          Tip: marca tu cuenta de ahorro en <strong>Editar → «Es una cuenta de ahorro»</strong> para llevar
          la cuenta de lo que sacas de ella y reponerlo por partes.
        </p>
      )}

      {transfers.length > 0 && (
        <section className={styles.transfers}>
          <h2 className={styles.sectionTitle}>Transferencias recientes</h2>
          <Card padded={false}>
            <TransferList transfers={transfers} onDelete={removeTransfer} />
          </Card>
        </section>
      )}

      {modals}

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
