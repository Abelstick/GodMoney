import { useMantineColorScheme } from '@mantine/core'
import { IconSun, IconMoon } from '@tabler/icons-react'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <button
      className={styles.toggle}
      onClick={toggleColorScheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Cambiar tema"
    >
      <span className={styles.icon}>
        {isDark ? <IconSun size={16} stroke={1.75} /> : <IconMoon size={16} stroke={1.75} />}
      </span>
      <span className={styles.label}>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
