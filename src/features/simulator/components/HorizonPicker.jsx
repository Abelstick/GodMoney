import { Chip } from '@mantine/core'
import { Input } from '@/components/ui/Input/Input'
import { HORIZONS } from '@/lib/simulation/scenarioModel'
import styles from '../Simulator.module.css'

// Accesos rápidos del horizonte de la proyección (7 días … 3 meses, o fechas propias).
export function HorizonPicker({ config, windowEnd, onChange }) {
  return (
    <div className={styles.horizon}>
      <Chip.Group value={config.horizon} onChange={(horizon) => onChange({
        horizon,
        // Al pasar a personalizado se parte del final que se estaba viendo.
        customEnd: horizon === 'custom' ? (config.customEnd ?? windowEnd) : config.customEnd,
      })}>
        <div className={styles.horizonChips} role="radiogroup" aria-label="Periodo a proyectar">
          {HORIZONS.map((h) => (
            <Chip key={h.value} value={h.value} size="xs" variant="light">{h.label}</Chip>
          ))}
        </div>
      </Chip.Group>
      {config.horizon === 'custom' && (
        <Input
          type="date"
          aria-label="Proyectar hasta"
          min={config.startDate}
          value={config.customEnd ?? windowEnd}
          onChange={(e) => e.target.value && onChange({ customEnd: e.target.value })}
          className={styles.horizonDate}
          size="xs"
          hint="Hasta 2 años"
        />
      )}
    </div>
  )
}
