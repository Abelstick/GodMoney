import { NavLink } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconCashBanknote,
  IconShoppingCart,
  IconFlag,
  IconTrendingUp,
} from '@tabler/icons-react'
import styles from './BottomNav.module.css'

const TABS = [
  { to: '/',             icon: IconLayoutDashboard, label: 'Inicio'     },
  { to: '/ingresos',     icon: IconCashBanknote,    label: 'Ingresos'   },
  { to: '/gastos',       icon: IconShoppingCart,    label: 'Gastos'     },
  { to: '/objetivos',    icon: IconFlag,            label: 'Objetivos'  },
  { to: '/predicciones', icon: IconTrendingUp,      label: 'Tendencias' },
]

export function BottomNav() {
  return (
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
    </nav>
  )
}
