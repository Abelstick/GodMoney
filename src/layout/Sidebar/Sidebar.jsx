import { NavLink } from 'react-router-dom'
import { Avatar, Text } from '@mantine/core'
import { useAuth } from '@/features/auth/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { section: 'Principal' },
  { to: '/',             icon: '🏠', label: 'Dashboard' },
  { section: 'Transacciones' },
  { to: '/ingresos',     icon: '💰', label: 'Ingresos' },
  { to: '/gastos',       icon: '💸', label: 'Gastos' },
  { section: 'Planificación' },
  { to: '/objetivos',    icon: '🎯', label: 'Objetivos' },
  { to: '/presupuestos', icon: '📋', label: 'Presupuestos' },
  { section: 'Análisis' },
  { to: '/predicciones', icon: '📈', label: 'Predicciones' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>💎</span>
        <span className={styles.logoText}>GodMoney</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item, i) => {
          if (item.section) {
            return <div key={i} className={styles.navSection}>{item.section}</div>
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.item} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.itemIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className={styles.footer}>
        {user && (
          <div className={styles.userRow}>
            <Avatar color="violet" radius="xl" size="sm">
              {initials}
            </Avatar>
            <div className={styles.userInfo}>
              <Text size="xs" fw={500} truncate style={{ color: 'var(--color-text-primary)', maxWidth: 120 }}>
                {user.email}
              </Text>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={signOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              ↩
            </button>
          </div>
        )}
        <ThemeToggle />
        <div className={styles.version}>GodMoney v1.0</div>
      </div>
    </aside>
  )
}
