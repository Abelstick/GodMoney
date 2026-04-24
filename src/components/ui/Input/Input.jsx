import { TextInput } from '@mantine/core'

export function Input({
  label,
  error,
  hint,
  required = false,
  prefix,
  suffix,
  className = '',
  style,
  ...props
}) {
  return (
    <TextInput
      label={label}
      error={error}
      description={hint}
      required={required}
      leftSection={prefix ? <span style={{ fontSize: 14 }}>{prefix}</span> : undefined}
      rightSection={suffix ? <span style={{ fontSize: 14 }}>{suffix}</span> : undefined}
      className={className}
      style={style}
      styles={{
        input: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        },
        label: { color: 'var(--color-text-secondary)', fontWeight: 500 },
        description: { color: 'var(--color-text-muted)' },
      }}
      {...props}
    />
  )
}
