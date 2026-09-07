import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  cleaningApi,
  earningsApi,
  getAlerts,
  getCleaningDue,
  getCleaningMissed,
  maintenanceApi,
  meterReadingsApi,
} from '../api/client'
import type {
  AlertItem,
  CleaningDueItem,
  CleaningEntry,
  EarningEntry,
  MaintenanceEntry,
  MeterReading,
  MissedResponse,
} from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useBoilers } from '../hooks/useBoilers'
import { boilerLabel, figure, money, showDate, today } from '../lib/format'
import { ALERT_LINKS } from '../lib/options'

type DueItem = {
  /** The check itself -- "C1" and the like -- or "Maintenance". */
  kind: string
  link: string
  boiler: string
  due: string
}

/** How far back the dashboard glances for gaps; the full report lives on the
 *  Cleaning page, where the range can be changed. */
const MISSED_DAYS = 30

/** How far past its day a check now is, which reads better than a bare date. */
function daysLate(due: string) {
  return Math.max(1, Math.round((Date.now() - Date.parse(`${due}T00:00:00`)) / 86400000))
}

function weekday(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

type ActivityItem = {
  kind: string
  link: string
  date: string
  id: number
  text: string
}

export function Dashboard() {
  const { visible: boilers, byId } = useBoilers()
  const { isAdmin } = useAuth()
  const [cleaning, setCleaning] = useState<CleaningEntry[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceEntry[]>([])
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [earnings, setEarnings] = useState<EarningEntry[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [dueNow, setDueNow] = useState<CleaningDueItem[]>([])
  const [missed, setMissed] = useState<MissedResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // These tables run to tens of thousands of rows; the dashboard only ever
    // shows the newest handful, and overdue work comes from /api/alerts.
    Promise.all([
      cleaningApi.list({ limit: 200 }),
      maintenanceApi.list({ limit: 200 }),
      meterReadingsApi.list({ limit: 200 }),
      earningsApi.list({ limit: 200 }),
      getAlerts().catch(() => ({ data: { items: [] as AlertItem[] } })),
      // Which check each boiler owes, worked out on the server. Reading it off
      // whichever cleaning row happened to come back first could not say which
      // of C1-C7 was meant.
      getCleaningDue(today()).catch(() => ({ data: { items: [] as CleaningDueItem[] } })),
    ])
      .then(([c, m, r, e, a, d]) => {
        if (cancelled) return
        setCleaning(c.data.items)
        setMaintenance(m.data.items)
        setReadings(r.data.items)
        setEarnings(e.data.items)
        setAlerts(a.data.items)
        setDueNow(d.data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Separate from the rest: staff are not shown this, and it is the one call
  // that walks history rather than reading the top of a table.
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    getCleaningMissed(daysAgo(MISSED_DAYS), today())
      .then((result) => {
        if (!cancelled) setMissed(result.data)
      })
      .catch(() => {
        // The dashboard is still useful without it; the Cleaning page reports
        // the failure properly.
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const dueItems = useMemo(() => {
    const items: DueItem[] = []

    // Cleaning comes from the server, which knows the interval of every check
    // and so can name the one that is owed.
    for (const item of dueNow) {
      items.push({
        kind: item.form_code,
        link: '/cleaning',
        boiler: boilerLabel(byId.get(item.boiler_id)),
        due: item.next_due || today(),
      })
    }

    // Maintenance has no per-kind schedule, so the newest next_due per boiler
    // is still the best available answer.
    const seen = new Set<string>()
    for (const entry of maintenance as MaintenanceEntry[]) {
      const key = String(entry.boiler_id ?? 'general')
      if (seen.has(key)) continue
      seen.add(key)
      if (!entry.next_due) continue
      items.push({
        kind: 'Maintenance',
        link: '/maintenance',
        boiler: entry.boiler_id === null ? 'General' : boilerLabel(byId.get(entry.boiler_id)),
        due: entry.next_due,
      })
    }

    return items.sort((a, b) => (a.due < b.due ? -1 : 1))
  }, [dueNow, maintenance, byId])

  const overdueCount = useMemo(
    () => dueItems.filter((item) => item.due < today()).length,
    [dueItems],
  )

  // Grouped by the day each check should have been done by, which is the way
  // the question gets asked: what did not get done, and when.
  const missedDays = useMemo(() => {
    const byDate = new Map<string, { number: string; formCode: string }[]>()
    for (const item of missed?.items ?? []) {
      for (const window of item.windows) {
        if (window.status === 'late') continue
        let list = byDate.get(window.to)
        if (!list) byDate.set(window.to, (list = []))
        list.push({ number: item.number, formCode: item.form_code })
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
  }, [missed])

  const ytdEarnings = useMemo(() => {
    const year = today().slice(0, 4)
    return earnings.filter((e) => e.date.startsWith(year)).reduce((sum, e) => sum + e.amount, 0)
  }, [earnings])

  const latestReadings = useMemo(() => {
    const map = new Map<number, MeterReading>()
    for (const reading of readings) {
      if (!map.has(reading.boiler_id)) map.set(reading.boiler_id, reading)
    }
    return map
  }, [readings])

  const activity = useMemo(() => {
    const items: ActivityItem[] = []
    for (const e of cleaning)
      items.push({ kind: 'Cleaning', link: '/cleaning', date: e.date, id: e.id, text: e.work_done })
    for (const e of maintenance)
      items.push({ kind: 'Maintenance', link: '/maintenance', date: e.date, id: e.id, text: e.work_done })
    for (const r of readings)
      items.push({
        kind: 'Meter reading',
        link: '/meter-readings',
        date: r.date,
        id: r.id,
        text: `${boilerLabel(byId.get(r.boiler_id))} → ${figure(r.reading)}`,
      })
    for (const e of earnings)
      items.push({
        kind: 'Earnings',
        link: '/earnings',
        date: e.date,
        id: e.id,
        text: `${e.scheme} ${money(e.amount)}`,
      })
    return items.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)).slice(0, 8)
  }, [cleaning, maintenance, readings, earnings, byId])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      {error && <p className="err">{error}</p>}

      <div className="stat-row">
        <Link className="stat" to="/boilers">
          <span className="stat-label">Boilers</span>
          <span className="stat-value">{boilers.length}</span>
        </Link>
        <div className={`stat${overdueCount > 0 ? ' alert' : ''}`}>
          <span className="stat-label">Overdue checks</span>
          <span className="stat-value">{overdueCount}</span>
        </div>
        <Link className="stat" to="/earnings">
          <span className="stat-label">Earnings {today().slice(0, 4)}</span>
          <span className="stat-value">{money(ytdEarnings)}</span>
        </Link>
        <Link className="stat" to="/meter-readings">
          <span className="stat-label">Meter readings</span>
          <span className="stat-value">{readings.length}</span>
        </Link>
        <div className={`stat${alerts.length > 0 ? ' alert' : ''}`}>
          <span className="stat-label">Compliance alerts</span>
          <span className="stat-value">{alerts.length}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Needs attention</h2>
            <span className="count">{alerts.length}</span>
          </div>
          <ul className="due-list">
            {alerts.slice(0, 12).map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link to={ALERT_LINKS[item.resource] || '/'} className="due-kind">
                  {item.kind.replaceAll('_', ' ')}
                </Link>
                <span className="due-boiler">{item.text}</span>
                <span className={`due-date${item.due && item.due < today() ? ' overdue-text' : ''}`}>
                  {item.due ? showDate(item.due) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What was owed and never recorded, which "checks due" cannot show: once
          a day has passed, nothing is due for it any more. Admin only. */}
      {isAdmin && missed && (
        <section className="card">
          <div className="card-head">
            <h2>Checks not done</h2>
            <div className="head-actions">
              <span className="muted">last {MISSED_DAYS} days</span>
              <Link to="/cleaning" className="text-button">
                Full report
              </Link>
            </div>
          </div>
          <p className="card-note">
            Days that went by with no record made. Some were caught up on afterwards, so these do
            not all appear in the list above.
          </p>
          {missed.total === 0 ? (
            <p className="muted">
              Nothing missed since {showDate(missed.from)}. Every check has a record against it.
            </p>
          ) : (
            <>
              <p className="missed-summary">
                <strong className="bad">{missed.total}</strong> check
                {missed.total === 1 ? '' : 's'} not done, on {missedDays.length} day
                {missedDays.length === 1 ? '' : 's'}, since {showDate(missed.from)}.
              </p>
              <ul className="missed-days">
                {missedDays.slice(0, 4).map((day) => (
                  <li key={day.date}>
                    <div className="missed-day">
                      <strong>{showDate(day.date)}</strong>
                      <span className="muted">{weekday(day.date)}</span>
                    </div>
                    <ul className="missed-entries">
                      {day.entries.map((entry, index) => (
                        <li key={index}>
                          <b>{entry.formCode}</b>
                          <span>No. {entry.number}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="split even">
        <section className="card">
          <div className="card-head">
            {/* Overdue work sorts to the top of this list, so calling the whole
                card "upcoming" put a past date under a future heading. */}
            <h2>Still to do</h2>
            {overdueCount > 0 && <span className="count">{overdueCount} late</span>}
          </div>
          <p className="card-note">
            Checks not done yet. The date is the day each one should have been done by, so a date
            in the past means it is still outstanding.
          </p>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : dueItems.length === 0 ? (
            <p className="muted">Nothing due. Every check is inside its interval.</p>
          ) : (
            <ul className="due-list">
              {dueItems.slice(0, 8).map((item, index) => (
                <li key={index}>
                  <Link to={item.link} className="due-kind">
                    {item.kind}
                  </Link>
                  <span className="due-boiler">{item.boiler}</span>
                  <span className={`due-date${item.due < today() ? ' overdue-text' : ''}`}>
                    {showDate(item.due)}
                    {item.due < today() && (
                      <span className="badge overdue">{daysLate(item.due)} days late</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Latest meter readings</h2>
          </div>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : boilers.length === 0 ? (
            <p className="muted">
              No boilers registered yet. Start on the <Link to="/boilers">Boilers page</Link>.
            </p>
          ) : (
            <ul className="due-list">
              {boilers.map((boiler) => {
                const reading = latestReadings.get(boiler.id)
                return (
                  <li key={boiler.id}>
                    <span className="due-kind">No. {boiler.number}</span>
                    <span className="due-boiler">{boiler.type}</span>
                    <span className="due-date">
                      {reading ? `${figure(reading.reading)} · ${showDate(reading.date)}` : 'No reading yet'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recent activity</h2>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="muted">No records yet — use the pages on the left to add the first ones.</p>
        ) : (
          <ul className="activity-list">
            {activity.map((item, index) => (
              <li key={index}>
                <span className="activity-date">{showDate(item.date)}</span>
                <Link to={item.link} className="activity-kind">
                  {item.kind}
                </Link>
                <span className="activity-text">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
