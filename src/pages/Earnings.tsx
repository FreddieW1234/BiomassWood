import { useMemo, useState, type FormEvent } from 'react'
import { earningsApi } from '../api/client'
import type { EarningEntry } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { boilerLabel, money, showDate, today } from '../lib/format'

const empty = () => ({
  date: today(),
  scheme: '',
  amount: '',
  boiler_id: '',
  notes: '',
})

export function Earnings() {
  const { boilers, byId } = useBoilers()
  const ledger = useLedger<EarningEntry, ReturnType<typeof empty>>({
    api: earningsApi,
    empty,
    toForm: (e) => ({
      date: e.date,
      scheme: e.scheme,
      amount: String(e.amount),
      boiler_id: e.boiler_id === null ? '' : String(e.boiler_id),
      notes: e.notes,
    }),
  })

  const knownSchemes = useMemo(
    () => [...new Set(ledger.items.map((e) => e.scheme).filter(Boolean))],
    [ledger.items],
  )

  const totals = useMemo(() => {
    const year = today().slice(0, 4)
    let all = 0
    let ytd = 0
    for (const entry of ledger.items) {
      all += entry.amount
      if (entry.date.startsWith(year)) ytd += entry.amount
    }
    return { all, ytd, year }
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
          <h1>Earnings</h1>
        </div>
        {!formOpen && (
          <button type="button" className="button" onClick={() => setFormOpen(true)}>
            New payment
          </button>
        )}
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Total {totals.year}</span>
          <span className="stat-value">{money(totals.ytd)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">All time</span>
          <span className="stat-value">{money(totals.all)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Payments</span>
          <span className="stat-value">{ledger.items.length}</span>
        </div>
      </div>

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>{ledger.editingId ? 'Edit payment' : 'New payment'}</h2>
            <button type="button" className="text-button" onClick={close}>
              Close
            </button>
          </div>
          <div className="form-body">
          <div className="field-row">
            <label>
              Date received
              <input
                type="date"
                value={ledger.form.date}
                onChange={(e) => ledger.setField('date', e.target.value)}
                required
              />
            </label>
            <label>
              Amount (£)
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={ledger.form.amount}
                onChange={(e) => ledger.setField('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </label>
          </div>
          <label>
            Scheme / tariff
            <input
              value={ledger.form.scheme}
              onChange={(e) => ledger.setField('scheme', e.target.value)}
              placeholder="e.g. RHI, feed-in tariff"
              list="schemes"
              required
            />
            <datalist id="schemes">
              {knownSchemes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label>
            Boiler
            <BoilerSelect
              boilers={boilers}
              value={ledger.form.boiler_id}
              onChange={(value) => ledger.setField('boiler_id', value)}
            />
          </label>
          <label>
            Notes
            <textarea
              value={ledger.form.notes}
              onChange={(e) => ledger.setField('notes', e.target.value)}
              rows={2}
              placeholder="Period covered, reference number… (optional)"
            />
          </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Add payment'}
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
            <h2>Payments</h2>
            <span className="count">{ledger.items.length}</span>
          </div>
          {ledger.loading ? (
            <p className="muted">Loading…</p>
          ) : ledger.items.length === 0 ? (
            <p className="muted">No payments recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Scheme</th>
                    <th className="num">Amount</th>
                    <th>Boiler</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap" data-label="Date">{showDate(entry.date)}</td>
                      <td data-label="Scheme">{entry.scheme}</td>
                      <td className="num strong" data-label="Amount">{money(entry.amount)}</td>
                      <td className="nowrap" data-label="Boiler">
                        {entry.boiler_id === null ? '—' : boilerLabel(byId.get(entry.boiler_id))}
                      </td>
                      <td className="wrap" data-label="Notes">{entry.notes || '—'}</td>
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
