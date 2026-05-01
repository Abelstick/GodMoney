import { useState, useEffect, useRef } from 'react'
import {
  IconMessageCircle, IconX, IconSend, IconTrash, IconRobot,
} from '@tabler/icons-react'
import { useAuth } from '@/features/auth/AuthContext'
import { profileService } from '@/services/profileService'
import { askGemini } from '@/services/geminiService'
import styles from './ChatBot.module.css'

const WELCOME =
  'Hola 👋 Soy GodMoney AI. Puedo analizar tus finanzas, revisar tus gastos o ayudarte a planificar. ¿En qué te ayudo hoy?'

export function ChatBot() {
  const { user } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [apiKey,   setApiKey]   = useState(null)
  const [messages, setMessages] = useState([{ role: 'model', text: WELCOME }])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    async function loadKey() {
      if (!user) return
      const profile = await profileService.getProfile(user.id)
      if (profile?.gemini_api_key) setApiKey(profile.gemini_api_key)
    }
    loadKey()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!apiKey) return null

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    const next    = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      // Strip the static welcome message from the Gemini history
      const history = next.filter(
        (m) => !(m.role === 'model' && m.text === WELCOME)
      )
      const reply = await askGemini(apiKey, history, user.id)
      setMessages([...next, { role: 'model', text: reply }])
    } catch (err) {
      setMessages([...next, { role: 'model', text: `⚠ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([{ role: 'model', text: WELCOME }])
  }

  return (
    <>
      {/* Floating action button */}
      <button
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir asistente AI"
      >
        {open
          ? <IconX size={22} stroke={2} />
          : <IconMessageCircle size={22} stroke={1.75} />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>
                <IconRobot size={16} stroke={1.75} />
              </div>
              <div>
                <div className={styles.headerTitle}>GodMoney AI</div>
                <div className={styles.headerSub}>Gemini 3.1 Flash Lite · Activo</div>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                onClick={clearChat}
                title="Limpiar chat"
              >
                <IconTrash size={14} stroke={1.75} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                title="Cerrar"
              >
                <IconX size={15} stroke={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${
                  m.role === 'user' ? styles.userBubble : styles.aiBubble
                }`}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <div className={`${styles.bubble} ${styles.aiBubble} ${styles.typing}`}>
                <span /><span /><span />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <input
              className={styles.input}
              placeholder="Escribe tu pregunta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
            >
              <IconSend size={16} stroke={2} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
