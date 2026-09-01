import { useMemo, useState, type FormEvent } from 'react'
import { solarReadingsApi, solarSubmissionsApi } from '../api/client'
import type { SolarReading, SolarSubmission } from '../api/types'
import { useLedger } from '../hooks/useLedger'
import { figure, money, showDate, today } from '../lib/format'

const emptyReading = () => ({ date: today(), reading: '', notes: '' })

const emptySubmission = () => ({
  date: today(),
  submission_no: '',
  reading: '',
  units: '',
  price_per_unit: '',
  total: '',
  notes: '',
})

export function Solar() {
  const readings = useLedger<SolarReading, ReturnType<typeof emptyReading>>({
    api: solarReadingsApi,
    empty: emptyReading,
    toForm: (r) => ({ date: r.date, reading: String(r.reading), notes: r.notes }),
  })

  const submissions = useLedger<SolarSubmission, ReturnType<typeof emptySubmission>>({
    api: solarSubmissionsApi,
    empty: emptySubmission,
    toForm: (s) => ({
      date: s.date,
      submission_no: s.submission_no,
      reading: s.reading ? String(s.reading) : '',
      units: s.units ? String(s.units) : '',
      price_per_unit: s.price_per_unit ? String(s.price_per_unit) : '',
      total: s.total ? String(s.total) : '',
      notes: s.notes,
    }),
  })

  // Units generated since the previous reading (list is newest-first), and the
  // rate that works out at per day, which is what makes two readings taken
  // over different gaps comparable.
  const generated = useMemo(() => {
    const map = new Map<number, { units: number; days: number; perDay: number | null }>()
    const sorted = [...readings.items].sort((a, b) =>
      a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1,
    )
    for (let i = 1; i < sorted.length; i++) {
      const units = sorted[i].reading - sorted[i - 1].reading
      const days = Math.round(
        (Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86400000,
      )
      map.set(sorted[i].id, { units, days, perDay: days > 0 ? units / days : null })
    }
    return map
  }, [readings.items])

  const [readingFormOpen, setReadingFormOpen] = useState(false)
  const [submissionFormOpen, setSubmissionFormOpen] = useState(false)

  async function onSubmitReading(event: FormEvent) {
    event.preventDefault()
    const saved = await readings.submit()
    if (saved) setReadingFormOpen(false)
  }

  async function onSubmitSubmission(event: FormEvent) {
    event.preventDefault()
    const saved = await submissions.submit()
    if (saved) setSubmissionFormOpen(false)
  }

  function closeReading() {
    readings.cancel()
    setReadingFormOpen(false)
  }

  function closeSubmission() {
    submissions.cancel()
    setSubmissionFormOpen(false)
  }

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>Solar</h1>
        </div>
        <div className="head-actions">
          {!readingFormOpen && (
            <button type="button" className="button" onClick={() => setReadingFormOpen(true)}>
              New reading
            </button>
          )}
          {!submissionFormOpen && (
            <button type="button" className="button ghost" onClick={() => setSubmissionFormOpen(true)}>
              New submission
            </button>
          )}
        </div>
      </div>

      {readingFormOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmitReading(event)}>
          <div className="card-head">
            <h2>{readings.editingId ? 'Edit meter reading' : 'New meter reading'}</h2>
            <button type="button" className="text-button" onClick={closeReading}>
              Close
            </button>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                value={readings.form.date}
                onChange={(e) => readings.setField('date', e.target.value)}
                required
              />
            </label>
            <label>
              Meter reading
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={readings.form.reading}
                onChange={(e) => readings.setField('reading', e.target.value)}
                required
              />
            </label>
            <label className="field-wide">
              Notes
              <textarea
                value={readings.form.notes}
                onChange={(e) => readings.setField('notes', e.target.value)}
                rows={2}
              />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={readings.saving}>
              {readings.editingId ? 'Save changes' : 'Add reading'}
            </button>
            <button type="button" className="button ghost" onClick={closeReading}>
              Cancel
            </button>
          </div>
          {readings.error && <p className="err">{readings.error}</p>}
        </form>
      )}

        <section className="card">
          <div className="card-head">
            <h2>Generation readings</h2>
            <span className="count">{readings.items.length}</span>
          </div>
          {readings.loading ? (
            <p className="muted">Loading…</p>
          ) : readings.items.length === 0 ? (
            <p className="muted">No readings recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Reading</th>
                    <th className="num">Generated</th>
                    <th className="num">Days</th>
                    <th className="num">Gen / day</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {readings.items.map((item) => {
                    const delta = generated.get(item.id)
                    return (
                      <tr key={item.id}>
                        <td className="nowrap" data-label="Date">{showDate(item.date)}</td>
                        <td className="num" data-label="Reading">{figure(item.reading)}</td>
                        <td className="num" data-label="Generated">{delta ? figure(delta.units) : '—'}</td>
                        <td className="num" data-label="Days">{delta ? figure(delta.days) : '—'}</td>
                        <td className="num" data-label="Gen / day">
                          {delta?.perDay == null ? '—' : delta.perDay.toFixed(2)}
                        </td>
                        <td className="wrap" data-label="Notes">{item.notes || '—'}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => {
                              readings.edit(item)
                              setReadingFormOpen(true)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => void readings.remove(item.id)}
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

      {submissionFormOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmitSubmission(event)}>
          <div className="card-head">
            <h2>{submissions.editingId ? 'Edit FIT submission' : 'New FIT submission'}</h2>
            <button type="button" className="text-button" onClick={closeSubmission}>
              Close
            </button>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                value={submissions.form.date}
                onChange={(e) => submissions.setField('date', e.target.value)}
                required
              />
            </label>
            <label>
              Submission no.
              <input
                value={submissions.form.submission_no}
                onChange={(e) => submissions.setField('submission_no', e.target.value)}
                placeholder="e.g. 12"
              />
            </label>
            <label>
              Meter reading
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={submissions.form.reading}
                onChange={(e) => submissions.setField('reading', e.target.value)}
              />
            </label>
            <label>
              Units claimed
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={submissions.form.units}
                onChange={(e) => submissions.setField('units', e.target.value)}
              />
            </label>
            <label>
              Price per unit (£)
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={submissions.form.price_per_unit}
                onChange={(e) => submissions.setField('price_per_unit', e.target.value)}
              />
            </label>
            <label>
              Total (£)
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={submissions.form.total}
                onChange={(e) => submissions.setField('total', e.target.value)}
              />
            </label>
            <label className="field-wide">
              Notes
              <textarea
                value={submissions.form.notes}
                onChange={(e) => submissions.setField('notes', e.target.value)}
                rows={2}
              />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={submissions.saving}>
              {submissions.editingId ? 'Save changes' : 'Add submission'}
            </button>
            <button type="button" className="button ghost" onClick={closeSubmission}>
              Cancel
            </button>
          </div>
          {submissions.error && <p className="err">{submissions.error}</p>}
        </form>
      )}

        <section className="card">
          <div className="card-head">
            <h2>FIT submissions</h2>
            <span className="count">{submissions.items.length}</span>
          </div>
          {submissions.loading ? (
            <p className="muted">Loading…</p>
          ) : submissions.items.length === 0 ? (
            <p className="muted">No submissions recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>No.</th>
                    <th className="num">Reading</th>
                    <th className="num">Units</th>
                    <th className="num">Price</th>
                    <th className="num">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {submissions.items.map((item) => (
                    <tr key={item.id}>
                      <td className="nowrap">{showDate(item.date)}</td>
                      <td>{item.submission_no || '—'}</td>
                      <td className="num">{item.reading ? figure(item.reading) : '—'}</td>
                      <td className="num">{item.units ? figure(item.units) : '—'}</td>
                      <td className="num">{item.price_per_unit ? money(item.price_per_unit) : '—'}</td>
                      <td className="num">{item.total ? money(item.total) : '—'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            submissions.edit(item)
                            setSubmissionFormOpen(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => void submissions.remove(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </div>
  )
}
