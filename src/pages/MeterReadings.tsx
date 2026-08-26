import { useMemo, useState, type FormEvent } from 'react'
import { meterReadingsApi } from '../api/client'
import type { MeterReading } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { boilerLabel, figure, showDate, today } from '../lib/format'

const empty = () => ({
  date: today(),
  boiler_id: '',
  reading: '',
  staff: '',
  notes: '',
  reading_at: '',
})

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

  // Usage since the previous reading of the same boiler (list is newest-first).
  const usage = useMemo(() => {
    const map = new Map<number, number>()
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
        map.set(sorted[i].id, sorted[i].reading - sorted[i - 1].reading)
      }
    }
    return map
  }, [ledger.items])

  const [formOpen, setFormOpen] = useState(false)

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
          <p>
            Heat meter readings per boiler. Change/used is the difference from that boiler's
            previous reading — negative where a meter was replaced.
          </p>
        </div>
        {!formOpen && (
          <button type="button" className="button" onClick={() => setFormOpen(true)}>
            New reading
          </button>
        )}
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
              placeholder="e.g. 152340"
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
          <div className="card-head">
            <h2>Readings</h2>
            <span className="count">{ledger.items.length}</span>
          </div>
          {ledger.loading ? (
            <p className="muted">Loading…</p>
          ) : ledger.items.length === 0 ? (
            <p className="muted">No readings recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Boiler</th>
                    <th className="num">Reading</th>
                    <th className="num">Change/used</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((reading) => {
                    const delta = usage.get(reading.id)
                    return (
                      <tr key={reading.id}>
                        <td className="nowrap">{showDate(reading.date)}</td>
                        <td className="nowrap">{boilerLabel(byId.get(reading.boiler_id))}</td>
                        <td className="num">{figure(reading.reading)}</td>
                        <td className="num">{delta === undefined ? '—' : figure(delta)}</td>
                        <td className="wrap">{reading.notes || '—'}</td>
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
