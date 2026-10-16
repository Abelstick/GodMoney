import { useState } from 'react'
import { IconFileTypePdf, IconPhoto } from '@tabler/icons-react'
import { AttachmentViewer } from './AttachmentViewer'
import styles from './Attachments.module.css'

/** Contenido de una miniatura: imagen, o icono si no hay vista previa. */
export function ThumbContent({ attachment }) {
  if (attachment.thumb) return <img src={attachment.thumb} alt="" className={styles.thumbImg} loading="lazy" />
  const Icon = attachment.mimeType === 'application/pdf' ? IconFileTypePdf : IconPhoto
  return <Icon size={22} stroke={1.5} />
}

/** Fila de miniaturas de solo lectura; al tocar una se abre el visor. */
export function AttachmentStrip({ attachments, size = 'sm' }) {
  const [index, setIndex] = useState(null)
  if (!attachments?.length) return null

  return (
    <>
      <div className={styles.strip}>
        {attachments.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={`${styles.tile} ${size === 'sm' ? styles.tileSm : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Ver ${a.name}`}
            title={a.name}
          >
            <ThumbContent attachment={a} />
          </button>
        ))}
      </div>
      <AttachmentViewer
        attachments={attachments}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
      />
    </>
  )
}
