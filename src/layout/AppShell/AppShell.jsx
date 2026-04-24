import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { useStore } from '@/store'
import { useAuth }   from '@/features/auth/AuthContext'
import { Sidebar }   from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import styles from './AppShell.module.css'

function MobileHeader() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { signOut } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <span>💎</span>
        <span>GodMoney</span>
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.themeBtn}
          onClick={toggleColorScheme}
          aria-label="Cambiar tema"
        >
          {colorScheme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className={styles.logoutBtn}
          onClick={signOut}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          ↩
        </button>
      </div>
    </header>
  )
}

export function AppShell() {
  const toast      = useStore((s) => s.toast)
  const clearToast = useStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={styles.main}>
        <MobileHeader />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <BottomNav />

      {toast && (
        <div className={`${styles.toast} ${styles[toast.type] ?? ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
