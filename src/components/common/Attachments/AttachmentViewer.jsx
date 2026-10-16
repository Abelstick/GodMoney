import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@mantine/core'
import {
  IconChevronLeft, IconChevronRight, IconExternalLink, IconFileTypePdf, IconLoader2,
} from '@tabler/icons-react'
import { fetchAttachmentBlob } from '@/lib/googleDrive'
import { isImage } from '@/lib/imageUtils'
import styles from './Attachments.module.css'

/**
 * Visor de adjuntos. Muestra la miniatura al instante y, en segundo plano,
 * descarga la imagen completa desde el Drive del usuario. Si no se puede
 * (sin permiso, sin red), se queda con la miniatura y ofrece abrir en Drive.
 */
export function AttachmentViewer({ attachments, index, onIndexChange, onClose }) {
  const current = index !== null && index >= 0 ? attachments[index] : null
  const [fullSrc, setFullSrc] = useState(null)
  const [loading, setLoading] = useState(false)

  const multiple = attachments.length > 1
  const go = useCallback((delta) => {
    onIndexChange((index + delta + attachments.length) % attachments.length)
  }, [index, attachments.length, onIndexChange])

  useEffect(() => {
    setFullSrc(null)
    if (!current || !isImage(current.mimeType)) return undefined

    let cancelled = false
    let url = null
    setLoading(true)
    fetchAttachmentBlob(current.id)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setFullSrc(url)
      })
      .catch(() => { /* se mantiene la miniatura */ })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [current])

  useEffect(() => {
    if (!current || !multiple) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, multiple, go])

  const src = fullSrc ?? current?.thumb

  return (
    <Modal
      opened={Boolean(current)}
      onClose={onClose}
      title={current ? (
        <span className={styles.viewerTitle}>
          {current.name}
          {multiple && <span className={styles.counter}> · {index + 1}/{attachments.length}</span>}
        </span>
      ) : ''}
      size="xl"
      centered
      styles={{
        content: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' },
        header:  { backgroundColor: 'var(--color-surface)' },
        title:   { color: 'var(--color-text-primary)', fontWeight: 600, minWidth: 0 },
      }}
    >
      {current && (
        <div className={styles.viewer}>
          <div className={styles.stage}>
            {multiple && (
              <button type="button" className={`${styles.nav} ${styles.navPrev}`} onClick={() => go(-1)} aria-label="Anterior">
                <IconChevronLeft size={22} stroke={2} />
              </button>
            )}

            {src ? (
              <img src={src} alt={current.name}
                className={`${styles.image} ${!fullSrc ? styles.imageBlur : ''}`} />
            ) : (
              <div className={styles.noPreview}>
                <IconFileTypePdf size={56} stroke={1.25} />
                <span>{isImage(current.mimeType) ? 'Vista previa no disponible' : 'Los PDF se abren en Google Drive'}</span>
              </div>
            )}

            {loading && (
              <span className={styles.loadingBadge} role="status">
                <IconLoader2 size={14} stroke={2} className={styles.spin} /> Cargando original…
              </span>
            )}

            {multiple && (
              <button type="button" className={`${styles.nav} ${styles.navNext}`} onClick={() => go(1)} aria-label="Siguiente">
                <IconChevronRight size={22} stroke={2} />
              </button>
            )}
          </div>

          <a href={current.link} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
            <IconExternalLink size={16} stroke={1.75} /> Abrir en Google Drive
          </a>
        </div>
      )}
    </Modal>
  )
}
