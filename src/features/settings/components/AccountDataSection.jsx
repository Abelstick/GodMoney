import { useState } from 'react'
import { IconAlertTriangle, IconDatabase, IconDownload, IconTrash } from '@tabler/icons-react'
import { useAuth } from '@/features/auth/AuthContext'
import { accountDataService } from '@/services/accountDataService'
import { buildAccountExport, exportFilename } from '@/lib/accountData'
import { humanizeError } from '@/lib/errorMessages'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Modal } from '@/components/common/Modal/Modal'
import styles from '../Settings.module.css'

const CONFIRM_WORD = 'ELIMINAR'

function downloadJson(content, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function AccountDataSection() {
  const { user, deleteAccount } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    setExported(false)
    try {
      const data = await accountDataService.fetchAll()
      downloadJson(buildAccountExport(user, data), exportFilename())
      setExported(true)
    } catch (err) {
      setExportError(humanizeError(err.message))
    } finally {
      setExporting(false)
    }
  }

  function closeDialog() {
    if (deleting) return
    setDialogOpen(false)
    setConfirmText('')
    setDeleteError(null)
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (confirmText.trim() !== CONFIRM_WORD || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount() // al terminar, la app se recarga en la pantalla de acceso
    } catch (err) {
      setDeleteError(humanizeError(err.message))
      setDeleting(false)
    }
  }

  return (
    <Card className={styles.section}>
      <Card.Header>
        <Card.Title>
          <span className={styles.titleIcon}><IconDatabase size={18} stroke={1.75} /></span>
          Tus datos
        </Card.Title>
      </Card.Header>

      <div className={styles.body}>
        <p className={styles.desc}>
          Descarga una copia de todo lo que tienes en GodMoney, en un archivo JSON. Es una copia para
          guardar: por ahora la app no permite volver a importarla. No incluye tu clave de Gemini ni
          tus adjuntos, que siguen en tu Google Drive.
        </p>
        <div>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            <IconDownload size={16} stroke={1.75} /> {exporting ? 'Preparando…' : 'Descargar mis datos'}
          </Button>
        </div>
        {exported && <p className={styles.keyStatus} role="status">Copia descargada</p>}
        {exportError && <p className={styles.error} role="alert">{exportError}</p>}

        <div className={styles.dangerZone}>
          <p className={styles.desc}>
            Eliminar tu cuenta borra para siempre tu usuario y todos tus datos. No se puede deshacer.
          </p>
          <div>
            <Button variant="danger" onClick={() => setDialogOpen(true)}>
              <IconTrash size={16} stroke={1.75} /> Eliminar mi cuenta
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={dialogOpen} onClose={closeDialog} title="Eliminar tu cuenta">
        <form className={styles.deleteForm} onSubmit={handleDelete}>
          <p className={styles.hint}>
            <IconAlertTriangle size={16} stroke={1.75} className={styles.hintIcon} />
            <span>
              Se borrarán para siempre tus movimientos, cuentas, presupuestos, objetivos, préstamos,
              regalos y escenarios. <strong>Nadie podrá recuperarlos.</strong>
            </span>
          </p>
          <p className={styles.desc}>
            Tus adjuntos no se borran: siguen en tu Google Drive. Si quieres una copia de tus datos,
            descárgala antes de continuar.
          </p>
          <Input
            label={`Escribe ${CONFIRM_WORD} para confirmar`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            data-autofocus
          />
          {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
          <div className={styles.deleteActions}>
            <Button type="button" variant="secondary" onClick={closeDialog} disabled={deleting}>Cancelar</Button>
            <Button type="submit" variant="danger" disabled={confirmText.trim() !== CONFIRM_WORD || deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar para siempre'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
