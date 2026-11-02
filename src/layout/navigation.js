import {
  IconLayoutDashboard, IconArrowsRightLeft, IconTarget, IconChartBar, IconSettings2,
  IconCashBanknote, IconShoppingCart, IconFlag, IconClipboard, IconTrendingUp, IconTag,
  IconKey, IconBulb, IconHandGrab, IconWallet, IconListSearch, IconReportAnalytics, IconBellRinging, IconGift,
} from '@tabler/icons-react'

// Fuente única de la navegación: la usan la sidebar (escritorio), la bottom
// nav y su hoja "Más" (móvil) y el título del documento por ruta.
export const NAV_SECTIONS = [
  {
    id: 'dashboard',
    icon: IconLayoutDashboard,
    label: 'Resumen',
    to: '/',
  },
  {
    id: 'transactions',
    icon: IconArrowsRightLeft,
    label: 'Transacciones',
    items: [
      { to: '/movimientos', icon: IconListSearch,   label: 'Movimientos' },
      { to: '/gastos',      icon: IconShoppingCart, label: 'Gastos'      },
      { to: '/ingresos',    icon: IconCashBanknote, label: 'Ingresos'    },
    ],
  },
  {
    id: 'planning',
    icon: IconTarget,
    label: 'Planificación',
    items: [
      { to: '/presupuestos',      icon: IconClipboard,   label: 'Presupuestos'      },
      { to: '/objetivos',         icon: IconFlag,        label: 'Objetivos'         },
      { to: '/pagos-recurrentes', icon: IconBellRinging, label: 'Pagos recurrentes' },
      { to: '/regalos',           icon: IconGift,        label: 'Regalos'           },
      { to: '/prestamos',         icon: IconHandGrab,    label: 'Préstamos'         },
    ],
  },
  {
    id: 'analysis',
    icon: IconChartBar,
    label: 'Análisis',
    items: [
      { to: '/inteligencia',     icon: IconBulb,            label: 'Inteligencia'     },
      { to: '/predicciones',     icon: IconTrendingUp,      label: 'Predicciones'     },
      { to: '/score-crediticio', icon: IconReportAnalytics, label: 'Score crediticio' },
    ],
  },
  {
    id: 'maintenance',
    icon: IconSettings2,
    label: 'Ajustes',
    items: [
      { to: '/cuentas',       icon: IconWallet, label: 'Cuentas'       },
      { to: '/categorias',    icon: IconTag,    label: 'Categorías'    },
      { to: '/configuracion', icon: IconKey,    label: 'Configuración' },
    ],
  },
]

// Pestañas fijas de la bottom nav (el "+" va en medio y "Más" al final).
export const BOTTOM_TABS_LEFT = [
  { to: '/',            icon: IconLayoutDashboard, label: 'Inicio'      },
  { to: '/movimientos', icon: IconListSearch,      label: 'Movimientos' },
]
export const BOTTOM_TABS_RIGHT = [
  { to: '/presupuestos', icon: IconClipboard, label: 'Presupuesto' },
]

const IN_TABS = new Set([...BOTTOM_TABS_LEFT, ...BOTTOM_TABS_RIGHT].map((t) => t.to))

// Hoja "Más": las secciones de la sidebar sin las rutas que ya son pestañas.
export const MORE_SECTIONS = NAV_SECTIONS
  .filter((s) => s.items)
  .map((s) => ({ ...s, items: s.items.filter((i) => !IN_TABS.has(i.to)) }))
  .filter((s) => s.items.length > 0)

export const MORE_ROUTES = MORE_SECTIONS.flatMap((s) => s.items.map((i) => i.to))

const TITLES = Object.fromEntries(
  NAV_SECTIONS.flatMap((s) => (s.items ?? [s]).map((i) => [i.to, i.label]))
)

export const routeTitle = (pathname) => TITLES[pathname] ?? 'GodMoney'
