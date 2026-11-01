// Fuente única de los tokens de color de GodMoney.
// `theme.js` construye con esto el theme de Mantine y, vía cssVariablesResolver,
// publica las variables CSS (--color-*) que usan los CSS modules. No definir
// colores en variables.css: todo sale de aquí.
//
// Todos los colores de texto semánticos cumplen WCAG AA (≥ 4.5:1) sobre la
// superficie, el fondo de página y su propio fondo suave, en ambos modos.

// ── Paletas de 10 tonos para Mantine (color="income", etc.) ──
// El índice 7 es el tono "filled" (primaryShade) y lleva texto blanco ≥ 4.5:1.
export const palettes = {
  brand:   ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6d70f3', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'],
  income:  ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  expense: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
  savings: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  warning: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  // Neutros del modo oscuro de Mantine: [7] = superficie (body de modales,
  // Paper), [6] = fondo de inputs, [4] = bordes, [2] = texto atenuado.
  dark:    ['#eceff5', '#c9cfdb', '#8f97aa', '#666f84', '#2e3443', '#242936', '#1b1f2a', '#141720', '#10131a', '#0c0e14'],
}

// ── Roles semánticos por modo ──
// Los nombres "legacy" (success, danger, surface-glass…) se mantienen como
// alias para no tocar los ~100 CSS modules que ya los usan.
const light = {
  // Marca
  'primary':          '#4f46e5',
  'primary-light':    '#4338ca', // en claro "light" es el tono de texto sobre fondos suaves
  'primary-dark':     '#4338ca',
  'primary-alpha':    'rgba(79, 70, 229, 0.10)',
  'on-primary-dark':  '#ffffff',

  // Semánticos: ingreso = verde, gasto = rojo, ahorro = azul, aviso = ámbar
  'income':           '#047857',
  'income-light':     '#ecfdf5',
  'expense':          '#be123c',
  'expense-light':    '#fff1f2',
  'savings':          '#1d4ed8',
  'savings-light':    '#eff6ff',
  'warning':          '#92400e',
  'warning-light':    '#fffbeb',
  'info':             '#4f46e5',
  'info-light':       '#eef2ff',

  // Alias legacy
  'success':          '#047857',
  'success-light':    '#ecfdf5',
  'danger':           '#be123c',
  'danger-light':     '#fff1f2',
  'danger-soft':      '#be123c',
  'danger-soft-light': '#fff1f2',

  // Semáforo del score crediticio
  'credit-score-1':   '#dc2626',
  'credit-score-2':   '#c2410c',
  'credit-score-3':   '#a16207',
  'credit-score-4':   '#15803d',
  'credit-score-5':   '#166534',

  // Superficies
  // Neutros tintados hacia el índigo de marca (no gris puro): el fondo de
  // página queda un paso por debajo de las tarjetas para separar superficies.
  'bg':               '#f3f4f8',
  'surface':          '#ffffff',
  'surface-2':        '#eff1f6',
  'surface-3':        '#e3e6ee',
  'surface-4':        '#d5d9e4',
  'border':           'rgba(16, 22, 48, 0.08)',
  'border-strong':    'rgba(16, 22, 48, 0.15)',

  // Panel protagonista (saldo): tinta índigo profunda en ambos modos
  'hero-bg':          '#1e1b4b',
  'hero-text':        '#ffffff',
  'hero-muted':       'rgba(255, 255, 255, 0.72)',
  'hero-line':        'rgba(255, 255, 255, 0.14)',

  // Texto
  'text-primary':     '#0e1222',
  'text-secondary':   '#444c60',
  'text-muted':       '#586278',
  'text-inverse':     '#ffffff',
}

const dark = {
  'primary':          '#a5b4fc',
  'primary-light':    '#c7d2fe',
  'primary-dark':     '#4f46e5',
  'primary-alpha':    'rgba(165, 180, 252, 0.16)',
  'on-primary-dark':  '#ffffff',

  'income':           '#34d399',
  'income-light':     'rgba(52, 211, 153, 0.14)',
  'expense':          '#fb7185',
  'expense-light':    'rgba(251, 113, 133, 0.14)',
  'savings':          '#60a5fa',
  'savings-light':    'rgba(96, 165, 250, 0.16)',
  'warning':          '#fbbf24',
  'warning-light':    'rgba(251, 191, 36, 0.14)',
  'info':             '#a5b4fc',
  'info-light':       'rgba(165, 180, 252, 0.16)',

  'success':          '#34d399',
  'success-light':    'rgba(52, 211, 153, 0.14)',
  'danger':           '#fb7185',
  'danger-light':     'rgba(251, 113, 133, 0.14)',
  'danger-soft':      '#fb7185',
  'danger-soft-light': 'rgba(251, 113, 133, 0.14)',

  'credit-score-1':   '#f87171',
  'credit-score-2':   '#fb923c',
  'credit-score-3':   '#facc15',
  'credit-score-4':   '#4ade80',
  'credit-score-5':   '#22c55e',

  // Grafito con un punto de índigo, sin negro absoluto. Cada capa sube ~6% de
  // luminosidad: la elevación se lee por tono, no por sombra.
  'bg':               '#0c0e14',
  'surface':          '#141720',
  'surface-2':        '#1b1f2a',
  'surface-3':        '#242936',
  'surface-4':        '#2e3443',
  'border':           'rgba(255, 255, 255, 0.07)',
  'border-strong':    'rgba(255, 255, 255, 0.14)',

  'hero-bg':          '#1d1f45',
  'hero-text':        '#ffffff',
  'hero-muted':       'rgba(255, 255, 255, 0.72)',
  'hero-line':        'rgba(255, 255, 255, 0.12)',

  'text-primary':     '#eceff5',
  'text-secondary':   '#adb4c4',
  'text-muted':       '#8f97aa',
  'text-inverse':     '#0f172a',
}

