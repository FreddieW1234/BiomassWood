import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCleaningMissed } from '../api/client'
import type { MissedItem, MissedResponse } from '../api/types'
import { showDate } from '../lib/format'

/** Handy spans to look back over, rather than typing two dates every time. */
const RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

/** Windows are a single day for C1 and a span for everything else. */
function spanOf(from: string, to: string) {
  return from === to ? showDate(from) : `${showDate(from)} – ${showDate(to)}`
}

/**
 * Which checks were owed and never recorded.
 *
 * The day's round says what is outstanding now. This is the other direction:
 * over a period, which boiler was owed which check and has no record of it.
 * Checks that were merely done late are counted apart from those never done at
 * all, so a monthly check that slipped by a day does not hide a real gap.
 */
export function MissedChecks() {
  const [from, setFrom] = useState(daysAgo(90))
  const [to, setTo] = useState(today())
  const [data, setData] = useState<MissedResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string>('')
  const [showLate, setShowLate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getCleaningMissed(from, to)
      setData(result.data)
    } catch {
      setError('Could not work out the missed checks. Check the connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!data) return []
    return showLate ? data.items : data.items.filter((item) => item.missed > 0)
  }, [data, showLate])

  function pick(days: number) {
    setFrom(daysAgo(days))
    setTo(today())
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Missed checks</h2>
        <div className="head-actions">
          {RANGES.map((range) => (
            <button key={range.days} type="button" className="text-button" onClick={() => pick(range.days)}>
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="missed-range">
        <label>
          <span>From</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="button ghost" onClick={() => void load()} disabled={loading}>
          {loading ? 'Working…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && !error && (
        <>
          <p className="missed-summary">
            {data.total === 0 ? (
              <strong className="ok">Nothing missed between {showDate(data.from)} and {showDate(data.to)}.</strong>
            ) : (
              <>
                <strong className="bad">{data.total}</strong> check{data.total === 1 ? '' : 's'} never
                recorded, across {data.boilers} boiler{data.boilers === 1 ? '' : 's'}, between{' '}
                {showDate(data.from)} and {showDate(data.to)}.
              </>
            )}
            {data.late > 0 && (
              <>
                {' '}
                <label className="missed-toggle">
                  <input
                    type="checkbox"
                    checked={showLate}
                    onChange={(e) => setShowLate(e.target.checked)}
                  />
                  also show {data.late} done late
                </label>
              </>
            )}
          </p>

          {rows.length > 0 && (
            <div className="table-wrap">
              <table className="ledger missed-table">
                <thead>
                  <tr>
                    <th>Boiler</th>
                    <th>Check</th>
                    <th className="num">Missed</th>
                    {showLate && <th className="num">Late</th>}
                    <th>When</th>
                    <th>Last done</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const key = `${item.boiler_id}|${item.form_code}`
                    const expanded = open === key
                    return (
                      <MissedRow
                        key={key}
                        item={item}
                        expanded={expanded}
                        showLate={showLate}
                        onToggle={() => setOpen(expanded ? '' : key)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MissedRow({
  item,
  expanded,
  showLate,
  onToggle,
}: {
  item: MissedItem
  expanded: boolean
  showLate: boolean
  onToggle: () => void
}) {
  const windows = showLate ? item.windows : item.windows.filter((w) => w.status === 'missed')
  const span =
    item.missed === 0
      ? '—'
      : item.first_missed === item.last_missed
        ? showDate(item.first_missed)
        : `${showDate(item.first_missed)} – ${showDate(item.last_missed)}`

  return (
    <>
      {/* data-label drives the stacked card layout the tables fall back to on
          a phone; without it every value loses the column it belonged to. */}
      <tr className={item.missed > 0 ? 'has-gap' : ''}>
        <td data-label="Boiler">No. {item.number}</td>
        <td data-label="Check">
          <strong>{item.form_code}</strong>
        </td>
        <td className="num" data-label="Missed">
          {item.missed > 0 ? <span className="bad">{item.missed}</span> : '—'}
        </td>
        {showLate && (
          <td className="num" data-label="Late">
            {item.late || '—'}
          </td>
        )}
        <td data-label="When">{span}</td>
        <td data-label="Last done">
          {item.last_done ? showDate(item.last_done) : <span className="muted">never</span>}
        </td>
        <td className="right">
          <button type="button" className="text-button" onClick={onToggle}>
            {expanded ? 'Hide' : `Show ${windows.length}`}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="missed-detail">
          <td colSpan={showLate ? 7 : 6}>
            <ul>
              {windows.map((w) => (
                <li key={`${w.from}|${w.to}`} className={w.status}>
                  {spanOf(w.from, w.to)}
                  {w.status === 'late' && (
                    <em>
                      {' '}
                      done {showDate(w.covered_on)}, {w.days_late} day
                      {w.days_late === 1 ? '' : 's'} late
                    </em>
                  )}
                </li>
              ))}
            </ul>
            {item.truncated && (
              <p className="muted">
                Only the first {item.windows.length} are listed. Narrow the dates to see the rest.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
