export type CsvCell = string | number

// A text cell that starts with = + - @ can run as a formula when opened in Excel. Prefix it with an apostrophe.
function safe(cell: CsvCell) {
  if (typeof cell === 'number') return String(cell)
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
}

const quote = (cell: CsvCell) => `"${safe(cell).replace(/"/g, '""')}"`

/** The leading BOM makes Excel read Filipino characters (ñ) correctly. */
export function toCsv(rows: CsvCell[][]) {
  return '\uFEFF' + rows.map((r) => r.map(quote).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