// ── Elevación ──
// Tarjetas: sólidas, sin blur. El blur queda solo para capas flotantes
// (bottom nav, menú del FAB), vía --surface-overlay.
const lightElevation = {
  '--surface-glass':      light.surface, // alias legacy: ahora es sólido
  '--surface-glass-blur': '0px',
  '--shadow-glass':       '0 1px 2px rgba(16, 22, 48, 0.04)',
  // Tarjeta: borde + sombra casi imperceptible con offset (no halo).
  '--shadow-card':        '0 1px 2px rgba(16, 22, 48, 0.04), 0 1px 1px rgba(16, 22, 48, 0.02)',
  // Hover de elementos interactivos: sube un escalón, nunca más.
  '--shadow-raised':      '0 4px 12px -4px rgba(16, 22, 48, 0.10), 0 1px 2px rgba(16, 22, 48, 0.05)',
  '--surface-overlay':    'rgba(255, 255, 255, 0.84)',
  '--overlay-blur':       '18px',
  '--shadow-overlay':     '0 12px 32px -12px rgba(16, 22, 48, 0.22), 0 0 0 1px rgba(16, 22, 48, 0.05)',
  '--glow-primary':       '0 6px 16px -6px rgba(79, 70, 229, 0.55)',
  '--glow-success':       'none',
  '--glow-danger':        'none',
  '--scrim':              'rgba(14, 18, 34, 0.42)',
  '--shadow-xs':  '0 1px 2px rgba(16, 22, 48, 0.04)',
  '--shadow-sm':  '0 1px 3px rgba(16, 22, 48, 0.07), 0 1px 2px rgba(16, 22, 48, 0.04)',
  '--shadow-md':  '0 4px 10px -2px rgba(16, 22, 48, 0.08), 0 2px 4px -2px rgba(16, 22, 48, 0.04)',
  '--shadow-lg':  '0 12px 24px -8px rgba(16, 22, 48, 0.14), 0 4px 8px -4px rgba(16, 22, 48, 0.05)',
  '--shadow-xl':  '0 24px 48px -12px rgba(16, 22, 48, 0.20), 0 8px 16px -8px rgba(16, 22, 48, 0.06)',
}

// En oscuro la elevación se expresa con el tono de la superficie, no con sombra.
const darkElevation = {
  '--surface-glass':      dark.surface,
  '--surface-glass-blur': '0px',
  '--shadow-glass':       'none',
  '--shadow-card':        'none',
  '--shadow-raised':      '0 6px 16px -6px rgba(0, 0, 0, 0.55)',
  '--surface-overlay':    'rgba(20, 23, 32, 0.82)',
  '--overlay-blur':       '18px',
  '--shadow-overlay':     '0 16px 40px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.07)',
  '--glow-primary':       '0 6px 18px -6px rgba(99, 102, 241, 0.6)',
  '--glow-success':       'none',
  '--glow-danger':        'none',
  '--scrim':              'rgba(0, 0, 0, 0.6)',
  '--shadow-xs':  '0 1px 2px rgba(0, 0, 0, 0.4)',
  '--shadow-sm':  '0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
  '--shadow-md':  '0 4px 10px -2px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  '--shadow-lg':  '0 12px 24px -8px rgba(0, 0, 0, 0.6), 0 4px 8px -4px rgba(0, 0, 0, 0.3)',
  '--shadow-xl':  '0 24px 48px -12px rgba(0, 0, 0, 0.7), 0 8px 16px -8px rgba(0, 0, 0, 0.3)',
}

const prefix = (roles) =>
  Object.fromEntries(Object.entries(roles).map(([k, v]) => [`--color-${k}`, v]))

// En oscuro, el texto de las variantes "light" de Mantine (Badge, Alert,
// ActionIcon) usaría el tono [5] de cada paleta, que no llega a AA sobre
// #141a26: se fuerza el mismo tono que los tokens semánticos.
const darkLightVariantText = {
  '--mantine-color-brand-light-color':   dark.primary,
  '--mantine-color-income-light-color':  dark.income,
  '--mantine-color-expense-light-color': dark.expense,
  '--mantine-color-savings-light-color': dark.savings,
  '--mantine-color-warning-light-color': dark.warning,
}

export const cssVariables = {
  variables: {},
  light: {
    ...prefix(light),
    ...lightElevation,
    '--mantine-color-body':   light.surface,
    '--mantine-color-text':   light['text-primary'],
    '--mantine-color-dimmed': light['text-muted'],
  },
  dark: {
    ...prefix(dark),
    ...darkElevation,
    ...darkLightVariantText,
    '--mantine-color-body':   dark.surface,
    '--mantine-color-text':   dark['text-primary'],
    '--mantine-color-dimmed': dark['text-muted'],
  },
}
