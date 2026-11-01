import { createTheme } from '@mantine/core'
import { palettes, cssVariables } from './tokens'

// Una sola familia: Inter variable. El eje óptico (opsz) da los cortes
// "Display" en títulos y cifras grandes de forma automática.
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// Transición de capas (modales, sheets): sube 16px y aparece. Sirve igual para
// el modal centrado de escritorio y para el bottom sheet de móvil.
const RISE = {
  in:  { opacity: 1, transform: 'translateY(0) scale(1)' },
  out: { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
  common: { transformOrigin: 'bottom center' },
  transitionProperty: 'transform, opacity',
}

// Menús y desplegables: escala corta desde el disparador.
const POP = {
  in:  { opacity: 1, transform: 'scale(1)' },
  out: { opacity: 0, transform: 'scale(0.97)' },
  common: { transformOrigin: 'top' },
  transitionProperty: 'transform, opacity',
}

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const LAYER_TRANSITION = { transition: RISE, duration: 260, exitDuration: 160, timingFunction: EASE_OUT }
const POP_TRANSITION   = { transition: POP, duration: 160, exitDuration: 100, timingFunction: EASE_OUT }

export const theme = createTheme({
  respectReducedMotion: true,
  colors: palettes,
  primaryColor: 'brand',
  // [7] en ambos modos: es el tono con texto blanco ≥ 4.5:1 en todas las paletas.
  primaryShade: { light: 7, dark: 7 },
  autoContrast: true,
  cursorType: 'pointer',
  focusRing: 'auto',

  fontFamily: SANS,
  fontFamilyMonospace: '"JetBrains Mono", "Cascadia Code", monospace',
  headings: {
    fontFamily: SANS,
    fontWeight: '650',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.15' },
      h2: { fontSize: '1.25rem', lineHeight: '1.25' },
      h3: { fontSize: '1rem',    lineHeight: '1.35' },
      h4: { fontSize: '0.9375rem', lineHeight: '1.4' },
    },
  },
  // Escala 12 / 14 / 16 / 20 / 24 (nada por debajo de 12px)
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  // 8 chips · 10 controles · 16 tarjetas · 22 sheets
  radius: {
    xs: '6px',
    sm: '8px',
    md: '10px',
    lg: '16px',
    xl: '22px',
  },
  defaultRadius: 'md',
  // Base de 4px
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },

  components: {
    Paper: {
      defaultProps: { radius: 'lg' },
    },
    Card: {
      defaultProps: { radius: 'lg', withBorder: true, padding: 'md' },
    },
    Button: {
      defaultProps: { radius: 'md' },
      styles: { root: { fontWeight: 600, letterSpacing: '-0.005em' } },
    },
    ActionIcon: {
      defaultProps: { radius: 'md', variant: 'subtle' },
    },
    // Campos: etiqueta persistente encima, ayuda y error debajo (asociados por
    // Mantine vía aria-describedby). 16px en táctil se fuerza en global.css
    // para que iOS no haga zoom al enfocar.
    InputWrapper: {
      styles: {
        label: { fontWeight: 500, marginBottom: 6, fontSize: 'var(--type-label)' },
        description: { marginTop: 2, marginBottom: 6 },
        error: { marginTop: 6, fontWeight: 500 },
      },
    },
    Input: {
      defaultProps: { radius: 'md' },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
        centered: true,
        transitionProps: LAYER_TRANSITION,
        overlayProps: { backgroundOpacity: 1, color: 'var(--scrim)', blur: 2 },
      },
    },
    Drawer: {
      defaultProps: {
        radius: 'xl',
        overlayProps: { backgroundOpacity: 1, color: 'var(--scrim)', blur: 2 },
      },
    },
    Menu: {
      defaultProps: { radius: 'md', shadow: 'lg', transitionProps: POP_TRANSITION },
    },
    Popover: {
      defaultProps: { radius: 'md', shadow: 'lg', transitionProps: POP_TRANSITION },
    },
    Combobox: {
      defaultProps: { radius: 'md', shadow: 'lg', transitionProps: POP_TRANSITION },
    },
    Tooltip: {
      defaultProps: { radius: 'sm', transitionProps: { transition: 'fade', duration: 120 }, openDelay: 300 },
    },
    SegmentedControl: {
      defaultProps: { radius: 'md', transitionDuration: 220, transitionTimingFunction: EASE_OUT },
    },
    Chip: {
      defaultProps: { radius: 'sm' },
    },
    Tabs: {
      defaultProps: { radius: 'md' },
    },
    // Microinteracciones: las barras y anillos se animan al cambiar de valor
    // (Mantine las desactiva con prefers-reduced-motion por respectReducedMotion).
    Progress: {
      defaultProps: { radius: 'xl', transitionDuration: 320 },
    },
    RingProgress: {
      defaultProps: { transitionDuration: 320 },
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
      defaultProps: { radius: 'lg', withBorder: true },
    },
    Loader: {
      defaultProps: { type: 'dots' },
    },
  },
})

export const cssVariablesResolver = () => cssVariables
