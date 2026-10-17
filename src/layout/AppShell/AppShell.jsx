import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { IconMoon, IconSun, IconLogout } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useAuth }   from '@/features/auth/AuthContext'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { runRecurringGeneration } from '@/lib/runRecurringGeneration'
import { OfflineBanner } from '../OfflineBanner/OfflineBanner'
import { Sidebar }   from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import { QuickAddFab } from '../QuickAddFab/QuickAddFab'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { InstallPrompt } from '@/components/ui/InstallPrompt/InstallPrompt'
import { ChatBot }       from '@/features/chat/ChatBot'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './AppShell.module.css'

function MobileHeader() {
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
  const toast           = useStore((s) => s.toast)
  const clearToast      = useStore((s) => s.clearToast)
  const collapsed       = useStore((s) => s.sidebarCollapsed)
  const hideFabs        = useHideOnScroll()

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

  useEffect(() => {
    if (!toast) return
    // Con botón de acción (Deshacer) se da más tiempo para alcanzarlo.
    const t = setTimeout(clearToast, toast.action ? 8000 : 3000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <MobileHeader />

        <main className={styles.content}>
          <OfflineBanner />
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomNav />
      <QuickAddFab hidden={hideFabs} />
      <InstallPrompt />
      <ChatBot hidden={hideFabs} />

      {toast && (
        <div className={`${styles.toast} ${styles[toast.type] ?? ''}`}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className={styles.toastAction}
              onClick={() => { clearToast(); toast.action.onClick() }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
