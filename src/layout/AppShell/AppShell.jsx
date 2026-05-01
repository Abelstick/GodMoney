import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { IconMoon, IconSun, IconLogout } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useAuth }   from '@/features/auth/AuthContext'
import { Sidebar }   from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import { InstallPrompt } from '@/components/ui/InstallPrompt/InstallPrompt'
import { ChatBot }       from '@/features/chat/ChatBot'
import styles from './AppShell.module.css'

function MobileHeader() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { signOut } = useAuth()
  const isDark = colorScheme === 'dark'

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <span>💎</span>
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

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <MobileHeader />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <InstallPrompt />
      <ChatBot />

      {toast && (
        <div className={`${styles.toast} ${styles[toast.type] ?? ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
