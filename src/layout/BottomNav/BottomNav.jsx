import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconListSearch,
  IconClipboard,
  IconDots,
  IconPlus,
} from '@tabler/icons-react'
import { MoreSheet, MORE_ROUTES } from './MoreSheet'
import styles from './BottomNav.module.css'

const LEFT_TABS = [
  { to: '/',            icon: IconLayoutDashboard, label: 'Inicio'      },
  { to: '/movimientos', icon: IconListSearch,      label: 'Movimientos' },
]

const RIGHT_TABS = [
  { to: '/presupuestos', icon: IconClipboard, label: 'Presupuesto' },
]

function Tab({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
    >
      {({ isActive }) => (
        <>
          <span className={styles.iconWrap}>
            <Icon size={22} stroke={isActive ? 2 : 1.6} />
          </span>
          <span className={styles.label}>{label}</span>
        </>
      )}
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
        <div className={styles.pill}>
          {LEFT_TABS.map((t) => <Tab key={t.to} {...t} />)}

          <div className={styles.addSlot}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={onQuickAdd}
              aria-label="Registrar gasto o ingreso"
            >
              <IconPlus size={26} stroke={2.25} />
            </button>
          </div>

          {RIGHT_TABS.map((t) => <Tab key={t.to} {...t} />)}

          <button
            type="button"
            className={`${styles.tab} ${moreActive ? styles.active : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <span className={styles.iconWrap}>
              <IconDots size={22} stroke={moreActive ? 2 : 1.6} />
            </span>
            <span className={styles.label}>Más</span>
          </button>
        </div>
      </nav>

      <MoreSheet opened={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
