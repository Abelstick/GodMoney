import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard, IconArrowsRightLeft, IconTarget,
  IconChartBar, IconSettings2, IconChevronRight,
  IconMoon, IconSun, IconLogout, IconMenu2, IconX,
  IconCashBanknote, IconShoppingCart, IconFlag,
  IconClipboard, IconTrendingUp, IconTag, IconKey,
} from '@tabler/icons-react'
import { useMantineColorScheme } from '@mantine/core'
import { useStore } from '@/store'
import { useAuth } from '@/features/auth/AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  {
    id: 'dashboard',
    icon: IconLayoutDashboard,
    label: 'Principal',
    to: '/',
  },
  {
    id: 'transactions',
    icon: IconArrowsRightLeft,
    label: 'Transacciones',
    items: [
      { to: '/ingresos',    icon: IconCashBanknote, label: 'Ingresos' },
      { to: '/gastos',      icon: IconShoppingCart,  label: 'Gastos'   },
    ],
  },
  {
    id: 'planning',
    icon: IconTarget,
    label: 'Planificación',
    items: [
      { to: '/objetivos',    icon: IconFlag,      label: 'Objetivos'    },
      { to: '/presupuestos', icon: IconClipboard, label: 'Presupuestos' },
    ],
  },
  {
    id: 'analysis',
    icon: IconChartBar,
    label: 'Análisis',
    items: [
      { to: '/predicciones', icon: IconTrendingUp, label: 'Predicciones' },
    ],
  },
  {
    id: 'maintenance',
    icon: IconSettings2,
    label: 'Mantenimiento',
    items: [
      { to: '/categorias',    icon: IconTag, label: 'Categorías'  },
      { to: '/configuracion', icon: IconKey, label: 'Configuración' },
    ],
  },
]

function getSectionsWithActive(pathname) {
  const open = new Set()
  NAV.forEach((section) => {
    if (section.items?.some((item) => item.to === pathname)) {
      open.add(section.id)
    }
  })
  return open
}

export function Sidebar() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { user, signOut }         = useAuth()
  const collapsed                 = useStore((s) => s.sidebarCollapsed)
  const toggleCollapsed           = useStore((s) => s.toggleSidebarCollapsed)
  const location                  = useLocation()
  const isDark                    = colorScheme === 'dark'

  const [openSections, setOpenSections] = useState(
    () => getSectionsWithActive(location.pathname)
  )

  // Auto-open section when navigating via bottom nav / direct URL
  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      getSectionsWithActive(location.pathname).forEach((id) => next.add(id))
      return next
    })
  }, [location.pathname])

  // Close all submenus when collapsing
  useEffect(() => {
    if (collapsed) setOpenSections(new Set())
  }, [collapsed])

  function toggleSection(id) {
    if (collapsed) return
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??'

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoEmoji}>💎</span>
        <span className={styles.logoText}>GodMoney</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map((section) => {
          const SectionIcon = section.icon
          const isOpen = openSections.has(section.id)

          // Item directo (dashboard)
          if (section.to) {
            return (
              <NavLink
                key={section.id}
                to={section.to}
                end
                className={({ isActive }) =>
                  `${styles.directItem} ${isActive ? styles.activeItem : ''}`
                }
                title={collapsed ? section.label : undefined}
              >
                <SectionIcon size={18} stroke={1.75} className={styles.itemIcon} />
                <span className={styles.itemLabel}>{section.label}</span>
              </NavLink>
            )
          }

          // Sección con submenú
          const hasActiveChild = section.items?.some((i) => i.to === location.pathname)

          return (
            <div key={section.id} className={styles.section}>
              <button
                className={`${styles.sectionBtn} ${hasActiveChild ? styles.sectionActive : ''}`}
                onClick={() => toggleSection(section.id)}
                title={collapsed ? section.label : undefined}
              >
                <SectionIcon size={18} stroke={1.75} className={styles.itemIcon} />
                <span className={styles.itemLabel}>{section.label}</span>
                <IconChevronRight
                  size={14}
                  stroke={2}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
              </button>

              <div className={`${styles.submenu} ${isOpen ? styles.submenuOpen : ''}`}>
                {section.items?.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `${styles.subItem} ${isActive ? styles.activeItem : ''}`
                      }
                    >
                      <ItemIcon size={15} stroke={1.75} className={styles.subItemIcon} />
                      <span className={styles.itemLabel}>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        className={styles.collapseBtn}
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed
          ? <IconMenu2 size={16} stroke={1.75} />
          : <IconX size={16} stroke={1.75} />
        }
        <span className={styles.itemLabel}>Colapsar</span>
      </button>

      {/* Footer */}
      <div className={styles.footer}>
        {/* Dark mode pill */}
        <button
          className={`${styles.themeToggle} ${isDark ? styles.themeDark : ''}`}
          onClick={toggleColorScheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          <div className={styles.toggleTrack}>
            <div className={styles.toggleThumb}>
              {isDark
                ? <IconSun size={11} stroke={2} />
                : <IconMoon size={11} stroke={2} />
              }
            </div>
          </div>
          <span className={styles.itemLabel}>
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        {/* User + logout */}
        {user && (
          <button className={styles.logoutBtn} onClick={signOut} title="Cerrar sesión">
            <IconLogout size={16} stroke={1.75} className={styles.logoutIcon} />
            <span className={styles.logoutLabel}>
              <span className={styles.logoutEmail}>{user.email}</span>
              <span className={styles.logoutText}>Cerrar sesión</span>
            </span>
          </button>
        )}
      </div>
    </aside>
  )
}
