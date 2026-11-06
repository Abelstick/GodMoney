import { useEffect, useMemo, useState } from 'react'
import { Input }  from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '@/components/ui/Button/Button'
import { useCategories }  from '@/hooks/useCategories'
import { budgetService }  from '@/services/budgetService'
import { BUDGET_PERIODS, CATEGORY_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import { getOverlappingBudgetNames, getSuggestionRange, suggestBudgetAmount } from '@/lib/budgetStatus'
import styles from './BudgetForm.module.css'

const EMPTY = { name: '', amount: '', category_ids: [], period: 'monthly', color: '#6366f1' }
const PER_PERIOD = { weekly: 'a la semana', monthly: 'al mes', yearly: 'al año' }

export function BudgetForm({ initial, otherBudgets = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})
  const [history, setHistory] = useState([])
  const { categories } = useCategories('expense')

  // Historial para sugerir un monto. Es una ayuda: si falla, el formulario sigue igual.
  const categoryCount = categories.length
  useEffect(() => {
    if (!categoryCount) return undefined
    let cancelled = false
    const { from, to } = getSuggestionRange()
    budgetService.getExpenseRows(categories.map((c) => c.id), from, to)
      .then((rows) => { if (!cancelled) setHistory(rows) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [categoryCount])

  const suggestion = useMemo(
    () => suggestBudgetAmount(history, form.category_ids, form.period),
    [history, form.category_ids, form.period],
  )
  const overlapping = getOverlappingBudgetNames(form.category_ids, otherBudgets)

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'El monto debe ser mayor a 0'
    if (!form.category_ids.length) errs.category_ids = 'Elige al menos una categoría para poder seguir el gasto'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name:        form.name.trim(),
      amount:      Number(form.amount),
      category_ids: form.category_ids,
      period:      form.period,
      color:       form.color,
    })
  }

  function toggleCategory(id) {
    setErrors(({ category_ids: _, ...rest }) => rest)
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter((c) => c !== id)
        : [...f.category_ids, id],
    }))
  }

  const count = form.category_ids.length
  let catHint = 'Elige una o más: sus gastos suman a este presupuesto automáticamente.'
  if (count === 1) catHint = '1 categoría en este presupuesto'
  else if (count > 1) catHint = `${count} categorías en este presupuesto`

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Nombre del presupuesto" value={form.name} onChange={set('name')}
        error={errors.name} required placeholder="Ej: Ocio mensual" />
      <div>
        <span className={styles.fieldLabel} id="budget-categories-label">Categorías</span>
        <div className={styles.catRow} role="group" aria-labelledby="budget-categories-label">
          {categories.map((c) => {
            const active = form.category_ids.includes(c.id)
            return (
              <button
                type="button"
                key={c.id}
                aria-pressed={active}
                onClick={() => toggleCategory(c.id)}
                className={`${styles.catChip} ${active ? styles.catChipActive : ''}`}
                style={active ? { borderColor: c.color, background: `color-mix(in srgb, ${c.color} 15%, transparent)` } : undefined}
              >
                <span className={styles.catDot} style={{ background: c.color }} />
                {c.name}
              </button>
            )
          })}
        </div>
        {errors.category_ids
          ? <p className={styles.error} role="alert">{errors.category_ids}</p>
          : <p className={styles.hint}>{catHint}</p>}
        {overlapping.length > 0 && (
          <p className={styles.overlap}>
            Ya hay categorías de esta selección en {overlapping.join(', ')}: su gasto contará en cada presupuesto.
          </p>
        )}
      </div>
      <Select label="Periodo" options={BUDGET_PERIODS} value={form.period} onChange={set('period')} />
      <div>
        <Input label="Monto límite" type="number" min="0" step="0.01" prefix="S/"
          value={form.amount} onChange={set('amount')} error={errors.amount} required placeholder="0.00" />
        {suggestion !== null && (
          <p className={styles.suggestion}>
            <span>Sueles gastar unos {formatCurrency(suggestion)} {PER_PERIOD[form.period]} en estas categorías.</span>
            {Number(form.amount) !== suggestion && (
              <button
                type="button"
                className={styles.useSuggestion}
                onClick={() => {
                  setErrors(({ amount: _, ...rest }) => rest)
                  setForm((f) => ({ ...f, amount: String(suggestion) }))
                }}
              >
                Usar este monto
              </button>
            )}
          </p>
        )}
      </div>
      <div>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
        <div className={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <button type="button" key={c} aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`${styles.colorSwatch} ${form.color === c ? styles.selected : ''}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear presupuesto'}
        </Button>
      </div>
    </form>
  )
}
