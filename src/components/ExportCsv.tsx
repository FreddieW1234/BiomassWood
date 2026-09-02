import { useState } from 'react'
import { csvFilename, downloadCsv, toCsv } from '../lib/csv'

export type ExportColumn<T> = {
  key: string
  label: string
  /** What lands in the cell. Defaults to the raw value under `key`. */
  value?: (item: T) => unknown
}

/**
 * Export the rows on screen, choosing the columns first.
 *
 * Whatever is showing is what gets exported -- if sold boilers are hidden, they
 * are not in the file either -- because the alternative is a spreadsheet that
 * quietly disagrees with the page it came from.
 */
export function ExportCsv<T extends { id: number }>({
  name,
  columns,
  rows,
}: {
  name: string
  columns: ExportColumn<T>[]
  rows: T[]
}) {
  const [open, setOpen] = useState(false)
  const [keep, setKeep] = useState<Set<string>>(() => new Set(columns.map((c) => c.key)))

  const chosen = columns.filter((column) => keep.has(column.key))

  function download() {
    const content = toCsv(
      chosen.map((column) => column.label),
      rows.map((row) =>
        chosen.map((column) =>
          column.value ? column.value(row) : (row as unknown as Record<string, unknown>)[column.key],
        ),
      ),
    )
    downloadCsv(csvFilename(name), content)
    setOpen(false)
  }

  return (
    <>
      <button type="button" className="button ghost" onClick={() => setOpen(true)}>
        Export CSV
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <h2>Export CSV</h2>
              <button type="button" className="text-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="muted">
              {rows.length} row{rows.length === 1 ? '' : 's'}, as they are showing now. Tick the
              columns the file should have.
            </p>

            <div className="row">
              <button
                type="button"
                className="text-button"
                onClick={() => setKeep(new Set(columns.map((c) => c.key)))}
              >
                Tick all
              </button>
              <button type="button" className="text-button" onClick={() => setKeep(new Set())}>
                Tick none
              </button>
            </div>

            <ul className="copy-list">
              {columns.map((column) => (
                <li key={column.key}>
                  <label className="toolbar-toggle">
                    <input
                      type="checkbox"
                      checked={keep.has(column.key)}
                      onChange={(event) =>
                        setKeep((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(column.key)
                          else next.delete(column.key)
                          return next
                        })
                      }
                    />
                    {column.label}
                  </label>
                </li>
              ))}
            </ul>

            <div className="row">
              <button
                type="button"
                className="button"
                disabled={chosen.length === 0 || rows.length === 0}
                onClick={download}
              >
                {chosen.length === 0
                  ? 'Pick a column'
                  : `Export ${chosen.length} column${chosen.length === 1 ? '' : 's'}`}
              </button>
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
