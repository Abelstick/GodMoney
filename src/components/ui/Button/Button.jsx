import { Button as MButton } from '@mantine/core'

const VARIANT_MAP = {
  primary:   { variant: 'filled',  color: 'violet' },
  secondary: { variant: 'outline', color: 'gray'   },
  danger:    { variant: 'filled',  color: 'red'    },
  ghost:     { variant: 'subtle',  color: 'gray'   },
  success:   { variant: 'filled',  color: 'green'  },
}

const SIZE_MAP = {
  sm:   'xs',
  md:   'sm',
  lg:   'md',
  icon: 'compact-sm',
}

export function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  disabled  = false,
  type      = 'button',
  onClick,
  className = '',
  style,
}) {
  const { variant: mv, color } = VARIANT_MAP[variant] ?? VARIANT_MAP.primary
  return (
    <MButton
      type={type}
      variant={mv}
      color={color}
      size={SIZE_MAP[size] ?? 'sm'}
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={style}
    >
      {children}
    </MButton>
  )
}
