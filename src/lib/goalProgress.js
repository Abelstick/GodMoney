function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Cómo un objetivo toma dinero de una cuenta vinculada:
//   FIXED -> un monto fijo (allocated_amount): "de esta cuenta, S/ 500 son
//            para el viaje".
//   ALL   -> todo lo que quede en la cuenta tras los montos fijos de otros
//            objetivos: "esta cuenta de ahorros ES el fondo del viaje". Crece
//            solo cada vez que le metes dinero a la cuenta.
export const ALLOCATION_MODE = {
  FIXED: 'FIXED',
  ALL:   'ALL',
}

export function getLinkMode(link) {
  return link.allocation_mode === ALLOCATION_MODE.ALL ? ALLOCATION_MODE.ALL : ALLOCATION_MODE.FIXED
}

/**
 * Reparte el saldo real de cada cuenta entre los vínculos que la usan y
 * devuelve { [linkId]: montoHonrado }.
 *
 * 1. Primero se cubren los vínculos FIXED. Si el saldo no alcanza (p. ej.
 *    porque salió dinero en un préstamo), se prorratean proporcionalmente
 *    entre todos los objetivos que comparten la cuenta — nadie "pierde"
 *    desproporcionadamente.
 * 2. Lo que sobra se reparte en partes iguales entre los vínculos ALL.
 */
export function resolveAllocations(allLinks, accountsById) {
  const byAccount = {}
  for (const link of allLinks) {
    ;(byAccount[link.account_id] ??= []).push(link)
  }

  const honored = {}
  for (const [accountId, links] of Object.entries(byAccount)) {
    const account = accountsById[accountId]
    const balance = account ? Math.max(Number(account.balance), 0) : 0

    const fixed = links.filter((l) => getLinkMode(l) === ALLOCATION_MODE.FIXED)
    const all   = links.filter((l) => getLinkMode(l) === ALLOCATION_MODE.ALL)

    const totalFixed = fixed.reduce((sum, l) => sum + Number(l.allocated_amount), 0)
    const ratio = totalFixed > 0 ? Math.min(balance / totalFixed, 1) : 0
    for (const l of fixed) honored[l.id] = round2(Number(l.allocated_amount) * ratio)

    const leftover = Math.max(balance - totalFixed, 0)
    for (const l of all) honored[l.id] = round2(leftover / all.length)
  }
  return honored
}

/**
 * Monto derivado de un objetivo a partir de sus cuentas vinculadas.
 * Devuelve null si el objetivo no tiene ningún vínculo (el llamador debe
 * usar goal.current_amount manual en ese caso).
 */
export function getGoalDerivedAmount(goalId, allLinks, accountsById) {
  const goalLinks = allLinks.filter((l) => l.goal_id === goalId)
  if (!goalLinks.length) return null

  const honored = resolveAllocations(allLinks, accountsById)
  return round2(goalLinks.reduce((sum, l) => sum + (honored[l.id] ?? 0), 0))
}

/**
 * Saldo de la cuenta que no está comprometido en montos fijos de OTROS
 * objetivos. Los vínculos ALL no cuentan: solo toman lo que sobra.
 */
export function getAccountHeadroom(accountId, allLinks, accountsById, excludeGoalId = null) {
  const account = accountsById[accountId]
  if (!account) return 0
  const allocated = allLinks
    .filter((l) => l.account_id === accountId && l.goal_id !== excludeGoalId && getLinkMode(l) === ALLOCATION_MODE.FIXED)
    .reduce((sum, l) => sum + Number(l.allocated_amount), 0)
  return round2(Number(account.balance) - allocated)
}
