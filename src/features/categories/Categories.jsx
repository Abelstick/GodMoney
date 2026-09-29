import { useState, useEffect, useCallback } from 'react'
import { Tabs, Badge, ActionIcon, Group, SimpleGrid } from '@mantine/core'
import { IconTag, IconEdit, IconTrash } from '@tabler/icons-react'
import { categoryService } from '@/services/categoryService'
import { Card }   from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal }  from '@/components/common/Modal/Modal'
import { EmptyState }    from '@/components/common/EmptyState/EmptyState'
import { Skeleton }      from '@/components/common/Skeleton/Skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { CategoryForm }   from './components/CategoryForm'
import { useStore }       from '@/store'
import styles from './Categories.module.css'

const ICONS_MAP = {
  briefcase: '💼', laptop: '💻', 'trending-up': '📈', 'plus-circle': '➕',
  home: '🏠', 'shopping-cart': '🛒', car: '🚗', heart: '❤️', music: '🎵',
  book: '📚', shirt: '👕', gift: '🎁', tag: '🏷️', target: '🎯',
  'more-horizontal': '➕', coffee: '☕', plane: '✈️', phone: '📱',
  zap: '⚡', star: '⭐', percentage: '💹',
}

const TYPES = [
  { value: 'all',     label: 'Todas'    },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Egresos'  },
  { value: 'both',    label: 'Ambos'    },
]

export function Categories() {
  const showToast = useStore((s) => s.showToast)

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [activeTab, setActiveTab]   = useState('all')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)

  const [deletingId, setDeletingId] = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const deletingCategory = categories.find((c) => c.id === deletingId)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await categoryService.getAll()
      setCategories(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = activeTab === 'all'
    ? categories
    : categories.filter((c) => c.type === activeTab || (activeTab !== 'both' && c.type === 'both'))

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) {
        const updated = await categoryService.update(editing.id, payload)
        setCategories((prev) => prev.map((c) => c.id === updated.id ? updated : c))
        showToast('Categoría actualizada', 'success')
      } else {
        const created = await categoryService.create(payload)
        setCategories((prev) => [...prev, created])
        showToast('Categoría creada', 'success')
      }
      setModalOpen(false)
      setEditing(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await categoryService.remove(deletingId)
      setCategories((prev) => prev.filter((c) => c.id !== deletingId))
      showToast('Categoría eliminada', 'success')
      setDeletingId(null)
    } catch (err) {
      showToast('No se puede eliminar: tiene registros asociados', 'error')
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(cat) {
    setEditing(cat)
    setModalOpen(true)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  const countByType = (type) =>
    type === 'all' ? categories.length : categories.filter((c) => c.type === type || (type !== 'both' && c.type === 'both')).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Categorías</h1>
          <p className={styles.subtitle}>Administra las categorías de tus ingresos y egresos</p>
        </div>
        <Button onClick={openNew}>+ Nueva categoría</Button>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab} mb="lg">
        <Tabs.List>
          {TYPES.map((t) => (
            <Tabs.Tab
              key={t.value}
              value={t.value}
              rightSection={
                <Badge size="xs" variant="light" color="violet" circle>
                  {countByType(t.value)}
                </Badge>
              }
            >
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {loading ? (
        <div className={styles.grid}>
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconTag size={44} stroke={1.5} />}
          title="Sin categorías"
          description="Crea tu primera categoría para organizar tus finanzas"
          action={<Button onClick={openNew}>Crear categoría</Button>}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filtered.map((cat) => (
            <Card key={cat.id} padded small className={styles.catCard}>
              <div className={styles.catTop}>
                <div className={styles.catIcon} style={{ background: cat.color + '20' }}>
                  <span style={{ fontSize: '1.4rem' }}>{ICONS_MAP[cat.icon] ?? '🏷️'}</span>
                </div>
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => openEdit(cat)}
                    title="Editar"
                  >
                    <IconEdit size={15} stroke={1.75} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => setDeletingId(cat.id)}
                    title="Eliminar"
                  >
                    <IconTrash size={15} stroke={1.75} />
                  </ActionIcon>
                </Group>
              </div>

              <div className={styles.catName}>{cat.name}</div>

              <div className={styles.catMeta}>
                <span className={styles.catDot} style={{ background: cat.color }} />
                <Badge
                  size="xs"
                  variant="light"
                  style={{ backgroundColor: cat.color + '20', color: cat.color, border: 'none' }}
                >
                  {cat.type === 'income' ? 'Ingreso' : cat.type === 'expense' ? 'Egreso' : 'Ambos'}
                </Badge>
                {cat.is_savings && (
                  <Badge size="xs" variant="light" color="violet">Ahorro</Badge>
                )}
                {cat.is_default && (
                  <Badge size="xs" variant="light" color="gray">Por defecto</Badge>
                )}
              </div>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Modal crear / editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <CategoryForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar categoría"
        description={
          deletingCategory
            ? `¿Eliminar la categoría "${deletingCategory.name}"? Los registros que la usen quedarán sin categoría.`
            : '¿Eliminar esta categoría? Los registros que la usen quedarán sin categoría.'
        }
      />
    </div>
  )
}
