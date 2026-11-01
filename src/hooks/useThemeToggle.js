import { flushSync } from 'react-dom'
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core'

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Cambio de tema con fundido cruzado (View Transitions) donde el navegador lo
// soporta; sin soporte o con movimiento reducido, el cambio es instantáneo.
// La preferencia la sigue guardando Mantine (localStorage), como antes.
export function useThemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const computed = useComputedColorScheme('light')
  const isDark = computed === 'dark'

  function toggle() {
    const next = isDark ? 'light' : 'dark'
    const apply = () => flushSync(() => setColorScheme(next))
    if (!document.startViewTransition || prefersReducedMotion()) {
      apply()
      return
    }
    document.startViewTransition(apply)
  }

  return { isDark, toggle }
}
