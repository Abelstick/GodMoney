import { Drawer } from '@mantine/core'
import { NavLink } from 'react-router-dom'
import { MORE_SECTIONS } from '../navigation'
import styles from './MoreSheet.module.css'

// Hoja "Más": el resto de pantallas agrupadas igual que en la sidebar de
// escritorio, en cuadrícula de dos columnas para alcanzarlas con el pulgar.
export function MoreSheet({ opened, onClose }) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
      title="Más secciones"
      classNames={{
        content: styles.drawer,
        header:  styles.header,
        body:    styles.body,
      }}
    >
      {MORE_SECTIONS.map((section) => (
        <section key={section.id} className={styles.section} aria-labelledby={`more-${section.id}`}>
          <h2 id={`more-${section.id}`} className={styles.sectionTitle}>{section.label}</h2>
          <div className={styles.grid}>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.iconWrap} aria-hidden="true">
                  <Icon size={20} stroke={1.75} />
                </span>
                <span className={styles.itemLabel}>{label}</span>
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </Drawer>
  )
}
