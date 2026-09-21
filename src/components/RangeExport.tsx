import { useState } from 'react'
import type { Boiler } from '../api/types'
import { boilerLabel, today } from '../lib/format'
import { csvFilename, downloadCsv, toCsv } from '../lib/csv'
import type { AnySource } from '../lib/rangeExport'

function startOfYear() {
  return `${today().slice(0, 4)}-01-01`
}

/**
 * Export records for some or all boilers over a date range. Unlike the
 * on-screen export, this fetches from the API, so it is not limited to the
 * day or boiler the page happens to be showing.
 */
export function RangeExport({
  boilers,
  sources,
  buttonLabel = 'Export CSV',
}: {
  boilers: Boiler[]
  sources: AnySource[]
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [sourceKey, setSourceKey] = useState(sources[0]?.key ?? '')
  const [from, setFrom] = useState(startOfYear)
  const [to, setTo] = useState(today)
  const [allBoilers, setAllBoilers] = useState(true)
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const source = sources.find((item) => item.key === sourceKey) ?? sources[0]
  const badRange = Boolean(from && to && from > to)
  const noBoilers = !allBoilers && picked.size === 0

  function toggle(id: number, checked: boolean) {
    setPicked((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function download() {
    if (!source) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const rows = (await source.load(from, to)).filter((row) => {
        if (allBoilers) return true
        const id = source.boilerId(row)
        return id !== null && picked.has(id)
      })
      rows.sort((a, b) => source.date(a).localeCompare(source.date(b)))
      if (rows.length === 0) {
        setMessage('Nothing recorded for those boilers in that date range.')
        return
      }
      const content = toCsv(
        source.columns.map((column) => column.label),
        rows.map((row) => source.columns.map((column) => column.value(row))),
      )
      downloadCsv(csvFilename(source.fileName), content)
      setMessage(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="button ghost" onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <h2>{buttonLabel}</h2>
              <button type="button" className="text-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {sources.length > 1 && (
              <label>
                Records
                <select value={source?.key} onChange={(event) => setSourceKey(event.target.value)}>
                  {sources.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="field-row">
              <label>
                From
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
            </div>
            {badRange && <p className="err">The start date is after the end date.</p>}

            <div className="view-switch">
              <button type="button" className={allBoilers ? 'on' : ''} onClick={() => setAllBoilers(true)}>
                All boilers
              </button>
              <button type="button" className={allBoilers ? '' : 'on'} onClick={() => setAllBoilers(false)}>
                Choose boilers
              </button>
            </div>

            {!allBoilers && (
              <>
                <div className="row">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPicked(new Set(boilers.map((b) => b.id)))}
                  >
                    Tick all
                  </button>
                  <button type="button" className="text-button" onClick={() => setPicked(new Set())}>
                    Tick none
                  </button>
                </div>
                <ul className="copy-list">
                  {boilers.map((boiler) => (
                    <li key={boiler.id}>
                      <label className="toolbar-toggle">
                        <input
                          type="checkbox"
                          checked={picked.has(boiler.id)}
                          onChange={(event) => toggle(boiler.id, event.target.checked)}
                        />
                        {boilerLabel(boiler)}
                        {boiler.sold_on ? ' (sold)' : ''}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="row">
              <button
                type="button"
                className="button"
                disabled={busy || badRange || noBoilers}
                onClick={() => void download()}
              >
                {busy ? 'Exporting…' : noBoilers ? 'Pick a boiler' : 'Export'}
              </button>
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {message && <p className="muted">{message}</p>}
            {error && <p className="err">{error}</p>}
            <p className="hint">
              Leave a date blank to export from the first record or up to the latest.
              {allBoilers ? ' All boilers includes records not filed against a boiler.' : ''}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
