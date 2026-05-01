import { GoogleGenAI } from '@google/genai'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const MODEL = 'gemini-3.1-flash-lite-preview'

// Cache 2 min para no repetir queries a Supabase en cada mensaje
const ctxCache = new Map()

function groupByCategory(items, total) {
  const map = {}
  for (const item of items) {
    const cat = item.categories?.name ?? 'Sin categoría'
    if (!map[cat]) map[cat] = { total: 0, count: 0 }
    map[cat].total += Number(item.amount)
    map[cat].count++
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([name, { total: subtotal, count }]) => ({
      name,
      subtotal,
      count,
      pct: total > 0 ? Math.round((subtotal / total) * 100) : 0,
    }))
}

async function getFinancialContext(userId) {
  const now    = Date.now()
  const cached = ctxCache.get(userId)
  if (cached && now - cached.ts < 120_000) return cached.data

  const month = format(new Date(), 'yyyy-MM')

  const [incRes, expRes, goalRes, budRes] = await Promise.all([
    supabase
      .from('incomes')
      .select('amount, categories(name)')
      .eq('user_id', userId)
      .gte('date', `${month}-01`),
    supabase
      .from('expenses')
      .select('amount, categories(name)')
      .eq('user_id', userId)
      .gte('date', `${month}-01`),
    supabase
      .from('goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', userId),
    supabase
      .from('budgets')
      .select('name, amount')
      .eq('user_id', userId),
  ])

  const incomes  = incRes.data  || []
  const expenses = expRes.data  || []

  const totalIncome  = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const data = {
    month,
    totalIncome,
    totalExpense,
    balance:        totalIncome - totalExpense,
    incomesBycat:   groupByCategory(incomes,  totalIncome),
    expensesByCat:  groupByCategory(expenses, totalExpense),
    goals:          goalRes.data || [],
    budgets:        budRes.data  || [],
  }

  ctxCache.set(userId, { data, ts: now })
  return data
}

const s   = (n) => `S/ ${Number(n).toFixed(2)}`
const pct = (n) => `${n}%`

function buildSystemInstruction(ctx) {
  const balanceTag = ctx.balance >= 0
    ? `${s(ctx.balance)} superávit`
    : `${s(Math.abs(ctx.balance))} DÉFICIT ⚠`

  const rows = (items, fn) =>
    items.length ? items.map(fn).join('\n') : '  (sin registros)'

  const incomeRows = rows(
    ctx.incomesBycat,
    (c) => `  • ${c.name}: ${s(c.subtotal)} (${c.count} mov., ${pct(c.pct)} del ingreso)`
  )

  const expenseRows = rows(
    ctx.expensesByCat,
    (c) => `  • ${c.name}: ${s(c.subtotal)} (${c.count} mov., ${pct(c.pct)} del gasto)`
  )

  const goalRows = rows(
    ctx.goals,
    (g) => {
      const progress = g.target_amount > 0
        ? Math.round((g.current_amount / g.target_amount) * 100)
        : 0
      return `  • ${g.name}: ${s(g.current_amount)} / ${s(g.target_amount)} (${pct(progress)})`
    }
  )

  const budgetRows = rows(
    ctx.budgets,
    (b) => `  • ${b.name}: ${s(b.amount)}`
  )

  return `Eres GodMoney AI, asesor financiero personal dentro de la app GodMoney.
Idioma: español. Tono: directo, amigable, sin rodeos. Longitud: máx 3 párrafos cortos. Cifras: siempre con S/.

── RESUMEN ${ctx.month} ──
Ingresos: ${s(ctx.totalIncome)} | Gastos: ${s(ctx.totalExpense)} | Balance: ${balanceTag}

Ingresos por categoría:
${incomeRows}

Gastos por categoría (mayor a menor):
${expenseRows}

Objetivos de ahorro:
${goalRows}

Presupuestos activos:
${budgetRows}

Reglas:
- Usa solo los datos anteriores; no inventes cifras.
- Si no hay datos suficientes, dilo en una sola línea.
- No repitas el resumen completo; menciona solo lo relevante para la pregunta.`
}

export async function askGemini(apiKey, chatHistory, userId) {
  const ctx = await getFinancialContext(userId)
  const ai  = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: buildSystemInstruction(ctx),
      temperature:       0.5,
      maxOutputTokens:   600,
    },
    contents: chatHistory.map((m) => ({
      role:  m.role,
      parts: [{ text: m.text }],
    })),
  })

  return response.text ?? 'Sin respuesta'
}
