import { useMemo } from 'react'
import type { Boiler, ExternalWorkEntry, ExternalWorkForm } from '../api/types'
import { useBoilers } from '../hooks/useBoilers'
import { showDate } from '../lib/format'
import { leafValue, parseFields, parseValues } from '../lib/formFields'

/** RHI years are counted from accreditation, and the picture starts here. */
const START = '2022-04-01'

function addYears(iso: string, years: number) {
  const [y, m, d] = iso.split('-').map(Number)
  // Keeping the month and day fixes 29 February to the 28th, which is what an
  // anniversary means in practice.
  const day = m === 2 && d === 29 ? 28 : d
  return `${y + years}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
}

type Window = { from: string; to: string; covered: string | null }

type Row = {
  boiler: Boiler
  windows: Window[]
  coveredTo: string | null
  gaps: number
}

/**
 * Which service dates belong to which boiler.
 *
 * The forms are built in the app, so nothing here can assume a field name: the
 * service date is the form's date field, and the boiler is the field whose name
 * mentions one. "1A & 1B" is boiler 1 -- the suffix is the two units inside it.
 */
function servicesByBoiler(forms: ExternalWorkForm[], entries: ExternalWorkEntry[]) {
  const byForm = new Map(
    forms.map((form) => {
      const fields = parseFields(form.fields)
      return [
        form.id,
        {
          date: fields.find((f) => f.type === 'date'),
          boiler: fields.find((f) => /boiler/i.test(f.label)),
        },
      ] as const
    }),
  )

  const found = new Map<string, string[]>()
  for (const entry of entries) {
    const shape = entry.form_id === null ? undefined : byForm.get(entry.form_id)
    if (!shape?.date || !shape.boiler) continue
    const values = parseValues(entry.answers)
    const when = leafValue(values[shape.date.key])
    const which = leafValue(values[shape.boiler.key])
    const number = which.match(/\d+/)?.[0]
    if (!when || !number) continue
    const list = found.get(number) ?? []
    list.push(when)
    found.set(number, list)
  }
  return found
}

/**
 * A boiler is covered for an RHI year if it was serviced at some point inside
 * it, and that cover runs to the next anniversary of its accreditation.
 */
export function ServiceCoverage({
  forms,
  entries,
}: {
  forms: ExternalWorkForm[]
  entries: ExternalWorkEntry[]
}) {
  const { visible: boilers } = useBoilers()
  const services = useMemo(() => servicesByBoiler(forms, entries), [forms, entries])

  const { rows, end } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const rows: Row[] = []
    let end = addYears(today, 1)

    for (const boiler of boilers) {
      const accredited = (boiler.accredited_on || '').trim()
      if (!accredited) continue

      // The anniversary on or before the start of the picture.
      let from = accredited
      while (addYears(from, 1) <= START) from = addYears(from, 1)

      // A boiler that has gone stops needing cover.
      const finished = (boiler.sold_on || boiler.decommissioned_on || '').trim()
      const horizon = finished || addYears(today, 1)

      const dates = services.get(boiler.number) ?? []
      const windows: Window[] = []
      while (from < horizon) {
        const to = addYears(from, 1)
        const inside = dates.filter((d) => d >= from && d < to).sort()
        windows.push({ from, to, covered: inside[0] ?? null })
        if (to > end && !finished) end = to
        from = to
      }

      const last = [...windows].reverse().find((w) => w.covered)
      rows.push({
        boiler,
        windows,
        coveredTo: last ? last.to : null,
        // The first window runs before the records begin and is blank for every
        // boiler, so it is not a gap to chase. Nor is a year still running.
        gaps: windows.slice(1).filter((w) => !w.covered && w.to <= today).length,
      })
    }
    return { rows, end }
  }, [boilers, services])

  const span = Math.max(1, daysBetween(START, end))
  const left = (iso: string) => `${(Math.max(0, daysBetween(START, iso)) / span) * 100}%`
  const width = (from: string, to: string) =>
    `${(Math.max(0, daysBetween(from < START ? START : from, to)) / span) * 100}%`

  const years: string[] = []
  for (let y = Number(START.slice(0, 4)); y <= Number(end.slice(0, 4)); y += 1) {
    years.push(`${y}-04-01`)
  }

  const today = new Date().toISOString().slice(0, 10)

  if (rows.length === 0) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>Service coverage</h2>
        </div>
        <p className="muted">
          No boiler has an accreditation date, so there is nothing to count RHI years from.
        </p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Service coverage</h2>
        <div className="head-actions">
          <span className="cover-key">
            <i className="cover-swatch covered" /> serviced
            <i className="cover-swatch gap" /> gap
            <i className="cover-swatch open" /> year still running
            <i className="cover-swatch before" /> before records
          </span>
        </div>
      </div>
      <p className="muted">
        Each boiler&rsquo;s RHI years run from the anniversary of its accreditation. A year counts
        as covered if it holds a service, and cover then runs to the next anniversary.
      </p>

      <div className="cover-scroll">
        <div className="cover-grid">
          <div className="cover-axis">
            <span className="cover-name" />
            <div className="cover-track">
              {years.map((year) => (
                <span
                  key={year}
                  className="cover-year"
                  style={{
                    left: left(year),
                    // The first label would sit half outside the track.
                    transform: left(year) === '0%' ? 'none' : undefined,
                  }}
                >
                  {year.slice(0, 4)}
                </span>
              ))}
            </div>
            <span className="cover-until">Covered to</span>
          </div>

          {rows.map((row) => (
            <div className="cover-row" key={row.boiler.id}>
              <span className="cover-name">
                No. {row.boiler.number}
                {row.gaps > 0 && <em className="cover-gaps">{row.gaps} gap{row.gaps === 1 ? '' : 's'}</em>}
              </span>
              <div className="cover-track">
                {years.map((year) => (
                  <span key={year} className="cover-rule" style={{ left: left(year) }} />
                ))}
                {row.windows.map((w, index) => {
                  const kind = w.covered
                    ? 'covered'
                    : index === 0
                      ? 'before'
                      : w.to > today
                        ? 'open'
                        : 'gap'
                  return (
                    <span
                      key={w.from}
                      className={`cover-band ${kind}`}
                      style={{ left: left(w.from), width: width(w.from, w.to) }}
                      title={
                        `${showDate(w.from)} to ${showDate(w.to)} — ` +
                        (w.covered
                          ? `serviced ${showDate(w.covered)}`
                          : kind === 'before'
                            ? 'before the records begin'
                            : kind === 'open'
                              ? 'not yet serviced'
                              : 'no service')
                      }
                    />
                  )
                })}
                <span className="cover-today" style={{ left: left(today) }} title={`Today, ${showDate(today)}`} />
              </div>
              <span className={`cover-until${row.coveredTo && row.coveredTo > today ? '' : ' short'}`}>
                {row.coveredTo ? showDate(row.coveredTo) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
