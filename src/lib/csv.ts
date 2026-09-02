/**
 * CSV for spreadsheets, not for machines.
 *
 * Excel is the destination here, so the rules that matter are its rules:
 * quote anything containing a comma, quote or newline, and double up quotes
 * inside a value.
 */
function cell(value: unknown) {
  const text =
    value === null || value === undefined
      ? ''
      : typeof value === 'string'
        ? value
        : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]) {
  const lines = [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))]
  // CRLF, because that is what Excel writes and expects.
  return lines.join('\r\n')
}

/**
 * Hand the file to the browser. The BOM is what stops Excel mangling anything
 * non-ASCII -- boiler locations and supplier names have accents and pound
 * signs in them, and without it they arrive as mojibake.
 */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** `boilers-2026-09-02.csv` */
export function csvFilename(name: string) {
  return `${name}-${new Date().toISOString().slice(0, 10)}.csv`
}
