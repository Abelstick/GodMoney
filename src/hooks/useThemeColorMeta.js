import { useEffect } from 'react'
import { useComputedColorScheme } from '@mantine/core'

// Mismo valor que --color-bg en src/theme/tokens.js
const BG = { light: '#f3f4f8', dark: '#0c0e14' }

// La barra de estado del sistema (Android / PWA instalada) y el fondo que se
// ve al hacer overscroll siguen al tema elegido en la app, no solo al del SO.
export function useThemeColorMeta() {
  const scheme = useComputedColorScheme('light')

  useEffect(() => {
    const color = BG[scheme]
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', color)
      meta.removeAttribute('media')
    })
    document.documentElement.style.background = color
    document.documentElement.style.colorScheme = scheme
  }, [scheme])
}
