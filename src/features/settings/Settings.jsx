import { useState, useEffect } from 'react'
import { IconKey, IconCheck, IconTrash, IconExternalLink, IconBellRinging, IconBrandTelegram, IconAlertTriangle } from '@tabler/icons-react'
import { useAuth } from '@/features/auth/AuthContext'
import { profileService } from '@/services/profileService'
import { telegramLinkService } from '@/services/telegramLinkService'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import styles from './Settings.module.css'

function NotificationsSection() {
  const { supported, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications()
  const [isBrave, setIsBrave] = useState(false)

  useEffect(() => {
    if (navigator.brave?.isBrave) {
      navigator.brave.isBrave().then(setIsBrave)
    }
  }, [])

  return (
    <Card className={styles.section}>
      <Card.Header>
        <Card.Title>
          <span className={styles.titleIcon}><IconBellRinging size={18} stroke={1.75} /></span>
          Notificaciones push
        </Card.Title>
      </Card.Header>

      <div className={styles.body}>
        <p className={styles.desc}>
          Activa las notificaciones push para recibir avisos de tus pagos recurrentes
          (seguro, internet, servicios) directamente en este navegador o dispositivo,
          aunque no tengas la app abierta.
        </p>

        {isBrave && !subscribed && (
          <p className={styles.hint}>
            <IconAlertTriangle size={16} stroke={1.75} className={styles.hintIcon} />
            <span>
              Detectamos que usas <strong>Brave</strong>: por defecto bloquea el
              servicio de push de Google. Si al activar falla, ve a{' '}
              <code className={styles.inlineCode}>brave://settings/privacy</code> y
              activa "Usar servicios de Google para mensajes push", luego recarga
              esta página.
            </span>
          </p>
        )}

        {!supported ? (
          <p className={styles.error}>Este navegador no soporta notificaciones push.</p>
        ) : (
          <>
            {subscribed && (
              <div className={styles.keyStatus}>
                <IconCheck size={15} stroke={2.5} />
                Notificaciones push activadas en este dispositivo
              </div>
            )}
            <Button
              variant={subscribed ? 'secondary' : 'primary'}
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={loading}
            >
              {loading ? 'Procesando…' : subscribed ? 'Desactivar en este dispositivo' : 'Activar notificaciones push'}
            </Button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </Card>
  )
}

function TelegramSection() {
  const [linked, setLinked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [linkUrl, setLinkUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    telegramLinkService.getStatus()
      .then((s) => setLinked(s.linked))
      .finally(() => setLoading(false))
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const url = await telegramLinkService.createLinkUrl()
      setLinkUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleUnlink() {
    setGenerating(true)
    setError(null)
    try {
      await telegramLinkService.unlink()
      setLinked(false)
      setLinkUrl(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className={styles.section}>
      <Card.Header>
        <Card.Title>
          <span className={styles.titleIcon}><IconBrandTelegram size={18} stroke={1.75} /></span>
          Telegram
        </Card.Title>
      </Card.Header>

      <div className={styles.body}>
        <p className={styles.desc}>
          Vincula tu cuenta de Telegram para recibir ahí los avisos de pagos recurrentes
          próximos a vencer o vencidos.
        </p>

        {loading ? null : linked ? (
          <>
            <div className={styles.keyStatus}>
              <IconCheck size={15} stroke={2.5} />
              Telegram vinculado
            </div>
            <button className={styles.removeBtn} onClick={handleUnlink} disabled={generating}>
              <IconTrash size={13} stroke={2} />
              {generating ? 'Desvinculando…' : 'Desvincular Telegram'}
            </button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generando…' : 'Vincular Telegram'}
            </Button>
            {linkUrl && (
              <p className={styles.desc}>
                Si no se abrió automáticamente, abre este link y presiona "Iniciar" en el bot:{' '}
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.helpLink}>
                  {linkUrl} <IconExternalLink size={12} stroke={2} />
                </a>
              </p>
            )}
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Card>
  )
}

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
              className={styles.saveBtn}
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

      <NotificationsSection />
      <TelegramSection />
    </div>
  )
}
