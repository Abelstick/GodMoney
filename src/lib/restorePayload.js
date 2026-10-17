// Columnas propias de cada tabla: lo que hace falta para volver a insertar un
// registro eliminado (sin id ni los joins category / savings_account).
// Se conserva created_at para que "Deshacer" no cambie su posición en la lista.
const COMMON = ['category_id', 'amount', 'description', 'date', 'tags', 'notes', 'attachments', 'loan_payment_id', 'created_at']

const FIELDS = {
  expense: [...COMMON, 'is_fixed', 'savings_account_id'],
  income:  [...COMMON, 'is_recurring'],
}

export function toRestorePayload(kind, row) {
  const payload = {}
  for (const field of FIELDS[kind]) {
    if (row[field] !== undefined) payload[field] = row[field]
  }
  return payload
}
