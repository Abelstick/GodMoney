import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconCashBanknote,
  IconShoppingCart,
  IconFlag,
  IconDots,
} from '@tabler/icons-react'
import { MoreSheet, MORE_ROUTES } from './MoreSheet'
import styles from './BottomNav.module.css'

const TABS = [
  { to: '/',          icon: IconLayoutDashboard, label: 'Inicio'    },
  { to: '/ingresos',  icon: IconCashBanknote,    label: 'Ingresos'  },
  { to: '/gastos',    icon: IconShoppingCart,    label: 'Gastos'    },
  { to: '/objetivos', icon: IconFlag,            label: 'Objetivos' },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = MORE_ROUTES.includes(pathname)

  return (
    <>
      <nav className={styles.nav}>
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.active : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.iconWrap}>
                  <Icon size={20} stroke={isActive ? 2 : 1.5} />
                  {isActive && <span className={styles.activeDot} />}
                </span>
                <span className={styles.label}>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          className={`${styles.tab} ${moreActive ? styles.active : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="true"
          aria-expanded={moreOpen}
        >
          <span className={styles.iconWrap}>
            <IconDots size={20} stroke={moreActive ? 2 : 1.5} />
            {moreActive && <span className={styles.activeDot} />}
          </span>
          <span className={styles.label}>Más</span>
        </button>
      </nav>

      <MoreSheet opened={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
