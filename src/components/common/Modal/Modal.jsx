import { Modal as MModal } from '@mantine/core'

// Diálogo de la app: el aspecto (radio, sombra, transición, bottom sheet en
// móvil, foco atrapado y cierre con Escape) viene del theme y de global.css.
export function Modal({ isOpen, onClose, title, size, children }) {
  return (
    <MModal opened={isOpen} onClose={onClose} title={title} size={size}>
      {children}
    </MModal>
  )
}
