import { useMemo, useRef, useState } from 'react'
import { meterReadingsApi } from '../api/client'
import type { MeterReading } from '../api/types'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { boilerLabel, figure, showDate, today } from '../lib/format'

const DEFAULT_READER = 'Tony'

const empty = () => ({
  date: today(),
  boiler_id: '',
  reading: '',
  staff: DEFAULT_READER,
  notes: '',
})

function shortDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

type Cell = { boilerId: number; date: string }

export function MeterReadings() {
  const { visible: boilers, byId } = useBoilers()
  const ledger = useLedger<MeterReading, ReturnType<typeof empty>>({
    api: meterReadingsApi,
    empty,
    toForm: (r) => ({
      date: r.date,
      boiler_id: String(r.boiler_id),
      reading: String(r.reading),
      staff: r.staff,
      notes: r.notes,
    }),
  })

  const [view, setView] = useState<'grid' | 'list'>('grid')

  // One row and one column picked out to follow across the grid. Clicking
  // another moves the highlight; clicking the same one again clears it.
  const [litRow, setLitRow] = useState<number | null>(null)
  const [litCol, setLitCol] = useState<string | null>(null)

  // A whole column of readings being worked on: one date, a value per boiler.
  // `origin` is the date the column already lives under, or null when it is a
  // new one being added.
  const [round, setRound] = useState<
    { date: string; origin: string | null; values: Record<number, string> } | null
  >(null)
  const [roundSaving, setRoundSaving] = useState(false)
  const [roundError, setRoundError] = useState<string | null>(null)
  const roundInputs = useRef<(HTMLInputElement | null)[]>([])

  // Inline (Excel-style) cell editing
  const [cell, setCell] = useState<Cell | null>(null)
  const [draft, setDraft] = useState('')
  const [cellError, setCellError] = useState<string | null>(null)
  const [cellSaving, setCellSaving] = useState(false)

  // Anything above this per day is almost certainly a mis-keyed reading.
  const SUSPECT_PER_DAY = 3

  // Change since the same boiler's previous reading, spread over the days
  // between the two reads. Keyed by reading id.
  const usage = useMemo(() => {
    const map = new Map<number, { delta: number; days: number; perDay: number | null }>()
    const byBoiler = new Map<number, MeterReading[]>()
    for (const item of ledger.items) {
      const list = byBoiler.get(item.boiler_id) || []
      list.push(item)
      byBoiler.set(item.boiler_id, list)
    }
    for (const list of byBoiler.values()) {
      const sorted = [...list].sort((a, b) =>
        a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1,
      )
      for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i].reading - sorted[i - 1].reading
        const days = Math.round(
          (Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86400000,
        )
        map.set(sorted[i].id, { delta, days, perDay: days > 0 ? delta / days : null })
      }
    }
    return map
  }, [ledger.items])

  // Newest dates first so the latest readings need no scrolling.
  const dates = useMemo(
    () => [...new Set(ledger.items.map((item) => item.date))].sort().reverse(),
    [ledger.items],
  )

  const cells = useMemo(() => {
    const map = new Map<string, MeterReading>()
    for (const item of ledger.items) map.set(`${item.boiler_id}|${item.date}`, item)
    return map
  }, [ledger.items])

  // Every boiler that should be read gets a row, whether or not it has been
  // read before. Listing only boilers with readings left a new one -- No. 33,
  // swapped in for No. 3 -- with no row, and so no cell to type its first
  // reading into. Which boilers count is the sidebar's sold-boilers switch.
  const gridBoilers = boilers

  function startEdit(boilerId: number, date: string, existing?: MeterReading) {
    setCell({ boilerId, date })
    setDraft(existing ? String(existing.reading) : '')
    setCellError(null)
  }

  async function commitCell() {
    if (!cell || cellSaving) return
    const raw = draft.trim()
    const existing = cells.get(`${cell.boilerId}|${cell.date}`)
    if (raw === '') {
      setCell(null)
      return
    }
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      setCellError('That is not a number')
      return
    }
    if (existing && existing.reading === value) {
      setCell(null)
      return
    }
    setCellSaving(true)
    setCellError(null)
    try {
      if (existing) {
        await meterReadingsApi.update(existing.id, { reading: value })
      } else {
        await meterReadingsApi.create({
          date: cell.date,
          boiler_id: cell.boilerId,
          reading: value,
          staff: DEFAULT_READER,
        })
      }
      await ledger.refresh()
      setCell(null)
    } catch (error) {
      setCellError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setCellSaving(false)
    }
  }

  // --- reading round -----------------------------------------------------
  // Readings are taken for every boiler in one walk round the site, so they
  // are entered that way too: one date, then a column of boxes down the grid.
  // The previous readings stay visible on each row while it is typed.
  function roundValues(date: string) {
    const values: Record<number, string> = {}
    for (const boiler of gridBoilers) {
      const existing = cells.get(`${boiler.id}|${date}`)
      if (existing) values[boiler.id] = String(existing.reading)
    }
    return values
  }

  function startRound() {
    const date = today()
    setRound({ date, origin: dates.includes(date) ? date : null, values: roundValues(date) })
    setRoundError(null)
  }

  /** Clicking a date in the top row opens that whole column for editing. */
  function editColumn(date: string) {
    if (round || view !== 'grid') return
    setRound({ date, origin: date, values: roundValues(date) })
    setRoundError(null)
  }

  function setRoundDate(date: string) {
    setRound((current) =>
      current
        ? {
            ...current,
            date,
            // An existing column keeps the values being edited so the date can
            // be corrected without retyping; a new one shows what is already
            // recorded on the day it now points at.
            values: current.origin ? current.values : roundValues(date),
          }
        : current,
    )
  }

  /** One box in the column being worked on. */
  function roundInput(boiler: { id: number; number: string }, index: number) {
    if (!round) return null
    return (
      <input
        ref={(el) => {
          roundInputs.current[index] = el
        }}
        type="number"
        step="any"
        className="cell-input"
        value={round.values[boiler.id] ?? ''}
        disabled={roundSaving}
        autoFocus={index === 0}
        onChange={(event) =>
          setRound((current) =>
            current
              ? { ...current, values: { ...current.values, [boiler.id]: event.target.value } }
              : current,
          )
        }
        onKeyDown={(event) => {
          // Down and Enter walk the column the way a spreadsheet does; without
          // this the number input would just nudge its own value up and down.
          if (event.key === 'ArrowDown' || event.key === 'Enter') {
            event.preventDefault()
            moveWithin(index, 1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            moveWithin(index, -1)
          } else if (event.key === 'Escape') {
            setRound(null)
          }
        }}
      />
    )
  }

  function moveWithin(index: number, by: number) {
    const next = roundInputs.current[index + by]
    if (!next) return
    next.focus()
    next.select()
  }

  /** What saving the column would do, worked out once for the bar and the save. */
  const roundPlan = useMemo(() => {
    if (!round) return null
    const source = round.origin ?? round.date
    const creates: Record<string, unknown>[] = []
    const updates: { id: number; reading?: number; date?: string }[] = []
    const removals: { id: number; number: string }[] = []
    let bad: string | null = null
    for (const boiler of gridBoilers) {
      const raw = (round.values[boiler.id] ?? '').trim()
      const existing = cells.get(`${boiler.id}|${source}`)
      if (raw === '') {
        // Clearing a box removes that reading; the bar says so before saving.
        if (existing) removals.push({ id: existing.id, number: boiler.number })
        continue
      }
      const value = Number(raw)
      if (!Number.isFinite(value)) {
        bad = bad ?? `No. ${boiler.number}: "${raw}" is not a number`
        continue
      }
      if (existing) {
        const patch: { id: number; reading?: number; date?: string } = { id: existing.id }
        if (existing.reading !== value) patch.reading = value
        if (existing.date !== round.date) patch.date = round.date
        if (patch.reading !== undefined || patch.date !== undefined) updates.push(patch)
      } else {
        creates.push({
          date: round.date,
          boiler_id: boiler.id,
          reading: value,
          staff: DEFAULT_READER,
        })
      }
    }
    return { creates, updates, removals, bad }
  }, [round, gridBoilers, cells])

  async function saveRound() {
    if (!round || !roundPlan || roundSaving) return
    if (roundPlan.bad) {
      setRoundError(roundPlan.bad)
      return
    }
    // Moving a column onto a date that already holds readings would merge two
    // rounds into one; refuse rather than guess which value wins.
    if (round.origin && round.date !== round.origin && dates.includes(round.date)) {
      setRoundError(`There are already readings on ${showDate(round.date)}. Pick another date.`)
      return
    }
    const { creates, updates, removals } = roundPlan
    if (creates.length === 0 && updates.length === 0 && removals.length === 0) {
      setRound(null)
      return
    }
    setRoundSaving(true)
    setRoundError(null)
    try {
      // One request for the new ones rather than fifteen.
      if (creates.length > 0) await meterReadingsApi.bulkCreate(creates)
      for (const item of updates) {
        const { id, ...patch } = item
        await meterReadingsApi.update(id, patch)
      }
      for (const item of removals) await meterReadingsApi.remove(item.id)
      await ledger.refresh()
      setRound(null)
    } catch (error) {
      setRoundError(error instanceof Error ? error.message : 'Could not save the column')
    } finally {
      setRoundSaving(false)
    }
  }


  return (
    <div className={`page wide${view === 'grid' ? ' fills' : ''}`}>
      <div className="page-head with-action">
        <div>
          <h1>Meter readings</h1>
        </div>
        <div className="head-actions">
          <div className="view-switch">
            <button
              type="button"
              className={view === 'grid' ? 'on' : ''}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button
              type="button"
              className={view === 'list' ? 'on' : ''}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          {!round && view === 'grid' && (
            <button type="button" className="button" onClick={startRound}>
              New reading
            </button>
          )}
        </div>
      </div>


      <section className="card">
        {cellError && <p className="err">{cellError}</p>}
        {round && (
          <div className="round-bar">
            <label className="toolbar-toggle">
              Reading date
              <input
                type="date"
                value={round.date}
                onChange={(event) => setRoundDate(event.target.value)}
              />
            </label>
            <span className="muted">
              {Object.values(round.values).filter((v) => v.trim() !== '').length} of{' '}
              {gridBoilers.length} entered · Enter or ↓ for the next boiler
              {roundPlan && roundPlan.removals.length > 0 && (
                <>
                  {' · '}
                  <strong className="overdue-text">
                    {roundPlan.removals.length} cleared, which will be deleted
                  </strong>
                </>
              )}
            </span>
            <div className="round-bar-actions">
              <button type="button" className="button" disabled={roundSaving} onClick={() => void saveRound()}>
                {roundSaving ? 'Saving…' : 'Save round'}
              </button>
              <button type="button" className="button ghost" disabled={roundSaving} onClick={() => setRound(null)}>
                Cancel
              </button>
            </div>
            {roundError && <p className="err">{roundError}</p>}
          </div>
        )}

        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : ledger.items.length === 0 && !round ? (
          <p className="muted">No readings recorded yet.</p>
        ) : view === 'grid' ? (
          <div className="grid-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="boiler-col">Boiler</th>
                  {round?.origin === null && <th className="round-col">{shortDate(round.date)}</th>}
                  {dates.map((date) =>
                    round?.origin === date ? (
                      <th key={date} className="round-col">
                        {shortDate(round.date)}
                      </th>
                    ) : (
                      <th key={date} className={litCol === date ? 'lit-col' : undefined}>
                        <button
                          type="button"
                          className="date-button"
                          onClick={() => setLitCol((current) => (current === date ? null : date))}
                          onDoubleClick={() => editColumn(date)}
                          title={`${showDate(date)} — click to highlight, double-click to edit the column`}
                        >
                          {shortDate(date)}
                        </button>
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {gridBoilers.map((boiler, index) => (
                  <tr key={boiler.id} className={litRow === boiler.id ? 'lit-row' : undefined}>
                    <td className="boiler-col">
                      <button
                        type="button"
                        className="date-button"
                        onClick={() => setLitRow((current) => (current === boiler.id ? null : boiler.id))}
                        title={`No. ${boiler.number} — click to highlight this row`}
                      >
                        No. {boiler.number}
                      </button>
                    </td>
                    {round?.origin === null && (
                      <td className="round-col">{roundInput(boiler, index)}</td>
                    )}
                    {dates.map((date) => {
                      const litThis = litCol === date ? ' lit-col' : ''
                      if (round?.origin === date) {
                        return (
                          <td key={date} className={`round-col${litThis}`}>
                            {roundInput(boiler, index)}
                          </td>
                        )
                      }
                      const item = cells.get(`${boiler.id}|${date}`)
                      const editing = cell?.boilerId === boiler.id && cell?.date === date
                      if (editing) {
                        return (
                          <td key={date} className={litThis || undefined}>
                            <input
                              autoFocus
                              type="number"
                              step="any"
                              className="cell-input"
                              value={draft}
                              disabled={cellSaving}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={() => void commitCell()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void commitCell()
                                }
                                if (e.key === 'Escape') setCell(null)
                              }}
                            />
                          </td>
                        )
                      }
                      const step = item ? usage.get(item.id) : undefined
                      const reset = step !== undefined && step.delta < 0
                      const suspect =
                        step?.perDay != null && step.perDay > SUSPECT_PER_DAY
                      const tip = item
                        ? `${showDate(date)} · ${figure(item.reading)}${
                            step
                              ? ` · ${figure(step.delta)} over ${step.days} day${
                                  step.days === 1 ? '' : 's'
                                }${step.perDay == null ? '' : ` = ${step.perDay.toFixed(2)}/day`}`
                              : ''
                          }${suspect ? ' — unusually high, check this reading' : ''} — double-click to edit`
                        : `${showDate(date)} · no reading — double-click to add`
                      return (
                        <td key={date} className={litThis || undefined}>
                          <button
                            type="button"
                            className={`cell-button${item ? '' : ' empty'}${reset ? ' reset' : ''}${
                              suspect ? ' suspect' : ''
                            }`}
                            onDoubleClick={() => startEdit(boiler.id, date, item)}
                            title={tip}
                          >
                            {item ? figure(item.reading) : '·'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Boiler</th>
                  <th className="num">Reading</th>
                  <th className="num">Change</th>
                  <th className="num">Days</th>
                  <th className="num">Per day</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ledger.items.map((reading) => {
                  const step = usage.get(reading.id)
                  const suspect = step?.perDay != null && step.perDay > SUSPECT_PER_DAY
                  return (
                    <tr key={reading.id}>
                      <td className="nowrap" data-label="Date">{showDate(reading.date)}</td>
                      <td className="nowrap" data-label="Boiler">{boilerLabel(byId.get(reading.boiler_id))}</td>
                      <td className="num" data-label="Reading">{figure(reading.reading)}</td>
                      <td className="num" data-label="Change">{step === undefined ? '—' : figure(step.delta)}</td>
                      <td className="num" data-label="Days">{step === undefined ? '—' : step.days}</td>
                      <td className={`num${suspect ? ' suspect-value' : ''}`} data-label="Per day">
                        {step?.perDay == null ? '—' : step.perDay.toFixed(2)}
                      </td>
                      <td className="wrap" data-label="Notes">{reading.notes || '—'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => void ledger.remove(reading.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
