import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  IconMessageCircle, IconX, IconSend, IconTrash, IconRobot,
} from '@tabler/icons-react'
import { useAuth } from '@/features/auth/AuthContext'
import { profileService } from '@/services/profileService'
import { askGemini, invalidateFinancialContext } from '@/services/geminiService'
import { useStore } from '@/store'
import styles from './ChatBot.module.css'

const SUGGESTIONS = [
  '¿Cómo voy este mes?',
  '¿En qué puedo recortar?',
  '¿Llego a mis objetivos?',
  '¿Quién me debe dinero?',
]

// Datos del store que, si cambian, dejan desactualizado el contexto que se
// le pasa a Gemini (así el caché de contexto puede durar más sin mentir).
const CONTEXT_KEYS = ['expenses', 'incomes', 'accounts', 'goals', 'goalAccountLinks', 'loans', 'budgets']

// Render mínimo de lo que el prompt permite: **negrita** y viñetas "- ".
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

function MessageText({ text }) {
  return text.split('\n').map((line, i) => {
    const bullet = /^\s*[-*•]\s+/.test(line)
    const content = bullet ? line.replace(/^\s*[-*•]\s+/, '') : line
    return (
      <div key={i} className={bullet ? styles.bulletLine : undefined}>
        {bullet && <span className={styles.bulletDot}>•</span>}
        {renderInline(content)}
        {!content && ' '}
      </div>
    )
  })
}

const WELCOME =
  'Hola 👋 Soy GodMoney AI. Puedo analizar tus finanzas, revisar tus gastos o ayudarte a planificar. ¿En qué te ayudo hoy?'

let msgSeq = 0
const makeMsg = (role, text) => ({ id: ++msgSeq, role, text })
const MAX_INPUT_LINES_PX = 120

// En móvil el teclado no achica los `vh`: el panel quedaba tapado. Se ajusta
// al visualViewport (el área realmente visible sobre el teclado).
function useVisualViewport(ref, active, onResize) {
  useLayoutEffect(() => {
    const vv = window.visualViewport
    const el = ref.current
    if (!active || !vv || !el) return
    function update() {
      el.style.setProperty('--vv-height', `${vv.height}px`)
      el.style.setProperty('--vv-top', `${vv.offsetTop}px`)
      onResize?.()
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])
}

export function ChatBot({ hidden = false }) {
  const { user } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [apiKey,   setApiKey]   = useState(null)
  const [messages, setMessages] = useState(() => [makeMsg('model', WELCOME)])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef               = useRef(null)
  const panelRef                = useRef(null)
  const inputRef                = useRef(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ block: 'end' })
  useVisualViewport(panelRef, open, scrollToBottom)

  // Bloquea el scroll de la página detrás del panel (en móvil ocupa toda la
  // pantalla) y permite cerrar con Escape.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Textarea que crece con el texto hasta ~5 líneas.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_LINES_PX)}px`
  }, [input, open])

  useEffect(() => {
    async function loadKey() {
      if (!user) return
      const profile = await profileService.getProfile(user.id)
      if (profile?.gemini_api_key) setApiKey(profile.gemini_api_key)
    }
    loadKey()
  }, [user])

  useEffect(() => useStore.subscribe((state, prev) => {
    if (CONTEXT_KEYS.some((k) => state[k] !== prev[k])) invalidateFinancialContext()
  }), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!apiKey) return null

  async function send(preset) {
    const text = (preset ?? input).trim()
    if (!text || loading) return

    const userMsg = makeMsg('user', text)
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
      setMessages([...next, makeMsg('model', reply)])
    } catch (err) {
      setMessages([...next, makeMsg('model', `⚠ ${err.message}`)])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([makeMsg('model', WELCOME)])
  }

  return (
    <>
      {/* Floating action button */}
      <button
        className={`${styles.fab} ${hidden && !open ? styles.fabHidden : ''}`}
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
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Asistente GodMoney AI">
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
                aria-label="Limpiar chat"
              >
                <IconTrash size={16} stroke={1.75} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                title="Cerrar"
                aria-label="Cerrar chat"
              >
                <IconX size={18} stroke={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.bubble} ${
                  m.role === 'user' ? styles.userBubble : styles.aiBubble
                }`}
              >
                {m.role === 'model' ? <MessageText text={m.text} /> : m.text}
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((q) => (
                  <button key={q} className={styles.suggestion} onClick={() => send(q)}>{q}</button>
                ))}
              </div>
            )}

            {loading && (
              <div className={`${styles.bubble} ${styles.aiBubble} ${styles.typing}`}>
                <span /><span /><span />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            {/* No se deshabilita mientras responde: en móvil un input
                disabled pierde el foco y cierra el teclado en cada envío. */}
            <textarea
              ref={inputRef}
              rows={1}
              className={styles.input}
              placeholder="Escribe tu pregunta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              enterKeyHint="send"
              aria-label="Mensaje para GodMoney AI"
            />
            <button
              className={styles.sendBtn}
              onClick={() => send()}
              // Evita que el botón robe el foco y cierre el teclado móvil.
              onPointerDown={(e) => e.preventDefault()}
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
