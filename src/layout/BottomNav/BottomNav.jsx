import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { to: '/',            icon: '🏠', label: 'Inicio' },
  { to: '/ingresos',    icon: '💰', label: 'Ingresos' },
  { to: '/gastos',      icon: '💸', label: 'Gastos' },
  { to: '/objetivos',   icon: '🎯', label: 'Metas' },
  { to: '/predicciones',icon: '📈', label: 'Tendencias' },
]

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
