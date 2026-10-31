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
  dark:    ['#e2e8f0', '#cbd5e1', '#8b97ab', '#64748b', '#313a4b', '#2a3242', '#1c2330', '#141a26', '#0f1420', '#0b0f19'],
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
  'bg':               '#f6f7fb',
  'surface':          '#ffffff',
  'surface-2':        '#f1f3f8',
  'surface-3':        '#e5e8f0',
  'surface-4':        '#d8dce6',
  'border':           'rgba(15, 23, 42, 0.08)',
  'border-strong':    'rgba(15, 23, 42, 0.16)',

  // Texto
  'text-primary':     '#0f172a',
  'text-secondary':   '#475569',
  'text-muted':       '#5b6b82',
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

  'bg':               '#0b0f19',
  'surface':          '#141a26',
  'surface-2':        '#1c2330',
  'surface-3':        '#262e3d',
  'surface-4':        '#313a4b',
  'border':           'rgba(255, 255, 255, 0.08)',
  'border-strong':    'rgba(255, 255, 255, 0.16)',

  'text-primary':     '#f1f5f9',
  'text-secondary':   '#b4bfd0',
  'text-muted':       '#8b97ab',
  'text-inverse':     '#0f172a',
}

// ── Elevación ──
// Tarjetas: sólidas, sin blur. El blur queda solo para capas flotantes
// (bottom nav, menú del FAB), vía --surface-overlay.
const lightElevation = {
  '--surface-glass':      light.surface, // alias legacy: ahora es sólido
  '--surface-glass-blur': '0px',
  '--shadow-glass':       '0 1px 2px rgba(15, 23, 42, 0.05)',
  '--shadow-card':        '0 1px 2px rgba(15, 23, 42, 0.05)',
  '--surface-overlay':    'rgba(255, 255, 255, 0.86)',
  '--overlay-blur':       '16px',
  '--shadow-overlay':     '0 8px 24px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
  '--glow-primary':       '0 6px 16px -4px rgba(79, 70, 229, 0.40)',
  '--glow-success':       'none',
  '--glow-danger':        'none',
  '--shadow-xs':  '0 1px 2px rgba(15, 23, 42, 0.04)',
  '--shadow-sm':  '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
  '--shadow-md':  '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
  '--shadow-lg':  '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  '--shadow-xl':  '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 10px 10px -5px rgba(15, 23, 42, 0.03)',
}

// En oscuro la elevación se expresa con el tono de la superficie, no con sombra.
const darkElevation = {
  '--surface-glass':      dark.surface,
  '--surface-glass-blur': '0px',
  '--shadow-glass':       'none',
  '--shadow-card':        'none',
  '--surface-overlay':    'rgba(20, 26, 38, 0.86)',
  '--overlay-blur':       '16px',
  '--shadow-overlay':     '0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  '--glow-primary':       '0 6px 18px -4px rgba(79, 70, 229, 0.55)',
  '--glow-success':       'none',
  '--glow-danger':        'none',
  '--shadow-xs':  '0 1px 2px rgba(0, 0, 0, 0.4)',
  '--shadow-sm':  '0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
  '--shadow-md':  '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  '--shadow-lg':  '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  '--shadow-xl':  '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
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
