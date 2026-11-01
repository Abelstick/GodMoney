import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { m } from 'framer-motion'
import { IconDots, IconPlus } from '@tabler/icons-react'
import { BOTTOM_TABS_LEFT, BOTTOM_TABS_RIGHT, MORE_ROUTES } from '../navigation'
import { MoreSheet } from './MoreSheet'
import styles from './BottomNav.module.css'

const ACTIVE_SPRING = { type: 'spring', stiffness: 560, damping: 40, mass: 0.7 }

// La pastilla del activo se desliza de una pestaña a otra (layoutId): el
// cambio de sección se entiende por movimiento, no solo por color.
function TabInner({ icon: Icon, label, isActive }) {
  return (
    <>
      <span className={styles.iconWrap}>
        {isActive && (
          <m.span layoutId="bottomnav-active" className={styles.activePill} transition={ACTIVE_SPRING} aria-hidden="true" />
        )}
        <Icon size={22} stroke={isActive ? 2 : 1.6} className={styles.icon} aria-hidden="true" />
      </span>
      <span className={styles.label}>{label}</span>
    </>
  )
}

function Tab({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
    >
      {({ isActive }) => <TabInner icon={icon} label={label} isActive={isActive} />}
    </NavLink>
  )
}

export function BottomNav({ onQuickAdd }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = MORE_ROUTES.includes(pathname)

  return (
    <>
      <nav className={styles.nav} aria-label="Navegación principal">
        <div className={styles.bar}>
          {BOTTOM_TABS_LEFT.map((t) => <Tab key={t.to} {...t} />)}

          <div className={styles.addSlot}>
            <m.button
              type="button"
              className={styles.addBtn}
              onClick={onQuickAdd}
              aria-label="Registrar gasto o ingreso"
              aria-haspopup="dialog"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            >
              <IconPlus size={26} stroke={2.25} aria-hidden="true" />
            </m.button>
          </div>

          {BOTTOM_TABS_RIGHT.map((t) => <Tab key={t.to} {...t} />)}

          <button
            type="button"
            className={`${styles.tab} ${moreActive ? styles.active : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive ? 'page' : undefined}
          >
            <TabInner icon={IconDots} label="Más" isActive={moreActive} />
          </button>
        </div>
      </nav>

      <MoreSheet opened={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
