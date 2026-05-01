import { useState } from 'react'
import { Stack, Group, SegmentedControl, ColorSwatch, SimpleGrid, Tooltip } from '@mantine/core'
import { Input }   from '@/components/ui/Input/Input'
import { Button }  from '@/components/ui/Button/Button'
import { CATEGORY_COLORS } from '@/lib/constants'
import styles from './CategoryForm.module.css'

const ICONS = [
  { value: 'briefcase',      emoji: '💼' },
  { value: 'laptop',         emoji: '💻' },
  { value: 'trending-up',    emoji: '📈' },
  { value: 'plus-circle',    emoji: '➕' },
  { value: 'home',           emoji: '🏠' },
  { value: 'shopping-cart',  emoji: '🛒' },
  { value: 'car',            emoji: '🚗' },
  { value: 'heart',          emoji: '❤️' },
  { value: 'music',          emoji: '🎵' },
  { value: 'book',           emoji: '📚' },
  { value: 'shirt',          emoji: '👕' },
  { value: 'gift',           emoji: '🎁' },
  { value: 'tag',            emoji: '🏷️' },
  { value: 'target',         emoji: '🎯' },
  { value: 'more-horizontal',emoji: '➕' },
  { value: 'coffee',         emoji: '☕' },
  { value: 'plane',          emoji: '✈️' },
  { value: 'phone',          emoji: '📱' },
  { value: 'zap',            emoji: '⚡' },
  { value: 'star',           emoji: '⭐' },
]

const EMPTY = { name: '', type: 'expense', color: '#6366f1', icon: 'tag' }

export function CategoryForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ name: form.name.trim(), type: form.type, color: form.color, icon: form.icon })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={errors.name}
          placeholder="Ej: Alimentación"
          required
        />

        <div>
          <label className={styles.label}>Tipo</label>
          <SegmentedControl
            fullWidth
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            data={[
              { value: 'income',  label: 'Ingreso'  },
              { value: 'expense', label: 'Egreso'   },
              { value: 'both',    label: 'Ambos'    },
            ]}
            color="violet"
            radius="md"
          />
        </div>

        <div>
          <label className={styles.label}>Color</label>
          <SimpleGrid cols={6} spacing="xs">
            {CATEGORY_COLORS.map((c) => (
              <Tooltip key={c} label={c} withArrow>
                <ColorSwatch
                  color={c}
                  size={32}
                  className={`${styles.swatch} ${form.color === c ? styles.selected : ''}`}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{ cursor: 'pointer' }}
                />
              </Tooltip>
            ))}
          </SimpleGrid>
        </div>

        <div>
          <label className={styles.label}>Ícono</label>
          <SimpleGrid cols={5} spacing="xs">
            {ICONS.map((ic) => (
              <button
                key={ic.value}
                type="button"
                className={`${styles.iconBtn} ${form.icon === ic.value ? styles.iconSelected : ''}`}
                onClick={() => setForm((f) => ({ ...f, icon: ic.value }))}
                title={ic.value}
              >
                {ic.emoji}
              </button>
            ))}
          </SimpleGrid>
        </div>

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
