import {
  IconArrowDownLeft, IconArrowUpRight, IconCreditCardPay, IconPigMoney, IconArrowsRightLeft,
} from '@tabler/icons-react'

// Presentación de cada tipo de evento: ícono, tono semántico y textos de ayuda.
// tone: el color sale de los tokens (--color-income, --color-expense, ...).
export const EVENT_META = {
  income:   { icon: IconArrowDownLeft,   tone: 'income',  placeholder: 'Ej: Sueldo de noviembre' },
  expense:  { icon: IconArrowUpRight,    tone: 'expense', placeholder: 'Ej: Celular nuevo' },
  debt:     { icon: IconCreditCardPay,   tone: 'warning', placeholder: 'Ej: Cuota de la tarjeta' },
  saving:   { icon: IconPigMoney,        tone: 'savings', placeholder: 'Ej: Fondo de emergencia' },
  transfer: { icon: IconArrowsRightLeft, tone: 'neutral', placeholder: 'Ej: De la cuenta sueldo a la de gastos' },
}
