import { useRef, useState } from 'react'
import { TagsInput, Textarea } from '@mantine/core'
import { IconPaperclip, IconX, IconExternalLink, IconLoader2 } from '@tabler/icons-react'
import { uploadAttachment, isDriveConfigured } from '@/lib/googleDrive'
import styles from './TransactionExtras.module.css'

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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(e) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      const uploaded = []
      for (const file of files) uploaded.push(await uploadAttachment(file))
      onChange({ attachments: [...value.attachments, ...uploaded] })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function removeAttachment(id) {
    onChange({ attachments: value.attachments.filter((a) => a.id !== id) })
  }

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
        {value.attachments.length > 0 && (
          <ul className={styles.files}>
            {value.attachments.map((a) => (
              <li key={a.id} className={styles.file}>
                <a href={a.link} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                  <IconPaperclip size={14} stroke={1.75} />
                  <span className={styles.fileName}>{a.name}</span>
                  <IconExternalLink size={12} stroke={1.75} aria-hidden="true" />
                </a>
                <button type="button" className={styles.remove} onClick={() => removeAttachment(a.id)}
                  aria-label={`Quitar ${a.name}`}>
                  <IconX size={14} stroke={2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={handleFiles} />
        <button
          type="button"
          className={styles.addBtn}
          disabled={uploading || !isDriveConfigured}
          onClick={() => fileRef.current?.click()}
        >
          {uploading
            ? <><IconLoader2 size={16} stroke={1.75} className={styles.spin} /> Subiendo a tu Drive…</>
            : <><IconPaperclip size={16} stroke={1.75} /> Adjuntar foto o PDF</>}
        </button>
        <p className={styles.hint}>
          {isDriveConfigured
            ? 'Se guardan en tu Google Drive (carpeta “GodMoney - Adjuntos”). Quitar un adjunto solo lo desvincula; el archivo sigue en tu Drive.'
            : 'Google Drive no está configurado (falta VITE_GOOGLE_CLIENT_ID).'}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
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
