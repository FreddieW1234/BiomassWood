import { useState, type FormEvent } from 'react'
import type { Resource } from '../api/client'
import type { CleaningEntry } from '../api/types'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { boilerLabel, showDate, today } from '../lib/format'
import { BoilerSelect } from './BoilerSelect'

const empty = () => ({
  date: today(),
  staff: '',
  boiler_id: '',
  work_done: '',
  duration: '',
  next_due: '',
  parts: '',
  engineer: '',
  outcome: '',
})

type Props = {
  title: string
  blurb: string
  workLabel: string
  api: Resource<CleaningEntry>
}

export function WorkLog({ title, blurb, workLabel, api }: Props) {
  const { boilers, byId } = useBoilers()
  const ledger = useLedger<CleaningEntry, ReturnType<typeof empty>>({
    api,
    empty,
    toForm: (e) => ({
      date: e.date,
      staff: e.staff,
      boiler_id: e.boiler_id === null ? '' : String(e.boiler_id),
      work_done: e.work_done,
      duration: e.duration,
      next_due: e.next_due,
      parts: e.parts || '',
      engineer: e.engineer || '',
      outcome: e.outcome || '',
    }),
  })

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

  const overdue = (entry: CleaningEntry) => entry.next_due !== '' && entry.next_due < today()

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>{title}</h1>
          <p>{blurb}</p>
        </div>
        {!formOpen && (
          <button type="button" className="button" onClick={() => setFormOpen(true)}>
            New entry
          </button>
        )}
      </div>

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>{ledger.editingId ? 'Edit entry' : 'New entry'}</h2>
            <button type="button" className="text-button" onClick={close}>
              Close
            </button>
          </div>
          <div className="form-body">
          <div className="field-row">
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
              Staff
              <input
                value={ledger.form.staff}
                onChange={(e) => ledger.setField('staff', e.target.value)}
                placeholder="Who did the work"
                required
              />
            </label>
          </div>
          <label>
            Boiler
            <BoilerSelect
              boilers={boilers}
              value={ledger.form.boiler_id}
              onChange={(value) => ledger.setField('boiler_id', value)}
            />
          </label>
          <label>
            {workLabel}
            <textarea
              value={ledger.form.work_done}
              onChange={(e) => ledger.setField('work_done', e.target.value)}
              rows={4}
              required
            />
          </label>
          <div className="field-row">
            <label>
              How long it took
              <input
                value={ledger.form.duration}
                onChange={(e) => ledger.setField('duration', e.target.value)}
                placeholder="e.g. 45 min"
              />
            </label>
            <label>
              Next check due
              <input
                type="date"
                value={ledger.form.next_due}
                onChange={(e) => ledger.setField('next_due', e.target.value)}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Parts
              <input
                value={ledger.form.parts}
                onChange={(e) => ledger.setField('parts', e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label>
              Engineer
              <input
                value={ledger.form.engineer}
                onChange={(e) => ledger.setField('engineer', e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <label>
            Outcome
            <input
              value={ledger.form.outcome}
              onChange={(e) => ledger.setField('outcome', e.target.value)}
              placeholder="Optional"
            />
          </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Add entry'}
            </button>
            <button type="button" className="button ghost" onClick={close}>
              Cancel
            </button>
          </div>
          {ledger.error && <p className="err">{ledger.error}</p>}
        </form>
      )}

        <section className="card">
          <div className="card-head">
            <h2>Log</h2>
            <span className="count">{ledger.items.length}</span>
          </div>
          {ledger.loading ? (
            <p className="muted">Loading…</p>
          ) : ledger.items.length === 0 ? (
            <p className="muted">Nothing recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Boiler</th>
                    <th>Staff</th>
                    <th>Work done</th>
                    <th>Took</th>
                    <th>Next due</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap">{showDate(entry.date)}</td>
                      <td className="nowrap">
                        {entry.boiler_id === null ? '—' : boilerLabel(byId.get(entry.boiler_id))}
                      </td>
                      <td>{entry.staff}</td>
                      <td className="wrap">{entry.work_done}</td>
                      <td className="nowrap">{entry.duration || '—'}</td>
                      <td className="nowrap">
                        {showDate(entry.next_due)}
                        {overdue(entry) && <span className="badge overdue">overdue</span>}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            ledger.edit(entry)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => void ledger.remove(entry.id)}
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
