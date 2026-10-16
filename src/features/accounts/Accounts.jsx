import { useState, useEffect } from 'react'
import { IconWallet, IconArrowsExchange } from '@tabler/icons-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useStore } from '@/store'
import { Card } from '@/components/ui/Card/Card'
import { Button }      from '@/components/ui/Button/Button'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { Skeleton }    from '@/components/common/Skeleton/Skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { AccountCard } from './components/AccountCard'
import { AccountForm } from './components/AccountForm'
import { TransferForm } from './components/TransferForm'
import { TransferList } from './components/TransferList'
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

  useEffect(() => { fetchTransfers() }, [fetchTransfers])

  async function handleTransfer(payload) {
    setTransferSaving(true)
    try {
      await addTransfer(payload)
      setTransferOpen(false)
    } finally {
      setTransferSaving(false)
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
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cuentas</h1>
          <p className={styles.subtitle}>Tus cuentas y billeteras — base para préstamos y deudas</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            disabled={accounts.filter((a) => !a.is_archived).length < 2}
            onClick={() => setTransferOpen(true)}
          >
            <IconArrowsExchange size={16} stroke={1.75} /> Transferir
          </Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nueva cuenta</Button>
        </div>
      </div>

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

      {transfers.length > 0 && (
        <section className={styles.transfers}>
          <h2 className={styles.sectionTitle}>Transferencias recientes</h2>
          <Card padded={false}>
            <TransferList transfers={transfers} onDelete={removeTransfer} />
          </Card>
        </section>
      )}

      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir entre cuentas">
        <TransferForm
          accounts={accounts}
          onSubmit={handleTransfer}
          onCancel={() => setTransferOpen(false)}
          loading={transferSaving}
        />
      </Modal>

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
