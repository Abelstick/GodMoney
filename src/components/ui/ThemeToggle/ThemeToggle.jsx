import { IconSun, IconMoon } from '@tabler/icons-react'
import { useThemeToggle } from '@/hooks/useThemeToggle'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { isDark, toggle } = useThemeToggle()

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className={styles.icon}>
        {isDark ? <IconSun size={16} stroke={1.75} /> : <IconMoon size={16} stroke={1.75} />}
      </span>
      <span className={styles.label}>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
