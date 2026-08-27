import { useState } from 'react'
import { useCreditScore } from '@/hooks/useCreditScore'
import { Button } from '@/components/ui/Button/Button'
import { Card } from '@/components/ui/Card/Card'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Badge } from '@/components/ui/Badge/Badge'
import { Modal } from '@/components/common/Modal/Modal'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { formatDate } from '@/lib/formatters'
import { getCreditScoreCategory, CREDIT_SCORE_RANGES } from '@/lib/creditScoreStatus'
import { CreditScoreChart } from './components/CreditScoreChart'
import { CreditScoreForm } from './components/CreditScoreForm'
import { CreditScoreList } from './components/CreditScoreList'
import styles from './CreditScore.module.css'

export function CreditScore() {
  const {
    creditScores, loading, latest, delta, chartData,
    addCreditScore, updateCreditScore, removeCreditScore,
  } = useCreditScore()

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) await updateCreditScore(editing.id, payload)
      else         await addCreditScore(payload)
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await removeCreditScore(deletingId)
      setDeletingId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Score crediticio</h1>
          <p className={styles.subtitle}>Registra cada actualización para ver si estás mejorando</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nuevo registro</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : creditScores.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Sin registros de score"
          description="Agrega tu primera lectura para empezar a ver tu evolución"
          action={<Button onClick={() => setModalOpen(true)}>Registrar score</Button>}
        />
      ) : (
        <>
          <Card className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.heroLabel}>Score actual</span>
              <Badge color={getCreditScoreCategory(latest.score).color} withDot>
                {getCreditScoreCategory(latest.score).label}
              </Badge>
            </div>
            <div className={styles.heroScore} style={{ color: getCreditScoreCategory(latest.score).color }}>
              {latest.score}
            </div>
            {delta !== null && delta !== 0 && (
              <div className={`${styles.heroTrend} ${delta > 0 ? styles.up : styles.down}`}>
                {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} vs. el registro anterior
              </div>
            )}
            <div className={styles.rangeLegend}>
              {CREDIT_SCORE_RANGES.map((r) => (
                <span key={r.label} className={styles.rangeChip} style={{ '--range-color': r.color }}>
                  {r.label} ({r.min}–{r.max})
                </span>
              ))}
            </div>
          </Card>

          <div className={styles.statsGrid}>
            <StatCard
              label="Última actualización"
              amount={formatDate(latest.recorded_date)}
              icon="📅"
              iconBg="rgba(245,158,11,0.12)"
            />
            <StatCard
              label="Lecturas registradas"
              amount={creditScores.length}
              icon="🗂️"
              iconBg="rgba(16,185,129,0.12)"
            />
          </div>

          <Card className={styles.chartCard}>
            <Card.Header>Evolución</Card.Header>
            <CreditScoreChart data={chartData} />
          </Card>

          <Card>
            <Card.Header>Historial</Card.Header>
            <CreditScoreList
              entries={creditScores}
              onEdit={(entry) => { setEditing(entry); setModalOpen(true) }}
              onDelete={(id) => setDeletingId(id)}
            />
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Eliminar registro"
        description="¿Eliminar esta lectura de score? Esta acción no se puede deshacer."
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar registro' : 'Nuevo registro de score'}
      >
        <CreditScoreForm
          initial={editing ? {
            score: String(editing.score),
            recorded_date: editing.recorded_date,
            source: editing.source ?? '',
            notes: editing.notes ?? '',
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
