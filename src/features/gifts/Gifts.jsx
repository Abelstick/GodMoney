import { useMemo, useState } from 'react'
import { SegmentedControl, Chip } from '@mantine/core'
import { IconGift, IconUsers, IconBulb, IconHistory, IconBellRinging } from '@tabler/icons-react'
import { useGifts } from '@/hooks/useGifts'
import { useGoals } from '@/hooks/useGoals'
import { useStore } from '@/store'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/common/Modal/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { formatCurrency } from '@/lib/formatters'
import { upcomingOccasions, historyByYear, countdownLabel, GIFT_STATUS } from '@/lib/giftPlanning'
import { OccasionCard } from './components/OccasionCard'
import { PersonCard } from './components/PersonCard'
import { GiftRow } from './components/GiftRow'
import { PersonForm } from './components/PersonForm'
import { OccasionForm } from './components/OccasionForm'
import { GiftForm } from './components/GiftForm'
import { PurchaseForm } from './components/PurchaseForm'
import { ReceivedGiftForm } from './components/ReceivedGiftForm'
import rowStyles from './components/GiftRow.module.css'
import styles from './Gifts.module.css'

const TABS = [
  { value: 'occasions', label: 'Fechas' },
  { value: 'people',    label: 'Personas' },
  { value: 'ideas',     label: 'Ideas' },
  { value: 'history',   label: 'Historial' },
]

// Columnas editables de gifts (sin las relaciones embebidas person/occasion).
const giftColumns = (g) => ({ id: g.id, title: g.title, person_id: g.person_id })

