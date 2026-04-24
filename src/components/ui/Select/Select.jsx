import { NativeSelect } from '@mantine/core'

export function Select({ label, options = [], className = '', style, ...props }) {
  return (
    <NativeSelect
      label={label}
      data={options.map((o) => ({ value: String(o.value), label: o.label }))}
      className={className}
      style={style}
      styles={{
        input: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        },
        label: { color: 'var(--color-text-secondary)', fontWeight: 500 },
      }}
      {...props}
    />
  )
}
