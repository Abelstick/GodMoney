import { Drawer } from '@mantine/core'
import { NavLink } from 'react-router-dom'
import {
  IconClipboard, IconBulb, IconTrendingUp, IconTag, IconKey,
  IconHandGrab, IconWallet,
} from '@tabler/icons-react'
import styles from './MoreSheet.module.css'

const MORE_ITEMS = [
  { to: '/prestamos',     icon: IconHandGrab,   label: 'Préstamos'     },
  { to: '/presupuestos',  icon: IconClipboard,  label: 'Presupuestos'  },
  { to: '/inteligencia',  icon: IconBulb,       label: 'Inteligencia'  },
  { to: '/predicciones',  icon: IconTrendingUp, label: 'Predicciones'  },
  { to: '/cuentas',       icon: IconWallet,     label: 'Cuentas'       },
  { to: '/categorias',    icon: IconTag,        label: 'Categorías'    },
  { to: '/configuracion', icon: IconKey,        label: 'Configuración' },
]

export const MORE_ROUTES = MORE_ITEMS.map((item) => item.to)

export function MoreSheet({ opened, onClose }) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
      withCloseButton={false}
      title="Más opciones"
      classNames={{
        content: styles.drawer,
        header:  styles.header,
        title:   styles.title,
        body:    styles.body,
      }}
    >
      <div className={styles.list}>
        {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.iconWrap}>
              <Icon size={20} stroke={1.75} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </Drawer>
  )
}
