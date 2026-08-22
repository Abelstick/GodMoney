import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { Button }      from '@/components/ui/Button/Button'
import { Modal }       from '@/components/common/Modal/Modal'
import { EmptyState }  from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { AccountCard } from './components/AccountCard'
import { AccountForm } from './components/AccountForm'
import styles from './Accounts.module.css'

export function Accounts() {
  const { accounts, loading, addAccount, updateAccount, removeAccount } = useAccounts()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)

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
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nueva cuenta</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="💳"
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
            />
          ))}
        </div>
      )}

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
