import { useState, useEffect } from 'react'
import { IconKey, IconCheck, IconTrash, IconExternalLink } from '@tabler/icons-react'
import { useAuth } from '@/features/auth/AuthContext'
import { profileService } from '@/services/profileService'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import styles from './Settings.module.css'

export function Settings() {
  const { user } = useAuth()
  const [apiKey,   setApiKey]   = useState('')
  const [hasKey,   setHasKey]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    async function load() {
      const profile = await profileService.getProfile(user.id)
      setHasKey(!!profile?.gemini_api_key)
    }
    if (user) load()
  }, [user])

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setError(null)
    try {
      await profileService.saveGeminiApiKey(user.id, apiKey.trim())
      setHasKey(true)
      setApiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    try {
      await profileService.saveGeminiApiKey(user.id, null)
      setHasKey(false)
      setApiKey('')
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configuración</h1>

      <Card className={styles.section}>
        <Card.Header>
          <Card.Title>
            <span className={styles.titleIcon}><IconKey size={18} stroke={1.75} /></span>
            Gemini API Key
          </Card.Title>
        </Card.Header>

        <div className={styles.body}>
          <p className={styles.desc}>
            Ingresa tu clave de Gemini para activar el asistente financiero AI.
            La clave se guarda en tu perfil y nunca es compartida.
          </p>

          {hasKey && (
            <div className={styles.keyStatus}>
              <IconCheck size={15} stroke={2.5} />
              API Key configurada — el chat AI está activo
            </div>
          )}

          <div className={styles.inputRow}>
            <input
              type="password"
              className={styles.input}
              placeholder={hasKey ? 'Ingresa una clave nueva para reemplazar la actual' : 'AIzaSy...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoComplete="off"
            />
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!apiKey.trim() || saving}
            >
              {saved ? 'Guardado ✓' : saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {hasKey && (
            <button
              className={styles.removeBtn}
              onClick={handleRemove}
              disabled={removing}
            >
              <IconTrash size={13} stroke={2} />
              {removing ? 'Eliminando…' : 'Eliminar API Key'}
            </button>
          )}

          <div className={styles.help}>
            <p>¿No tienes una clave? Consíguela gratis en Google AI Studio:</p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.helpLink}
            >
              aistudio.google.com/app/apikey
              <IconExternalLink size={12} stroke={2} />
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}
