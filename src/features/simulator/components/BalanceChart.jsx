import { useId, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ReferenceDot,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency, formatCurrencyCompact, formatSignedCurrency } from '@/lib/formatters'
import { AXIS_PROPS, GRID_PROPS } from '@/components/common/ChartTooltip/ChartTooltip'
import { fromCents } from '@/lib/simulation/money'
import { EVENT_TYPES } from '@/lib/simulation/scenarioModel'
import styles from './Results.module.css'

const MAX_MARKERS = 6
// Un movimiento es "importante" si mueve al menos el 15 % del total de su lado.
const SIGNIFICANT_SHARE = 0.15

// Ticks "redondos" (1, 2, 2.5 o 5 × 10ⁿ) que cubren el rango y el límite.
export function niceTicks(lo, hi, count = 4) {
  if (lo === hi) { lo -= 1; hi += 1 }
  const raw = (hi - lo) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= raw)
  const start = Math.floor(lo / step) * step
  const ticks = []
  for (let v = start; v < hi + step; v += step) {
    ticks.push(Math.round(v * 100) / 100)
    if (v >= hi) break
  }
  return ticks
}

const shortDate = (iso) => format(parseISO(iso), 'd MMM', { locale: es })
const longDate = (iso) => format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es })

function BalanceTooltip({ active, payload, threshold }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const below = point.balance < threshold
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{longDate(point.date)}</p>
      <p className={styles.tooltipBalance} data-tone={point.balance < 0 ? 'danger' : below ? 'warning' : undefined}>
        {formatCurrency(point.balance)}
        {below && <span>{point.balance < 0 ? 'Saldo negativo' : 'Bajo tu límite'}</span>}
      </p>
      {point.items.length > 0 && (
        <ul className={styles.tooltipItems}>
          {point.items.slice(0, 4).map((item, i) => (
            <li key={`${item.eventId}-${i}`}>
              <span>{item.description || EVENT_TYPES[item.type].label}</span>
              <span data-sign={item.delta > 0 ? 'in' : item.delta < 0 ? 'out' : 'move'}>
                {item.delta === 0 ? formatCurrency(fromCents(item.cents)) : formatSignedCurrency(fromCents(item.delta))}
              </span>
            </li>
          ))}
          {point.items.length > 4 && <li className={styles.tooltipMore}>y {point.items.length - 4} más</li>}
        </ul>
      )}
    </div>
  )
}

// Días con los ingresos/gastos más grandes, para marcarlos sobre la línea.
function significantDays(points, key, total) {
  if (total <= 0) return []
  return points
    .filter((p) => p[key] >= total * SIGNIFICANT_SHARE)
    .sort((a, b) => b[key] - a[key])
    .slice(0, MAX_MARKERS)
}

export function BalanceChart({ points, thresholdCents }) {
  const gradientId = useId().replace(/:/g, '')

  const { data, min, max, threshold, incomes, expenses } = useMemo(() => {
    const rows = points.map((p) => ({
      date: p.date,
      balance: fromCents(p.balance),
      inflow: fromCents(p.inflow),
      outflow: fromCents(p.outflow),
      items: p.items.map((i) => ({ ...i })),
    }))
    // Solo los puntos dibujados: el gradiente se mide sobre la caja de la línea.
    const values = rows.map((r) => r.balance)
    const totalIn = rows.reduce((a, r) => a + r.inflow, 0)
    const totalOut = rows.reduce((a, r) => a + r.outflow, 0)
    return {
      data: rows,
      min: Math.min(...values),
      max: Math.max(...values),
      threshold: fromCents(thresholdCents),
      incomes: significantDays(rows, 'inflow', totalIn),
      expenses: significantDays(rows, 'outflow', totalOut),
    }
  }, [points, thresholdCents])

  if (!data.length) return null

  // Límite visible: el umbral del usuario o, si no hay, el cero.
  const limit = threshold > 0 ? threshold : 0
  const crosses = min < limit
  const domainMin = Math.min(min, limit)
  const domainMax = Math.max(max, limit)
  // La línea cambia de color justo al cruzar el límite (offset del gradiente).
  const span = domainMax - domainMin
  const splitOffset = span > 0 ? Math.min(1, Math.max(0, (domainMax - limit) / span)) : 1
  // Una línea plana tiene caja de alto 0 y un gradiente no se pintaría: color sólido.
  const flat = max === min
  const flatColor = max < limit ? 'var(--color-expense)' : 'var(--color-primary)'
  const ticks = niceTicks(domainMin, domainMax)

  return (
    <div>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={splitOffset} stopColor="var(--color-primary)" />
                <stop offset={splitOffset} stopColor="var(--color-expense)" />
              </linearGradient>
              <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
                {/* El relleno solo da volumen; la zona bajo el límite la marca ReferenceArea. */}
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={shortDate}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              {...AXIS_PROPS}
              tickFormatter={formatCurrencyCompact}
              width={64}
              ticks={ticks}
              domain={[ticks[0], ticks.at(-1)]}
            />
            {crosses && (
              <ReferenceArea y1={ticks[0]} y2={limit} fill="var(--color-expense)" fillOpacity={0.06} />
            )}
            {threshold > 0 && (
              <ReferenceLine
                y={threshold}
                stroke="var(--color-warning)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: 'Tu límite', position: 'insideTopRight', fontSize: 11, fill: 'var(--color-warning)' }}
              />
            )}
            {min < 0 && <ReferenceLine y={0} stroke="var(--color-border-strong)" strokeWidth={1} />}
            <Tooltip
              content={<BalanceTooltip threshold={threshold} />}
              cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
            />
            <Area
              type="stepAfter"
              dataKey="balance"
              name="Saldo"
              stroke={flat ? flatColor : `url(#${gradientId}-stroke)`}
              strokeWidth={2}
              fill={flat ? flatColor : `url(#${gradientId}-fill)`}
              fillOpacity={flat ? 0.08 : 1}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)', fill: 'var(--color-primary)' }}
              // Sin animación: el escalonado se recalcula con cada tecla y
              // morfearlo distrae; las cifras del resumen ya animan el cambio.
              isAnimationActive={false}
            />
            {incomes.map((p) => (
              <ReferenceDot key={`in-${p.date}`} x={p.date} y={p.balance} r={5}
                fill="var(--color-income)" stroke="var(--color-surface)" strokeWidth={2} ifOverflow="visible" />
            ))}
            {expenses.map((p) => (
              <ReferenceDot key={`out-${p.date}`} x={p.date} y={p.balance} r={5}
                fill="var(--color-expense)" stroke="var(--color-surface)" strokeWidth={2} ifOverflow="visible" />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.legendLine} /> Saldo al cierre del día</span>
        {incomes.length > 0 && <span className={styles.legendItem}><span className={styles.legendDot} data-tone="income" /> Ingreso importante</span>}
        {expenses.length > 0 && <span className={styles.legendItem}><span className={styles.legendDot} data-tone="expense" /> Gasto importante</span>}
        {threshold > 0 && <span className={styles.legendItem}><span className={styles.legendDash} /> Tu límite ({formatCurrency(threshold)})</span>}
        {crosses && <span className={styles.legendItem}><span className={styles.legendZone} /> Zona por debajo del límite</span>}
      </div>
    </div>
  )
}