export function Gifts() {
  const {
    people, occasions, gifts, loading,
    addGiftPerson, updateGiftPerson, removeGiftPerson,
    addGiftOccasion, updateGiftOccasion, removeGiftOccasion, createOccasionSavingsGoal,
    addGift, updateGift, removeGift, purchaseGift, receiveGift,
  } = useGifts()
  const { goals } = useGoals()
  const showToast = useStore((s) => s.showToast)

  const [tab, setTab] = useState('occasions')
  const [historyFilter, setHistoryFilter] = useState('all')
  // modal = { type: 'person'|'occasion'|'gift'|'purchase'|'received', item?, defaults? }
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null) // { type, item }
  const [busy, setBusy] = useState(false)

  const upcoming = useMemo(() => upcomingOccasions(occasions), [occasions])
  const reminders = upcoming.filter(({ occasion, days }) => days <= Number(occasion.reminder_days_before ?? 14))
  const ideas = gifts.filter((g) => g.direction === 'GIVEN' && g.status !== GIFT_STATUS.DONE)
  const history = useMemo(() => historyByYear(
    gifts.filter((g) => historyFilter === 'all' || g.direction === historyFilter),
  ), [gifts, historyFilter])
  const goalsById = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g])), [goals])

  const close = () => setModal(null)

  async function run(fn) {
    setBusy(true)
    try {
      await fn()
      close()
      setDeleting(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const giftHandlers = {
    onPurchase: (g) => setModal({ type: 'purchase', item: g }),
    onPlan: (g) => setModal({ type: 'gift', item: { ...g, status: GIFT_STATUS.PLANNED } }),
    onEdit: (g) => setModal({ type: 'gift', item: g }),
    onDelete: (g) => setDeleting({ type: 'gift', item: g }),
  }

  function submitPerson(payload) {
    return run(() => (modal.item ? updateGiftPerson(modal.item.id, payload) : addGiftPerson(payload)))
  }

  function submitOccasion(payload) {
    return run(() => (modal.item ? updateGiftOccasion(modal.item.id, payload) : addGiftOccasion(payload)))
  }

  function submitGift({ gift, purchase }) {
    const id = modal.item?.id
    return run(() => {
      if (purchase) return purchaseGift({ ...(id && { id }), ...gift }, purchase)
      return id ? updateGift(id, gift) : addGift(gift)
    })
  }

  function confirmDelete() {
    const { type, item } = deleting
    const fn = { gift: removeGift, person: removeGiftPerson, occasion: removeGiftOccasion }[type]
    return run(() => fn(item.id))
  }

  const deleteCopy = deleting && {
    gift: {
      title: 'Eliminar regalo',
      description: `¿Eliminar "${deleting.item.title}"?${deleting.item.expense_id || deleting.item.income_id ? ' El movimiento que registró se mantiene; elimínalo desde Movimientos si ya no lo quieres.' : ''}`,
    },
    person: {
      title: 'Eliminar persona',
      description: `¿Eliminar a ${deleting.item.name}? Se borra su ocasión de cumpleaños; sus regalos quedan en el historial sin persona.`,
    },
    occasion: {
      title: 'Eliminar ocasión',
      description: `¿Eliminar "${deleting.item.name}"? Sus regalos quedan en el historial sin ocasión. El objetivo de ahorro, si lo creaste, no se borra.`,
    },
  }[deleting.type]

  return (
    <div>
      <PageHeader
        title="Regalos"
        subtitle="Cumpleaños, Navidad y otras fechas: cuánto gastar, cuánto ahorrar y qué regalar"
        actions={<Button onClick={() => setModal({ type: 'gift' })}>+ Nuevo regalo</Button>}
      />

      {reminders.length > 0 && (
        <section className={styles.reminders} aria-label="Fechas próximas">
          <IconBellRinging size={20} stroke={1.75} aria-hidden="true" />
          <ul>
            {reminders.map(({ occasion, days }) => (
              <li key={occasion.id}>
                <strong>{occasion.name}</strong> · {countdownLabel(days).toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SegmentedControl
        className={styles.tabs}
        fullWidth
        value={tab}
        onChange={setTab}
        data={TABS}
        aria-label="Secciones de regalos"
      />

      {loading ? (
        <div className={styles.grid}>
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
          <Skeleton className={styles.cardSkeleton} />
        </div>
      ) : (
        <>
          {tab === 'occasions' && (
            <>
              <div className={styles.toolbar}>
                <Button variant="secondary" onClick={() => setModal({ type: 'occasion' })}>+ Nueva fecha</Button>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<IconGift size={44} stroke={1.5} />}
                  title="Aún no tienes fechas"
                  description="Agrega Navidad o el cumpleaños de alguien, ponle presupuesto y te diremos cuánto apartar cada mes."
                  action={<Button onClick={() => setModal({ type: 'occasion' })}>Crear fecha</Button>}
                />
              ) : (
                <div className={styles.grid}>
                  {upcoming.map(({ occasion, ...cycle }) => (
                    <OccasionCard
                      key={occasion.id}
                      occasion={occasion}
                      cycle={cycle}
                      gifts={gifts}
                      goal={occasion.goal_id ? goalsById[occasion.goal_id] : null}
                      onAddGift={(o) => setModal({ type: 'gift', defaults: { occasion_id: o.id, person_id: o.person_id ?? '', status: GIFT_STATUS.PLANNED } })}
                      onEdit={(o) => setModal({ type: 'occasion', item: o })}
                      onDelete={(o) => setDeleting({ type: 'occasion', item: o })}
                      onCreateGoal={(o, c) => run(() => createOccasionSavingsGoal(o, c))}
                      giftHandlers={giftHandlers}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'people' && (
            <>
              <div className={styles.toolbar}>
                <Button variant="secondary" onClick={() => setModal({ type: 'person' })}>+ Nueva persona</Button>
              </div>
              {people.length === 0 ? (
                <EmptyState
                  icon={<IconUsers size={44} stroke={1.5} />}
                  title="Sin personas"
                  description="Agrega a quienes sueles regalar con su cumpleaños para recordarlo y guardar ideas."
                  action={<Button onClick={() => setModal({ type: 'person' })}>Agregar persona</Button>}
                />
              ) : (
                <div className={styles.grid}>
                  {people.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      gifts={gifts}
                      onEdit={(x) => setModal({ type: 'person', item: x })}
                      onDelete={(x) => setDeleting({ type: 'person', item: x })}
                      onAddIdea={(x) => setModal({ type: 'gift', defaults: { person_id: x.id, status: GIFT_STATUS.IDEA } })}
                      giftHandlers={giftHandlers}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'ideas' && (
            ideas.length === 0 ? (
              <EmptyState
                icon={<IconBulb size={44} stroke={1.5} />}
                title="Sin ideas pendientes"
                description="Cuando se te ocurra algo para alguien, guárdalo aquí para no olvidarlo."
                action={<Button onClick={() => setModal({ type: 'gift', defaults: { status: GIFT_STATUS.IDEA } })}>Guardar idea</Button>}
              />
            ) : (
              <div className={styles.panel}>
                <ul className={rowStyles.list}>
                  {ideas.map((g) => <GiftRow key={g.id} gift={g} showOccasion {...giftHandlers} />)}
                </ul>
              </div>
            )
          )}

          {tab === 'history' && (
            <>
              <div className={styles.toolbar}>
                <Chip.Group value={historyFilter} onChange={setHistoryFilter}>
                  <div className={styles.filters} role="radiogroup" aria-label="Filtrar historial">
                    <Chip value="all" size="sm" variant="light" radius="sm">Todos</Chip>
                    <Chip value="GIVEN" size="sm" variant="light" radius="sm">Dados</Chip>
                    <Chip value="RECEIVED" size="sm" variant="light" radius="sm">Recibidos</Chip>
                  </div>
                </Chip.Group>
                <Button variant="secondary" onClick={() => setModal({ type: 'received' })}>+ Regalo recibido</Button>
              </div>
              {history.length === 0 ? (
                <EmptyState
                  icon={<IconHistory size={44} stroke={1.5} />}
                  title="Historial vacío"
                  description="Los regalos que compres o recibas quedarán aquí, agrupados por año."
                />
              ) : (
                <div className={styles.history}>
                  {history.map((row) => (
                    <section key={row.year} className={styles.panel} aria-labelledby={`gift-year-${row.year}`}>
                      <header className={styles.yearHeader}>
                        <h2 id={`gift-year-${row.year}`}>{row.year}</h2>
                        <span>
                          {row.givenCount > 0 && <>Diste {formatCurrency(row.given)}</>}
                          {row.givenCount > 0 && row.receivedCount > 0 && ' · '}
                          {row.receivedCount > 0 && <>Recibiste {formatCurrency(row.received)}</>}
                        </span>
                      </header>
                      <ul className={rowStyles.list}>
                        {row.gifts.map((g) => <GiftRow key={g.id} gift={g} showOccasion {...giftHandlers} />)}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal isOpen={modal?.type === 'person'} onClose={close} title={modal?.item ? 'Editar persona' : 'Nueva persona'}>
        {modal?.type === 'person' && (
          <PersonForm initial={modal.item} onSubmit={submitPerson} onCancel={close} loading={busy} />
        )}
      </Modal>

      <Modal isOpen={modal?.type === 'occasion'} onClose={close} title={modal?.item ? 'Editar fecha' : 'Nueva fecha'}>
        {modal?.type === 'occasion' && (
          <OccasionForm initial={modal.item} people={people} onSubmit={submitOccasion} onCancel={close} loading={busy}
            onAddPerson={() => setModal({ type: 'person' })} />
        )}
      </Modal>

      <Modal isOpen={modal?.type === 'gift'} onClose={close} title={modal?.item?.id ? 'Editar regalo' : 'Nuevo regalo'}>
        {modal?.type === 'gift' && (
          <GiftForm initial={modal.item} defaults={modal.defaults} people={people} occasions={occasions}
            onSubmit={submitGift} onCancel={close} loading={busy} />
        )}
      </Modal>

      <Modal isOpen={modal?.type === 'purchase'} onClose={close} title="Marcar como comprado">
        {modal?.type === 'purchase' && (
          <PurchaseForm gift={modal.item} loading={busy} onCancel={close}
            onSubmit={(purchase) => run(() => purchaseGift(giftColumns(modal.item), purchase))} />
        )}
      </Modal>

      <Modal isOpen={modal?.type === 'received'} onClose={close} title="Regalo recibido">
        {modal?.type === 'received' && (
          <ReceivedGiftForm people={people} occasions={occasions} loading={busy} onCancel={close}
            onSubmit={({ gift, createIncome, category_id }) => run(() => receiveGift(gift, { createIncome, category_id }))} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={deleteCopy?.title}
        description={deleteCopy?.description}
      />
    </div>
  )
}
