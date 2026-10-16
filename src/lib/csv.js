// Utilidades CSV sin dependencias: lectura tolerante (comillas, saltos de línea
// dentro de celdas, separador , ; o tab) y escritura con escape correcto.

/** Detecta el separador más probable mirando la primera línea. */
export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const counts = [',', ';', '\t', '|'].map((d) => [d, firstLine.split(d).length - 1])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

/** Convierte texto CSV en matriz de filas (sin filas totalmente vacías). */
export function parseCSV(text) {
  const clean = text.replace(/^﻿/, '')
  const delimiter = detectDelimiter(clean)
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell); cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function escapeCell(value) {
  const s = String(value ?? '')
  // Evita inyección de fórmulas al abrir en Excel/Sheets
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildCSV(rows) {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\r\n')
}

export function downloadFile(content, filename, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
