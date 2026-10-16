import { useRef, useState } from 'react'
import { TagsInput, Textarea } from '@mantine/core'
import { IconCamera, IconX, IconLoader2 } from '@tabler/icons-react'
import { uploadAttachment, isDriveConfigured } from '@/lib/googleDrive'
import { AttachmentViewer } from '@/components/common/Attachments/AttachmentViewer'
import { ThumbContent } from '@/components/common/Attachments/AttachmentStrip'
import styles from './TransactionExtras.module.css'

const MAX_FILES = 6

const fieldStyles = {
  input: {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  label: { color: 'var(--color-text-secondary)', fontWeight: 500 },
  description: { color: 'var(--color-text-muted)' },
}

/**
 * Etiquetas, nota y adjuntos (guardados en el Google Drive del usuario).
 * Componente controlado: `value` = { tags, notes, attachments }.
 */
export function TransactionExtras({ value, onChange }) {
  const fileRef = useRef(null)
  const [pending, setPending] = useState([]) // nombres de archivos subiéndose
  const [errors, setErrors]   = useState([])
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState(null)

  const uploading = pending.length > 0

  async function uploadFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
    const rejected = fileList.length - files.length
    const room = MAX_FILES - value.attachments.length
    const batch = files.slice(0, Math.max(0, room))

    const errs = []
    if (rejected > 0) errs.push('Solo se aceptan fotos y PDF.')
    if (files.length > batch.length) errs.push(`Máximo ${MAX_FILES} adjuntos por movimiento.`)
    setErrors(errs)
    if (!batch.length) return

    setPending(batch.map((f) => f.name))
    const uploaded = []
    for (const file of batch) {
      try {
        uploaded.push(await uploadAttachment(file))
      } catch (err) {
        errs.push(`${file.name}: ${err.message}`)
        setErrors([...errs])
        // Si el usuario canceló el permiso de Drive no tiene sentido seguir con el resto
        if (/permiso|autoriz|configurar/i.test(err.message)) break
      } finally {
        setPending((p) => p.slice(1))
      }
    }
    setPending([])
    if (uploaded.length) onChange({ attachments: [...value.attachments, ...uploaded] })
  }

  function handleInput(e) {
    const files = e.target.files
    if (files?.length) uploadFiles(files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (isDriveConfigured && !uploading && e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
  }

  function removeAttachment(id) {
    onChange({ attachments: value.attachments.filter((a) => a.id !== id) })
  }

  const disabled = uploading || !isDriveConfigured || value.attachments.length >= MAX_FILES

  return (
    <div className={styles.root}>
      <TagsInput
        label="Etiquetas"
        placeholder="Escribe y presiona Enter"
        value={value.tags}
        onChange={(tags) => onChange({ tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean) })}
        splitChars={[',']}
        clearable
        styles={fieldStyles}
      />
      <Textarea
        label="Nota"
        placeholder="Detalle adicional (opcional)"
        value={value.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        autosize
        minRows={2}
        maxRows={5}
        styles={fieldStyles}
      />

      <div>
        <span className={styles.label}>Adjuntos</span>

        <div className={styles.grid}>
          {value.attachments.map((a, i) => (
            <div key={a.id} className={styles.tileWrap}>
              <button type="button" className={styles.tile} onClick={() => setViewing(i)}
                aria-label={`Ver ${a.name}`} title={a.name}>
                <ThumbContent attachment={a} />
              </button>
              <button type="button" className={styles.remove} onClick={() => removeAttachment(a.id)}
                aria-label={`Quitar ${a.name}`}>
                <IconX size={12} stroke={2.5} />
              </button>
            </div>
          ))}

          {pending.map((name, i) => (
            <div key={`${name}-${i}`} className={`${styles.tile} ${styles.tilePending}`} role="status" aria-label={`Subiendo ${name}`}>
              <IconLoader2 size={20} stroke={1.75} className={styles.spin} />
            </div>
          ))}

          {!disabled && value.attachments.length + pending.length < MAX_FILES && (
            <button
              type="button"
              className={`${styles.tile} ${styles.addTile} ${dragging ? styles.dragging : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              aria-label="Agregar foto o PDF"
            >
              <IconCamera size={22} stroke={1.5} />
              <span>Agregar</span>
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={handleInput} />

        <p className={styles.hint}>
          {!isDriveConfigured
            ? 'Google Drive no está configurado (falta VITE_GOOGLE_CLIENT_ID).'
            : uploading
              ? 'Optimizando y subiendo a tu Google Drive…'
              : value.attachments.length
                ? 'Toca una foto para verla en grande. Quitarla solo la desvincula; el archivo sigue en tu Drive.'
                : 'Fotos de boletas o facturas, o PDF. Se guardan en tu Google Drive (carpeta “GodMoney - Adjuntos”). También puedes arrastrarlas aquí.'}
        </p>
        {errors.map((msg) => <p key={msg} className={styles.error} role="alert">{msg}</p>)}
      </div>

      <AttachmentViewer
        attachments={value.attachments}
        index={viewing}
        onIndexChange={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}

/** Valores iniciales / extracción para formularios. */
export const EMPTY_EXTRAS = { tags: [], notes: '', attachments: [] }

export function extrasFrom(record) {
  return {
    tags: record?.tags ?? [],
    notes: record?.notes ?? '',
    attachments: record?.attachments ?? [],
  }
}

export function extrasPayload(extras) {
  return {
    tags: extras.tags,
    notes: extras.notes.trim() || null,
    attachments: extras.attachments,
  }
}
