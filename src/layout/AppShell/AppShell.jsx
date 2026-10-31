import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { IconMoon, IconSun, IconLogout, IconSparkles } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useAuth }   from '@/features/auth/AuthContext'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { runRecurringGeneration } from '@/lib/runRecurringGeneration'
import { OfflineBanner } from '../OfflineBanner/OfflineBanner'
import { Sidebar }   from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import { ToastBridge } from '../ToastBridge/ToastBridge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { InstallPrompt } from '@/components/ui/InstallPrompt/InstallPrompt'
import { ChatBot }       from '@/features/chat/ChatBot'
import { QuickAddSheet } from '@/features/quickAdd/QuickAddSheet'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './AppShell.module.css'

function MobileHeader({ onOpenChat }) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { signOut } = useAuth()
  const isDark = colorScheme === 'dark'

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <LogoMark size={24} />
        <span>GodMoney</span>
      </div>
      <div className={styles.headerActions}>
        <button
          className={`${styles.headerBtn} ${styles.headerBtnAi}`}
          onClick={onOpenChat}
          aria-label="Abrir asistente IA"
        >
          <IconSparkles size={18} stroke={1.75} />
        </button>
        <button
          className={styles.headerBtn}
          onClick={toggleColorScheme}
          aria-label="Cambiar tema"
        >
          {isDark
            ? <IconSun size={18} stroke={1.75} />
            : <IconMoon size={18} stroke={1.75} />
          }
        </button>
        <button
          className={`${styles.headerBtn} ${styles.headerBtnLogout}`}
          onClick={signOut}
          aria-label="Cerrar sesión"
        >
          <IconLogout size={18} stroke={1.75} />
        </button>
      </div>
    </header>
  )
}

export function AppShell() {
  const collapsed       = useStore((s) => s.sidebarCollapsed)
  const { pathname }    = useLocation()
  const hideFabs        = useHideOnScroll()
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
      <Sidebar onQuickAdd={() => setQuickAddOpen(true)} />

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <MobileHeader onOpenChat={() => setChatOpen(true)} />

        <main className={styles.content}>
          <OfflineBanner />
          <Suspense fallback={<LoadingSpinner />}>
            {/* key por ruta: cada página entra con un fade corto */}
            <div key={pathname} className={styles.pageEnter}>
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet opened={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <InstallPrompt />
      <ChatBot hidden={hideFabs} opened={chatOpen} onOpenChange={setChatOpen} />

      <ToastBridge />
    </div>
  )
}
