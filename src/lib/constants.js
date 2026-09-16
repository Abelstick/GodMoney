import {
  IconBriefcase, IconDeviceLaptop, IconTrendingUp, IconCirclePlus,
  IconHome, IconShoppingCart, IconCar, IconHeart, IconMusic, IconBook,
  IconShirt, IconGift, IconTag, IconTarget, IconDots, IconCoffee,
  IconPlane, IconDeviceMobile, IconBolt, IconStar, IconPercentage,
} from '@tabler/icons-react'

export const CATEGORY_ICONS = [
  'briefcase', 'laptop', 'trending-up', 'plus-circle',
  'home', 'shopping-cart', 'car', 'heart', 'music',
  'book', 'shirt', 'gift', 'tag', 'target', 'more-horizontal',
]

// Componente Tabler Icon para cada key de categoría
// (mismas keys que CATEGORY_ICONS, con algunas heredadas por compatibilidad).
export const CATEGORY_ICON_COMPONENTS = {
  briefcase: IconBriefcase, laptop: IconDeviceLaptop, 'trending-up': IconTrendingUp,
  'plus-circle': IconCirclePlus, home: IconHome, 'shopping-cart': IconShoppingCart,
  car: IconCar, heart: IconHeart, music: IconMusic, book: IconBook,
  shirt: IconShirt, gift: IconGift, tag: IconTag, target: IconTarget,
  'more-horizontal': IconDots, coffee: IconCoffee, plane: IconPlane,
  phone: IconDeviceMobile, zap: IconBolt, star: IconStar, percentage: IconPercentage,
}

export const CATEGORY_COLORS = [
  '#6366f1', '#10b981', '#ef4444', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899',
  '#f43f5e', '#a855f7', '#14b8a6', '#64748b',
]

export const BUDGET_PERIODS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'yearly',  label: 'Anual' },
]

export const GOAL_STATUSES = {
  active:    { label: 'Activo',     color: 'var(--color-primary)' },
  completed: { label: 'Completado', color: 'var(--color-success)' },
  paused:    { label: 'Pausado',    color: 'var(--color-warning)' },
}

export const CHART_COLORS = {
  income:  '#10b981',
  expense: '#ef4444',
  profit:  '#6366f1',
  neutral: '#94a3b8',
}

export const MONTHS_HISTORY = 6
