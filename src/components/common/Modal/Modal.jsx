import { Modal as MModal } from '@mantine/core'

export function Modal({ isOpen, onClose, title, children }) {
  return (
    <MModal
      opened={isOpen}
      onClose={onClose}
      title={title}
      centered
      styles={{
        content: {
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        },
        header: {
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        },
        title: {
          color: 'var(--color-text-primary)',
          fontWeight: 600,
          fontSize: 'var(--text-lg)',
        },
      }}
    >
      {children}
    </MModal>
  )
}
