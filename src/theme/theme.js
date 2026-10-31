import { createTheme } from '@mantine/core'
import { palettes, cssVariables } from './tokens'

const SANS    = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const DISPLAY = '"Plus Jakarta Sans", ' + SANS

export const theme = createTheme({
  respectReducedMotion: true,
  colors: palettes,
  primaryColor: 'brand',
  // [7] en ambos modos: es el tono con texto blanco ≥ 4.5:1 en todas las paletas.
  primaryShade: { light: 7, dark: 7 },

  fontFamily: SANS,
  fontFamilyMonospace: '"JetBrains Mono", "Cascadia Code", monospace',
  headings: {
    fontFamily: DISPLAY,
    fontWeight: '700',
  },
  // Escala 12 / 14 / 16 / 20 / 24 (nada por debajo de 12px)
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  // 8 controles · 12 tarjetas · 16 sheets/modales
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  defaultRadius: 'sm',
  // Base de 4px
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  components: {
    Paper: {
      defaultProps: { radius: 'md' },
    },
    Card: {
      defaultProps: { radius: 'md', withBorder: true, padding: 'md' },
    },
    Modal: {
      defaultProps: { radius: 'lg', centered: true },
    },
    Drawer: {
      defaultProps: { radius: 'lg' },
    },
    // Microinteracciones: las barras y anillos se animan al cambiar de valor
    // (Mantine las desactiva con prefers-reduced-motion por respectReducedMotion).
    Progress: {
      defaultProps: { radius: 'xl', transitionDuration: 200 },
    },
    RingProgress: {
      defaultProps: { transitionDuration: 200 },
    },
    Badge: {
      defaultProps: { radius: 'xl', variant: 'light' },
      styles: { root: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 } },
    },
    NumberInput: {
      // Montos: separadores es-PE y 2 decimales; Mantine pone inputMode="decimal"
      // para que en móvil salga el teclado numérico.
      defaultProps: { decimalSeparator: '.', thousandSeparator: ',', decimalScale: 2, hideControls: true },
    },
    Notification: {
      defaultProps: { radius: 'md', withBorder: true },
    },
  },
})

export const cssVariablesResolver = () => cssVariables
