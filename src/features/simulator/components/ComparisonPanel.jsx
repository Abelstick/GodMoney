import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { IconScale } from '@tabler/icons-react'
import { Card } from '@/components/ui/Card/Card'
import { Select } from '@/components/ui/Select/Select'
import { Money } from '@/components/ui/Money/Money'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { ChartTooltip, AXIS_PROPS, GRID_PROPS } from '@/components/common/ChartTooltip/ChartTooltip'
import { compareScenarios } from '@/lib/simulation/comparison'
import { formatCurrency, formatCurrencyCompact, formatSignedCurrency } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import styles from './Panels.module.css'

// A en gris con trazo discontinuo y B en índigo sólido: se distinguen por
// color y por trazo (no solo por color).
const SERIES = {
  a: { color: 'var(--color-text-muted)', dash: '6 4' },
  b: { color: 'var(--color-primary)', dash: undefined },
}

const shortDate = (iso) => format(parseISO(iso), 'd MMM', { locale: es })

function Headline({ diff, nameA, nameB }) {
  if (diff.final === 0 && diff.min === 0) {
    return <p className={styles.headline}>Ambos escenarios terminan con el mismo saldo.</p>
  }
  const more = diff.final > 0
  return (
    <p className={styles.headline}>
      Con <strong>«{nameB}»</strong> terminarías con{' '}
      <strong className={more ? styles.positive : styles.negative}>
        {formatCurrency(fromCents(Math.abs(diff.final)))} {more ? 'más' : 'menos'}
      </strong>{' '}
      que con «{nameA}».
      {diff.min !== 0 && (
        <> Tu peor momento sería {formatCurrency(fromCents(Math.abs(diff.min)))} {diff.min > 0 ? 'mejor' : 'peor'}.</>
      )}
    </p>
  )
}

function DiffCell({ cents }) {
  if (cents === null) return <span className={styles.muted}>—</span>
  if (cents === 0) return <span className={styles.muted}>Igual</span>
  return <span className={cents > 0 ? styles.positive : styles.negative}>{formatSignedCurrency(fromCents(cents))}</span>
}

export function ComparisonPanel({ options, aKey, bKey, onChange, window }) {
  const a = options.find((o) => o.key === aKey)
  const b = options.find((o) => o.key === bKey)
  const selectOptions = options.map((o) => ({ value: o.key, label: o.label }))

  const comparison = useMemo(
    () => (a && b && a.key !== b.key ? compareScenarios(a.scenario, b.scenario, window) : null),
    [a, b, window],
  )

  const chartData = useMemo(() => comparison?.series.map((r) => ({
    date: r.date, a: fromCents(r.a), b: r.b === null ? null : fromCents(r.b),
  })) ?? [], [comparison])

  return (
    <Card className={styles.compareCard}>
      <div className={styles.compareHead}>
        <div>
          <h2 className={styles.sectionTitle}>Comparar escenarios</h2>
          <p className={styles.sectionSub}>Misma ventana de fechas, cada uno con su saldo y sus movimientos</p>
        </div>
      </div>

      {options.length < 2 ? (
        <EmptyState
          compact
          icon={<IconScale size={28} stroke={1.5} />}
          title="Necesitas dos versiones para comparar"
          description="Usa «Crear variante»: copia este escenario para que pruebes, por ejemplo, comprar el celular o no."
        />
      ) : (
        <>
          <div className={styles.pickers}>
            <Select label="Escenario A" options={selectOptions} value={aKey} onChange={(e) => onChange({ a: e.target.value, b: bKey })} />
            <Select label="Escenario B" options={selectOptions} value={bKey} onChange={(e) => onChange({ a: aKey, b: e.target.value })} />
          </div>

          {!comparison ? (
            <p className={styles.sectionSub}>Elige dos escenarios distintos.</p>
          ) : (
            <>
              <Headline diff={comparison.diff} nameA={a.label} nameB={b.label} />

              <div className={styles.compareCards}>
                {[['a', a, comparison.a], ['b', b, comparison.b]].map(([key, option, run]) => (
                  <div key={key} className={styles.compareCardItem} data-series={key}>
                    <span className={styles.compareTag}>
                      <span className={styles.seriesSwatch} data-series={key} aria-hidden="true" />
                      {key.toUpperCase()} · {option.label}
                    </span>
                    <Money value={fromCents(run.summary.final)} className={styles.compareFinal} tone={run.summary.final < 0 ? 'expense' : 'neutral'} />
                    <span className={styles.compareMeta}>
                      Mínimo {formatCurrency(fromCents(run.summary.min.balance))} · Gastos {formatCurrency(fromCents(run.summary.outflow))}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.compareChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={shortDate} minTickGap={28} />
                    <YAxis {...AXIS_PROPS} tickFormatter={formatCurrencyCompact} width={64} tickCount={4} />
                    <Tooltip
                      content={<ChartTooltip labelFormatter={(d) => format(parseISO(d), "d 'de' MMMM", { locale: es })} />}
                      cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
                    />
                    <Line type="stepAfter" dataKey="a" name={`A · ${a.label}`} stroke={SERIES.a.color} strokeDasharray={SERIES.a.dash} strokeWidth={2} dot={false} />
                    <Line type="stepAfter" dataKey="b" name={`B · ${b.label}`} stroke={SERIES.b.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.compareLegend}>
                <span><span className={styles.legendLineA} /> A · {a.label}</span>
                <span><span className={styles.legendLineB} /> B · {b.label}</span>
              </div>

              <table className={styles.compareTable}>
                <caption className={styles.srOnly}>Saldo proyectado por período en cada escenario</caption>
                <thead>
                  <tr><th scope="col">Período</th><th scope="col">A</th><th scope="col">B</th><th scope="col">B − A</th></tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.a === null ? '—' : formatCurrency(fromCents(row.a))}</td>
                      <td>{row.b === null ? '—' : formatCurrency(fromCents(row.b))}</td>
                      <td><DiffCell cents={row.diff} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </Card>
  )
}
