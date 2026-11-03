import { Menu, TextInput } from '@mantine/core'
import {
  IconDeviceFloppy, IconChevronDown, IconGitBranch, IconFilePlus, IconTrash, IconFolderOpen, IconCheck,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/Button/Button'
import { formatRelativeDay } from '@/lib/formatters'
import styles from './Panels.module.css'

export function ScenarioBar({
  draft, dirty, saving, scenarios, scenariosError,
  onRename, onSave, onNew, onVariant, onOpen, onDelete,
}) {
  const saved = Boolean(draft.id)
  let status = 'Borrador en este dispositivo'
  if (saved) status = dirty ? 'Cambios sin guardar' : 'Guardado'

  return (
    <div className={styles.bar}>
      <div className={styles.barName}>
        <TextInput
          value={draft.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Nombre del escenario"
          maxLength={80}
          variant="unstyled"
          classNames={{ input: styles.nameInput }}
        />
        <span className={styles.barStatus} data-dirty={dirty || !saved || undefined}>
          {saved && !dirty && <IconCheck size={13} stroke={2.4} aria-hidden="true" />}
          {status}
        </span>
      </div>

      <div className={styles.barActions}>
        <Button
          size="sm"
          variant={dirty || !saved ? 'primary' : 'secondary'}
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSave}
          loading={saving}
          disabled={!draft.name.trim()}
        >
          Guardar
        </Button>
        <Button size="sm" variant="secondary" leftSection={<IconGitBranch size={16} />} onClick={onVariant}>
          Crear variante
        </Button>
        <Menu position="bottom-end" withinPortal shadow="md" width={280}>
          <Menu.Target>
            <Button size="sm" variant="secondary" rightSection={<IconChevronDown size={14} />} aria-label="Más opciones de escenario">
              Escenarios
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconFilePlus size={16} />} onClick={onNew}>Nuevo escenario</Menu.Item>
            {saved && (
              <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={onDelete}>
                Eliminar «{draft.name}»
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Label>Guardados</Menu.Label>
            {scenariosError && <div className={styles.menuNote}>{scenariosError}</div>}
            {!scenariosError && scenarios.length === 0 && (
              <div className={styles.menuNote}>Aún no guardas escenarios.</div>
            )}
            {scenarios.map((s) => (
              <Menu.Item
                key={s.id}
                leftSection={<IconFolderOpen size={16} />}
                onClick={() => onOpen(s)}
                rightSection={<span className={styles.menuMeta}>{formatRelativeDay(s.updated_at.slice(0, 10))}</span>}
                disabled={s.id === draft.id}
              >
                {s.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  )
}
