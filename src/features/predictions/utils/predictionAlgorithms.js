import { format, addMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Agrupación de datos por mes ────────────────────────────────────────────
export function groupByMonth(rows) {
  return rows.reduce((acc, row) => {
    const key = row.date.slice(0, 7) // 'yyyy-MM'
    acc[key] = (acc[key] ?? 0) + Number(row.amount)
    return acc
  }, {})
}

// ── Media simple ───────────────────────────────────────────────────────────
export function simpleMean(values) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ── Media móvil (ventana deslizante) ──────────────────────────────────────
// Suaviza ruido en series temporales cortas (3-6 meses).
// Retorna null para los primeros (window-1) puntos.
export function movingAverage(values, window = 3) {
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    return simpleMean(slice)
  })
}

// ── Regresión lineal simple (mínimos cuadrados) ───────────────────────────
// Devuelve { slope, intercept } para proyectar la tendencia.
export function linearRegression(values) {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 }

  const xs = values.map((_, i) => i)
  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = values.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)

  const slope     = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

// ── Proyección N meses hacia adelante ─────────────────────────────────────
export function projectMonths(values, months = 3) {
  const { slope, intercept } = linearRegression(values)
  const n = values.length
  return Array.from({ length: months }, (_, i) => {
    const x = n + i
    return Math.max(intercept + slope * x, 0)
  })
}

// ── Proyección de objetivo financiero ─────────────────────────────────────
// Dado un ahorro mensual proyectado y el gap restante de un objetivo,
// devuelve cuántos meses faltan.
export function monthsToGoal(currentAmount, targetAmount, monthlyContribution) {
  if (monthlyContribution <= 0) return Infinity
  const gap = targetAmount - currentAmount
  if (gap <= 0) return 0
  return Math.ceil(gap / monthlyContribution)
}

// ── Construcción del dataset para gráficos ────────────────────────────────
// Mezcla histórico real + proyección futura en un array unificado.
export function buildChartData(incomeRows, expenseRows, futureMonths = 3) {
  const incomeByMonth  = groupByMonth(incomeRows)
  const expenseByMonth = groupByMonth(expenseRows)

  // Unir todos los meses presentes
  const allKeys = Array.from(
    new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])
  ).sort()

  const historical = allKeys.map((key) => ({
    key,
    label:   format(parseISO(`${key}-01`), 'MMM yy', { locale: es }),
    income:  incomeByMonth[key]  ?? 0,
    expense: expenseByMonth[key] ?? 0,
    profit:  (incomeByMonth[key] ?? 0) - (expenseByMonth[key] ?? 0),
    projected: false,
  }))

  // Valores históricos para regresión
  const incomeValues  = historical.map((d) => d.income)
  const expenseValues = historical.map((d) => d.expense)

  const incomeProj  = projectMonths(incomeValues,  futureMonths)
  const expenseProj = projectMonths(expenseValues, futureMonths)

  const lastDate = parseISO(`${allKeys[allKeys.length - 1]}-01`)

  const projected = Array.from({ length: futureMonths }, (_, i) => {
    const date = addMonths(lastDate, i + 1)
    return {
      key:      format(date, 'yyyy-MM'),
      label:    format(date, 'MMM yy', { locale: es }),
      income:   Math.round(incomeProj[i]),
      expense:  Math.round(expenseProj[i]),
      profit:   Math.round(incomeProj[i] - expenseProj[i]),
      projected: true,
    }
  })

  return [...historical, ...projected]
}

// ── Moving average suavizado para overlay ─────────────────────────────────
export function smoothedSeries(chartData, field, window = 3) {
  const values = chartData.map((d) => d[field])
  const ma = movingAverage(values, window)
  return chartData.map((d, i) => ({ ...d, [`${field}MA`]: ma[i] }))
}
