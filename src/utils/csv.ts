function escapeCsvValue(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const csv = [headers.map(escapeCsvValue).join(',')]
    .concat(rows.map((r) => r.map(escapeCsvValue).join(',')))
    .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function toCsvAndDownload<T extends Record<string, unknown>>(
  filename: string,
  data: T[],
  columns: { key: keyof T; header: string }[]
) {
  const headers = columns.map((c) => c.header)
  const rows = data.map((row) => columns.map((c) => row[c.key] as string | number | null | undefined))
  exportToCsv(filename, headers, rows)
}
