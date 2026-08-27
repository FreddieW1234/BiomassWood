import { useMemo, useState, type FormEvent } from 'react'
import { meterReadingsApi } from '../api/client'
import type { MeterReading } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
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
  reading_at: '',
})

function shortDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

type Cell = { boilerId: number; date: string }

export function MeterReadings() {
  const { boilers, byId } = useBoilers()
  const ledger = useLedger<MeterReading, ReturnType<typeof empty>>({
    api: meterReadingsApi,
    empty,
    toForm: (r) => ({
      date: r.date,
      boiler_id: String(r.boiler_id),
      reading: String(r.reading),
      staff: r.staff,
      notes: r.notes,
      reading_at: r.reading_at || '',
    }),
  })

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [formOpen, setFormOpen] = useState(false)

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

  const gridBoilers = useMemo(() => {
    const withReadings = new Set(ledger.items.map((item) => item.boiler_id))
    return boilers.filter((boiler) => withReadings.has(boiler.id))
  }, [boilers, ledger.items])

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const saved = await ledger.submit()
    if (saved) setFormOpen(false)
  }

  function close() {
    ledger.cancel()
    setFormOpen(false)
  }

  return (
    <div className="page wide">
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
          {!formOpen && (
            <button type="button" className="button" onClick={() => setFormOpen(true)}>
              New reading
            </button>
          )}
        </div>
      </div>

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>{ledger.editingId ? 'Edit reading' : 'New reading'}</h2>
            <button type="button" className="text-button" onClick={close}>
              Close
            </button>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                value={ledger.form.date}
                onChange={(e) => ledger.setField('date', e.target.value)}
                required
              />
            </label>
            <label>
              Read by
              <input
                value={ledger.form.staff}
                onChange={(e) => ledger.setField('staff', e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label>
              Boiler
              <BoilerSelect
                boilers={boilers}
                value={ledger.form.boiler_id}
                onChange={(value) => ledger.setField('boiler_id', value)}
                required
              />
            </label>
            <label>
              Time (optional)
              <input
                value={ledger.form.reading_at}
                onChange={(e) => ledger.setField('reading_at', e.target.value)}
                placeholder="HH:MM or full timestamp"
              />
            </label>
            <label>
              Meter reading
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={ledger.form.reading}
                onChange={(e) => ledger.setField('reading', e.target.value)}
                placeholder="e.g. 1520"
                required
              />
            </label>
            <label className="field-wide">
              Notes
              <textarea
                value={ledger.form.notes}
                onChange={(e) => ledger.setField('notes', e.target.value)}
                rows={2}
              />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Add reading'}
            </button>
            <button type="button" className="button ghost" onClick={close}>
              Cancel
            </button>
          </div>
          {ledger.error && <p className="err">{ledger.error}</p>}
          {boilers.length === 0 && (
            <p className="hint">No boilers registered yet — add them on the Boilers page first.</p>
          )}
        </form>
      )}

      <section className="card">
        {cellError && <p className="err">{cellError}</p>}
        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : ledger.items.length === 0 ? (
          <p className="muted">No readings recorded yet.</p>
        ) : view === 'grid' ? (
          <div className="grid-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="boiler-col">Boiler</th>
                  {dates.map((date) => (
                    <th key={date}>{shortDate(date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridBoilers.map((boiler) => (
                  <tr key={boiler.id}>
                    <td className="boiler-col">No. {boiler.number}</td>
                    {dates.map((date) => {
                      const item = cells.get(`${boiler.id}|${date}`)
                      const editing = cell?.boilerId === boiler.id && cell?.date === date
                      if (editing) {
                        return (
                          <td key={date}>
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
                        <td key={date}>
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
                          className="text-button"
                          onClick={() => {
                            ledger.edit(reading)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </button>
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
