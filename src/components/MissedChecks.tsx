import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCleaningMissed } from '../api/client'
import type { MissedResponse } from '../api/types'
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

function weekday(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })
}

/** One check that should have been done by a given day, and was not. */
type Entry = {
  number: string
  formCode: string
  /** Set when the check covers a span rather than a single day. */
  span: string
  /** True when nothing has been recorded since, so it is still owed today. */
  outstanding: boolean
}

type Day = { date: string; entries: Entry[] }

/**
 * The days a check did not get done.
 *
 * Organised by date rather than by boiler, because the question this answers is
 * "what was not done, and when" -- and a date is how anyone thinks about a
 * round that was skipped.
 *
 * A check done after its deadline is left out unless asked for. It happened,
 * just late, and mixing those in would bury the days nobody turned up.
 */
export function MissedChecks() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [data, setData] = useState<MissedResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const days = useMemo<Day[]>(() => {
    if (!data) return []
    const byDate = new Map<string, Entry[]>()

    for (const item of data.items) {
      for (const window of item.windows) {
        if (window.status === 'late' && !showLate) continue
        // Filed under the day it should have been done by. For the daily check
        // that is the day itself; for the rest it is the end of the interval.
        let list = byDate.get(window.to)
        if (!list) byDate.set(window.to, (list = []))
        list.push({
          number: item.number,
          formCode: item.form_code,
          span: window.from === window.to ? '' : `${showDate(window.from)} – ${showDate(window.to)}`,
          // Nothing recorded since the deadline means it is still owed today,
          // which is exactly what also puts it in the outstanding list.
          outstanding: !item.last_done || item.last_done < window.to,
        })
      }
    }

    return [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort(
          (a, b) => a.formCode.localeCompare(b.formCode) || Number(a.number) - Number(b.number),
        ),
      }))
  }, [data, showLate])

  const total = useMemo(() => days.reduce((sum, day) => sum + day.entries.length, 0), [days])

  function pick(range: number) {
    setFrom(daysAgo(range))
    setTo(today())
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Checks not done</h2>
        <div className="head-actions">
          {RANGES.map((range) => (
            <button key={range.days} type="button" className="text-button" onClick={() => pick(range.days)}>
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <p className="card-note">
        Every day a check should have happened and no record was made. Weekends and bank holidays
        are not counted for the daily check. A check covering a period is listed under the day it
        should have been done by.
      </p>

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
            {total === 0 ? (
              <strong className="ok">
                Nothing was missed between {showDate(data.from)} and {showDate(data.to)}.
              </strong>
            ) : (
              <>
                <strong className="bad">{total}</strong> check{total === 1 ? '' : 's'} not done, on{' '}
                {days.length} day{days.length === 1 ? '' : 's'}.
              </>
            )}
            {data.late > 0 && (
              <label className="missed-toggle">
                <input
                  type="checkbox"
                  checked={showLate}
                  onChange={(e) => setShowLate(e.target.checked)}
                />
                also show {data.late} done after the deadline
              </label>
            )}
          </p>

          <ul className="missed-days">
            {days.map((day) => (
              <li key={day.date}>
                <div className="missed-day">
                  <strong>{showDate(day.date)}</strong>
                  <span className="muted">{weekday(day.date)}</span>
                </div>
                <ul className="missed-entries">
                  {day.entries.map((entry, index) => (
                    <li key={`${entry.number}-${entry.formCode}-${index}`}>
                      <b>{entry.formCode}</b>
                      <span>No. {entry.number}</span>
                      {entry.span && <em>covering {entry.span}</em>}
                      {entry.outstanding && <span className="badge overdue">still not done</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
