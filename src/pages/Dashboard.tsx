import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cleaningApi, earningsApi, getAlerts, maintenanceApi, meterReadingsApi } from '../api/client'
import type { AlertItem, CleaningEntry, EarningEntry, MaintenanceEntry, MeterReading } from '../api/types'
import { useBoilers } from '../hooks/useBoilers'
import { boilerLabel, figure, money, showDate, today } from '../lib/format'
import { ALERT_LINKS } from '../lib/options'

type DueItem = {
  kind: 'Cleaning' | 'Maintenance'
  link: string
  boiler: string
  due: string
}

type ActivityItem = {
  kind: string
  link: string
  date: string
  id: number
  text: string
}

export function Dashboard() {
  const { boilers, byId } = useBoilers()
  const [cleaning, setCleaning] = useState<CleaningEntry[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceEntry[]>([])
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [earnings, setEarnings] = useState<EarningEntry[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      cleaningApi.list(),
      maintenanceApi.list(),
      meterReadingsApi.list(),
      earningsApi.list(),
      getAlerts().catch(() => ({ data: { items: [] as AlertItem[] } })),
    ])
      .then(([c, m, r, e, a]) => {
        if (cancelled) return
        setCleaning(c.data.items)
        setMaintenance(m.data.items)
        setReadings(r.data.items)
        setEarnings(e.data.items)
        setAlerts(a.data.items)
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

  const dueItems = useMemo(() => {
    const items: DueItem[] = []
    const collect = (entries: (CleaningEntry | MaintenanceEntry)[], kind: DueItem['kind'], link: string) => {
      // Only the most recent next_due per boiler (and one for non-boiler work).
      const seen = new Set<string>()
      for (const entry of entries) {
        const key = String(entry.boiler_id ?? 'general')
        if (seen.has(key)) continue
        seen.add(key)
        if (!entry.next_due) continue
        items.push({
          kind,
          link,
          boiler:
            entry.boiler_id === null ? 'General' : boilerLabel(byId.get(entry.boiler_id)),
          due: entry.next_due,
        })
      }
    }
    collect(cleaning, 'Cleaning', '/cleaning')
    collect(maintenance, 'Maintenance', '/maintenance')
    return items.sort((a, b) => (a.due < b.due ? -1 : 1))
  }, [cleaning, maintenance, byId])

  const overdueCount = useMemo(
    () => dueItems.filter((item) => item.due < today()).length,
    [dueItems],
  )

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

      <div className="split even">
        <section className="card">
          <div className="card-head">
            <h2>Upcoming checks</h2>
          </div>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : dueItems.length === 0 ? (
            <p className="muted">
              Nothing scheduled. Set "next check due" on cleaning or maintenance entries and they'll
              appear here.
            </p>
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
                    {item.due < today() && <span className="badge overdue">overdue</span>}
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
