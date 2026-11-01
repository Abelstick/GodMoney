import { NavLink, useLocation } from 'react-router-dom'
import { m } from 'framer-motion'
import {
  IconPlus, IconMoon, IconSun, IconLogout, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react'
import { Tooltip } from '@mantine/core'
import { useStore } from '@/store'
import { useAuth } from '@/features/auth/AuthContext'
import { useThemeToggle } from '@/hooks/useThemeToggle'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import { NAV_SECTIONS } from '../navigation'
import styles from './Sidebar.module.css'

const ACTIVE_SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }

// Tooltip solo cuando la barra está colapsada (el texto sigue siendo el nombre
// accesible del enlace en ambos estados).
function NavTip({ label, collapsed, children }) {
  return (
    <Tooltip label={label} position="right" withArrow disabled={!collapsed} events={{ hover: true, focus: true, touch: false }}>
      {children}
    </Tooltip>
  )
}

function NavItem({ to, icon: Icon, label, collapsed, pathname }) {
  const isActive = to === '/' ? pathname === '/' : pathname === to
  return (
    <NavTip label={label} collapsed={collapsed}>
      <NavLink to={to} end={to === '/'} className={`${styles.item} ${isActive ? styles.active : ''}`}>
        {isActive && (
          <m.span layoutId="sidebar-active" className={styles.activeBg} transition={ACTIVE_SPRING} aria-hidden="true" />
        )}
        <Icon size={18} stroke={isActive ? 2 : 1.75} className={styles.itemIcon} aria-hidden="true" />
        <span className={styles.itemLabel}>{label}</span>
      </NavLink>
    </NavTip>
  )
}

export function Sidebar({ onQuickAdd }) {
  const { user, signOut }   = useAuth()
  const { isDark, toggle }  = useThemeToggle()
  const collapsed           = useStore((s) => s.sidebarCollapsed)
  const toggleCollapsed     = useStore((s) => s.toggleSidebarCollapsed)
  const { pathname }        = useLocation()

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '··'

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} aria-label="Barra lateral">
      <div className={styles.brand}>
        <LogoMark size={28} />
        <span className={styles.brandText}>GodMoney</span>
      </div>

      {/* Acción principal: único relleno sólido de la barra */}
      <div className={styles.quickAddWrap}>
        <NavTip label="Registrar movimiento (N)" collapsed={collapsed}>
          <button
            type="button"
            className={styles.quickAdd}
            onClick={onQuickAdd}
            aria-haspopup="dialog"
            aria-keyshortcuts="N"
          >
            <IconPlus size={18} stroke={2.25} className={styles.quickAddIcon} aria-hidden="true" />
            <span className={styles.quickAddLabel}>Registrar movimiento</span>
            <kbd className={styles.quickAddKbd} aria-hidden="true">N</kbd>
          </button>
        </NavTip>
      </div>

      <nav className={styles.nav} aria-label="Navegación principal">
        {NAV_SECTIONS.map((section) => (
          section.to ? (
            <NavItem key={section.id} {...section} collapsed={collapsed} pathname={pathname} />
          ) : (
            <div key={section.id} className={styles.group} role="group" aria-labelledby={`nav-${section.id}`}>
              <span id={`nav-${section.id}`} className={styles.groupLabel}>{section.label}</span>
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          )
        ))}
      </nav>

      <div className={styles.footer}>
        {user && (
          <div className={styles.user}>
            <span className={styles.avatar} aria-hidden="true">{initials}</span>
            <span className={styles.email} title={user.email}>{user.email}</span>
          </div>
        )}
        <div className={styles.footerActions}>
          <NavTip label={isDark ? 'Modo claro' : 'Modo oscuro'} collapsed>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggle}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <IconSun size={18} stroke={1.75} /> : <IconMoon size={18} stroke={1.75} />}
            </button>
          </NavTip>
          {user && (
            <NavTip label="Cerrar sesión" collapsed>
              <button type="button" className={`${styles.iconBtn} ${styles.logout}`} onClick={signOut} aria-label="Cerrar sesión">
                <IconLogout size={18} stroke={1.75} />
              </button>
            </NavTip>
          )}
          <NavTip label={collapsed ? 'Expandir barra' : 'Colapsar barra'} collapsed>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
              aria-expanded={!collapsed}
            >
              {collapsed
                ? <IconLayoutSidebarLeftExpand size={18} stroke={1.75} />
                : <IconLayoutSidebarLeftCollapse size={18} stroke={1.75} />}
            </button>
          </NavTip>
        </div>
      </div>
    </aside>
  )
}
