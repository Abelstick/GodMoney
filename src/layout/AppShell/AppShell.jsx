import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { m } from 'framer-motion'
import { useHotkeys } from '@mantine/hooks'
import { IconMoon, IconSun, IconLogout, IconSparkles } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useAuth }   from '@/features/auth/AuthContext'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { useThemeToggle } from '@/hooks/useThemeToggle'
import { runRecurringGeneration } from '@/lib/runRecurringGeneration'
import { OfflineBanner } from '../OfflineBanner/OfflineBanner'
import { Sidebar }   from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import { ToastBridge } from '../ToastBridge/ToastBridge'
import { routeTitle } from '../navigation'
import { PageSkeleton } from '@/components/common/Skeleton/PageSkeleton'
import { InstallPrompt } from '@/components/ui/InstallPrompt/InstallPrompt'
import { ChatBot }       from '@/features/chat/ChatBot'
import { QuickAddSheet } from '@/features/quickAdd/QuickAddSheet'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './AppShell.module.css'

const PAGE_ENTER = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
}

function MobileHeader({ onOpenChat }) {
  const { isDark, toggle } = useThemeToggle()
  const { signOut } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <LogoMark size={26} />
        <span className={styles.headerTitle}>GodMoney</span>
      </div>
      <div className={styles.headerActions}>
        <button
          type="button"
          className={`${styles.headerBtn} ${styles.headerBtnAi}`}
          onClick={onOpenChat}
          aria-label="Abrir asistente IA"
        >
          <IconSparkles size={19} stroke={1.75} />
        </button>
        <button
          type="button"
          className={styles.headerBtn}
          onClick={toggle}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark
            ? <IconSun size={19} stroke={1.75} />
            : <IconMoon size={19} stroke={1.75} />
          }
        </button>
        <button
          type="button"
          className={`${styles.headerBtn} ${styles.headerBtnLogout}`}
          onClick={signOut}
          aria-label="Cerrar sesión"
        >
          <IconLogout size={19} stroke={1.75} />
        </button>
      </div>
    </header>
  )
}

// Al cambiar de pantalla: título del documento, foco al contenido (el lector
// de pantalla empieza por la página nueva, no por la navegación) y anuncio.
function useRouteFocus(pathname, mainRef) {
  const [announcement, setAnnouncement] = useState('')
  const first = useRef(true)

  useEffect(() => {
    const title = routeTitle(pathname)
    document.title = pathname === '/' ? 'GodMoney' : `${title} · GodMoney`
    if (first.current) { first.current = false; return }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
    setAnnouncement(title)
  }, [pathname, mainRef])

  return announcement
}

export function AppShell() {
  const collapsed       = useStore((s) => s.sidebarCollapsed)
  const { pathname }    = useLocation()
  const hideFabs        = useHideOnScroll()
  const mainRef         = useRef(null)
  const announcement    = useRouteFocus(pathname, mainRef)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [chatOpen, setChatOpen]         = useState(false)

  // Atajo global "N" → registrar movimiento (Mantine ignora la tecla mientras
  // se escribe en inputs, textareas y selects).
  useHotkeys([['n', () => setQuickAddOpen(true)]])

  // Al abrir la app se crean los gastos/ingresos recurrentes que ya vencieron.
  useEffect(() => { runRecurringGeneration() }, [])

  // Movimientos guardados sin conexión: se envían al abrir la app, al volver
  // internet y al volver a la pestaña.
  const syncOfflineQueue    = useStore((s) => s.syncOfflineQueue)
  const refreshOfflineCount = useStore((s) => s.refreshOfflineCount)
  useEffect(() => {
    refreshOfflineCount()
    syncOfflineQueue()
    const onVisible = () => { if (document.visibilityState === 'visible') syncOfflineQueue() }
    window.addEventListener('online', syncOfflineQueue)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', syncOfflineQueue)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncOfflineQueue, refreshOfflineCount])

  return (
    <div className={styles.shell}>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>

      <Sidebar onQuickAdd={() => setQuickAddOpen(true)} />

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <MobileHeader onOpenChat={() => setChatOpen(true)} />

        <main id="contenido" ref={mainRef} tabIndex={-1} className={styles.content}>
          <OfflineBanner />
          <Suspense fallback={<PageSkeleton />}>
            {/* key por ruta: cada pantalla entra con un fundido y 8px de subida
                (con movimiento reducido, solo el fundido) */}
            <m.div key={pathname} {...PAGE_ENTER}>
              <Outlet />
            </m.div>
          </Suspense>
        </main>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet opened={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <InstallPrompt />
      <ChatBot hidden={hideFabs} opened={chatOpen} onOpenChange={setChatOpen} />

      <ToastBridge />
    </div>
  )
}
