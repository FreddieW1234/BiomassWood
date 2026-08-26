import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { rhiUsageApi, rhiYearsApi } from '../api/client'
import type { RhiUsage, RhiYear } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { useBoilers } from '../hooks/useBoilers'
import { figure } from '../lib/format'

const QUARTERS = [1, 2, 3, 4]

export function RhiUsagePage() {
  const { boilers, byId } = useBoilers()
  const [boilerId, setBoilerId] = useState('')
  const [usage, setUsage] = useState<RhiUsage[]>([])
  const [years, setYears] = useState<RhiYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ year_index: '', quarter: '1', kwh: '', notes: '' })
  const [tierForm, setTierForm] = useState({ year_index: '', tier1_kwh: '' })

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [usageResult, yearsResult] = await Promise.all([rhiUsageApi.list(), rhiYearsApi.list()])
      setUsage(usageResult.data.items)
      setYears(yearsResult.data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load RHI usage')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const selectedId = Number(boilerId) || null
  const boiler = selectedId ? byId.get(selectedId) : undefined

  const grid = useMemo(() => {
    if (!selectedId) return []
    const forBoiler = usage.filter((row) => row.boiler_id === selectedId)
    const tierByYear = new Map(
      years.filter((row) => row.boiler_id === selectedId).map((row) => [row.year_index, row]),
    )
    const yearIndexes = new Set<number>()
    for (const row of forBoiler) yearIndexes.add(row.year_index)
    for (const row of tierByYear.values()) yearIndexes.add(row.year_index)
    return [...yearIndexes]
      .sort((a, b) => a - b)
      .map((yearIndex) => {
        const cells = QUARTERS.map(
          (quarter) =>
            forBoiler.find((row) => row.year_index === yearIndex && row.quarter === quarter) ?? null,
        )
        const total = cells.reduce((sum, cell) => sum + (cell?.kwh ?? 0), 0)
        const tier = tierByYear.get(yearIndex) ?? null
        return { yearIndex, cells, total, tier }
      })
  }, [selectedId, usage, years])

  const lifetime = useMemo(() => grid.reduce((sum, row) => sum + row.total, 0), [grid])

  function pickCell(yearIndex: number, quarter: number, cell: RhiUsage | null) {
    setForm({
      year_index: String(yearIndex),
      quarter: String(quarter),
      kwh: cell ? String(cell.kwh) : '',
      notes: cell?.notes ?? '',
    })
  }

  async function submitUsage(event: FormEvent) {
    event.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      const yearIndex = Number(form.year_index)
      const quarter = Number(form.quarter)
      const existing = usage.find(
        (row) => row.boiler_id === selectedId && row.year_index === yearIndex && row.quarter === quarter,
      )
      const payload = {
        boiler_id: selectedId,
        year_index: form.year_index,
        quarter: form.quarter,
        kwh: form.kwh,
        notes: form.notes,
      }
      if (existing) await rhiUsageApi.update(existing.id, payload)
      else await rhiUsageApi.create(payload)
      setForm({ year_index: form.year_index, quarter: form.quarter, kwh: '', notes: '' })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function submitTier(event: FormEvent) {
    event.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      const yearIndex = Number(tierForm.year_index)
      const existing = years.find(
        (row) => row.boiler_id === selectedId && row.year_index === yearIndex,
      )
      const payload = {
        boiler_id: selectedId,
        year_index: tierForm.year_index,
        tier1_kwh: tierForm.tier1_kwh,
      }
      if (existing) await rhiYearsApi.update(existing.id, payload)
      else await rhiYearsApi.create(payload)
      setTierForm({ year_index: '', tier1_kwh: '' })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>RHI usage</h1>
          <p>
            Quarterly kWh per boiler per RHI year, with the tier-1 threshold and what is outstanding
            against it. Click a quarter figure to load it into the form for editing.
          </p>
        </div>
        <div className="head-actions">
          <label className="toolbar-toggle">
            Boiler
            <BoilerSelect boilers={boilers} value={boilerId} onChange={setBoilerId} required />
          </label>
          {selectedId && !formOpen && (
            <button type="button" className="button" onClick={() => setFormOpen(true)}>
              Add figures
            </button>
          )}
        </div>
      </div>

      {selectedId && formOpen && (
        <div className="split even">
            <form className="card form-panel" onSubmit={submitUsage}>
              <div className="card-head">
                <h2>Quarterly usage</h2>
                <button type="button" className="text-button" onClick={() => setFormOpen(false)}>
                  Close
                </button>
              </div>
              <div className="field-row">
                <label>
                  RHI year
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.year_index}
                    onChange={(e) => setForm({ ...form, year_index: e.target.value })}
                    placeholder="1 = first year"
                    required
                  />
                </label>
                <label>
                  Quarter
                  <select
                    value={form.quarter}
                    onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                  >
                    {QUARTERS.map((q) => (
                      <option key={q} value={String(q)}>
                        Q{q}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                kWh used in the quarter
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.kwh}
                  onChange={(e) => setForm({ ...form, kwh: e.target.value })}
                  required
                />
              </label>
              <label>
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </label>
              <div className="row">
                <button type="submit" className="button" disabled={saving}>
                  Save quarter
                </button>
              </div>
              {error && <p className="err">{error}</p>}
              <p className="hint">
                Saving a year + quarter that already exists updates it; a new combination adds it.
              </p>
            </form>

            <form className="card form-panel" onSubmit={submitTier}>
              <div className="card-head">
                <h2>Tier-1 threshold</h2>
              </div>
              <div className="field-row">
                <label>
                  RHI year
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={tierForm.year_index}
                    onChange={(e) => setTierForm({ ...tierForm, year_index: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Tier-1 kWh
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={tierForm.tier1_kwh}
                    onChange={(e) => setTierForm({ ...tierForm, tier1_kwh: e.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="row">
                <button type="submit" className="button ghost" disabled={saving}>
                  Save threshold
                </button>
              </div>
            </form>
        </div>
      )}

      {selectedId && (
          <section className="card">
            <div className="card-head">
              <h2>
                {boiler ? `No. ${boiler.number}` : 'Usage'} — lifetime {figure(lifetime)} kWh
              </h2>
              <span className="count">{grid.length}</span>
            </div>
            {loading ? (
              <p className="muted">Loading…</p>
            ) : grid.length === 0 ? (
              <p className="muted">No usage recorded for this boiler yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th className="num">Q1</th>
                      <th className="num">Q2</th>
                      <th className="num">Q3</th>
                      <th className="num">Q4</th>
                      <th className="num">Total</th>
                      <th className="num">Tier 1</th>
                      <th className="num">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row) => (
                      <tr key={row.yearIndex}>
                        <td className="nowrap">Year {row.yearIndex}</td>
                        {row.cells.map((cell, index) => (
                          <td className="num" key={index}>
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => {
                                pickCell(row.yearIndex, index + 1, cell)
                                setFormOpen(true)
                              }}
                              title="Load into the form"
                            >
                              {cell ? figure(cell.kwh) : '—'}
                            </button>
                          </td>
                        ))}
                        <td className="num">{figure(row.total)}</td>
                        <td className="num">{row.tier ? figure(row.tier.tier1_kwh) : '—'}</td>
                        <td className="num">
                          {row.tier ? figure(row.tier.tier1_kwh - row.total) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
      )}

      {!selectedId && <p className="muted">Choose a boiler to see its usage history.</p>}
    </div>
  )
}
