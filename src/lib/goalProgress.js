function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Cuánto de lo asignado (allocated_amount) por cada vínculo cuenta-objetivo
 * se puede "honrar" de verdad. Si el saldo real de la cuenta alcanza para
 * cubrir todo lo asignado a ella (entre todos los objetivos que la usan),
 * cada vínculo cuenta al 100%. Si no alcanza (p. ej. porque salió dinero en
 * un préstamo), se prorratea proporcionalmente entre todos los objetivos
 * que comparten esa cuenta — nadie "pierde" desproporcionadamente.
 */
export function computeAccountUsage(links) {
  const usage = {}
  for (const link of links) {
    usage[link.account_id] = (usage[link.account_id] ?? 0) + Number(link.allocated_amount)
  }
  return usage
}

export function getHonoredAmount(link, accountsById, usageByAccount) {
  const account = accountsById[link.account_id]
  if (!account) return 0

  const totalAllocated = usageByAccount[link.account_id] ?? 0
  if (totalAllocated <= 0) return 0

  const balance = Math.max(Number(account.balance), 0)
  if (balance >= totalAllocated) return Number(link.allocated_amount)

  const ratio = balance / totalAllocated
  return round2(Number(link.allocated_amount) * ratio)
}

/**
 * Monto derivado de un objetivo a partir de sus cuentas vinculadas.
 * Devuelve null si el objetivo no tiene ningún vínculo (el llamador debe
 * usar goal.current_amount manual en ese caso).
 */
export function getGoalDerivedAmount(goalId, allLinks, accountsById) {
  const goalLinks = allLinks.filter((l) => l.goal_id === goalId)
  if (!goalLinks.length) return null

  const usage = computeAccountUsage(allLinks)
  return round2(goalLinks.reduce((sum, l) => sum + getHonoredAmount(l, accountsById, usage), 0))
}

export function getAccountHeadroom(accountId, allLinks, accountsById, excludeGoalId = null) {
  const account = accountsById[accountId]
  if (!account) return 0
  const allocated = allLinks
    .filter((l) => l.account_id === accountId && l.goal_id !== excludeGoalId)
    .reduce((sum, l) => sum + Number(l.allocated_amount), 0)
  return round2(Number(account.balance) - allocated)
}
