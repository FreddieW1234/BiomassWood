import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { externalWorkApi, externalWorkFormsApi } from '../api/client'
import type {
  Boiler,
  ExternalWorkEntry,
  ExternalWorkForm,
  FormField,
  FormFieldType,
} from '../api/types'
import { BoilerSelect } from './BoilerSelect'
import { boilerLabel, showDate, today } from '../lib/format'
import { FIELD_TYPES, fieldKey, parseFields, parseValues, showValue } from '../lib/formFields'

function blankField(taken: string[]): FormField {
  return { key: fieldKey('field', taken), label: '', type: 'text' }
}

/**
 * External work records, kept against a form the office designs itself.
 *
 * The fields are not fixed in code because what an external job needs to record
 * is not settled: "Edit form" adds, renames and reorders them, and the records
 * follow. Values are stored against a field's key rather than its label, so
 * renaming one keeps what has already been entered.
 */
export function ExternalWork({ boilers, byId }: { boilers: Boiler[]; byId: Map<number, Boiler> }) {
  const [form, setForm] = useState<ExternalWorkForm | null>(null)
  const [entries, setEntries] = useState<ExternalWorkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [designing, setDesigning] = useState(false)
  const [draft, setDraft] = useState<FormField[]>([])

  const [entryOpen, setEntryOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [entryDate, setEntryDate] = useState(today())
  const [entryBoiler, setEntryBoiler] = useState('')
  const [entryValues, setEntryValues] = useState<Record<string, string>>({})

  const fields = useMemo(() => parseFields(form?.fields ?? ''), [form])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([externalWorkFormsApi.list(), externalWorkApi.list({ limit: 500 })])
      .then(([forms, rows]) => {
        setForm(forms.data.items[0] ?? null)
        setEntries(rows.data.items)
      })
      .catch(() => setError('Could not load external work.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => load(), [load])

  // --- designing the form ------------------------------------------------

  function startDesigning() {
    setDraft(fields.length > 0 ? fields : [blankField([])])
    setDesigning(true)
    setError('')
  }

  function patchField(index: number, patch: Partial<FormField>) {
    setDraft((current) => current.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function moveField(index: number, by: number) {
    setDraft((current) => {
      const target = index + by
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const held = next[index]
      next[index] = next[target]
      next[target] = held
      return next
    })
  }

  async function saveForm() {
    const cleaned: FormField[] = []
    for (const field of draft) {
      const label = field.label.trim()
      if (!label) continue
      // An existing field keeps the key its records are stored under; one that
      // has never been saved gets a key from its label now.
      const known = fields.some((f) => f.key === field.key)
      const key = known ? field.key : fieldKey(label, cleaned.map((f) => f.key))
      cleaned.push({
        key,
        label,
        type: field.type,
        ...(field.type === 'choice'
          ? { options: (field.options ?? []).map((o) => o.trim()).filter(Boolean) }
          : {}),
        ...(field.required ? { required: true } : {}),
      })
    }
    if (cleaned.length === 0) {
      setError('Give at least one field a name.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { name: 'External work', fields: JSON.stringify(cleaned) }
      if (form) await externalWorkFormsApi.update(form.id, payload)
      else await externalWorkFormsApi.create(payload)
      load()
      setDesigning(false)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the form')
    } finally {
      setSaving(false)
    }
  }

  // --- filling it in -----------------------------------------------------

  function startEntry() {
    setEditingId(null)
    setEntryDate(today())
    setEntryBoiler('')
    setEntryValues({})
    setEntryOpen(true)
    setError('')
  }

  function editEntry(entry: ExternalWorkEntry) {
    setEditingId(entry.id)
    setEntryDate(entry.date)
    setEntryBoiler(entry.boiler_id === null ? '' : String(entry.boiler_id))
    setEntryValues(parseValues(entry.answers))
    setEntryOpen(true)
    setError('')
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        date: entryDate,
        boiler_id: entryBoiler,
        form_id: form ? form.id : '',
        answers: JSON.stringify(entryValues),
      }
      if (editingId) await externalWorkApi.update(editingId, payload)
      else await externalWorkApi.create(payload)
      load()
      setEntryOpen(false)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the record')
    } finally {
      setSaving(false)
    }
  }

  async function removeEntry(id: number) {
    try {
      await externalWorkApi.remove(id)
      load()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not delete the record')
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  if (designing) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>External work form</h2>
          <button type="button" className="text-button" onClick={() => setDesigning(false)}>
            Close
          </button>
        </div>
        <p className="muted">
          Add the fields an external job needs to record. Renaming one keeps whatever has already
          been entered against it; removing one hides its answers rather than deleting them.
        </p>

        <ul className="field-builder">
          {draft.map((field, index) => (
            <li key={field.key}>
              <div className="field-builder-row">
                <label>
                  Field name
                  <input
                    value={field.label}
                    onChange={(event) => patchField(index, { label: event.target.value })}
                    placeholder="e.g. Contractor"
                  />
                </label>
                <label>
                  Type
                  <select
                    value={field.type}
                    onChange={(event) =>
                      patchField(index, { type: event.target.value as FormFieldType })
                    }
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="toolbar-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(event) => patchField(index, { required: event.target.checked })}
                  />
                  Required
                </label>
                <div className="field-builder-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={index === draft.length - 1}
                    onClick={() => moveField(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {field.type === 'choice' && (
                <label className="field-wide">
                  Choices, one per line
                  <textarea
                    rows={3}
                    value={(field.options ?? []).join('\n')}
                    onChange={(event) =>
                      patchField(index, { options: event.target.value.split('\n') })
                    }
                  />
                </label>
              )}
            </li>
          ))}
        </ul>

        <div className="row">
          <button
            type="button"
            className="button ghost"
            onClick={() => setDraft((current) => [...current, blankField(current.map((f) => f.key))])}
          >
            Add field
          </button>
          <button type="button" className="button" disabled={saving} onClick={() => void saveForm()}>
            {saving ? 'Saving…' : 'Save form'}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </section>
    )
  }

  if (fields.length === 0) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>External Work</h2>
        </div>
        <p className="muted">No form yet. Build one and records can be kept against it.</p>
        <div className="row">
          <button type="button" className="button" onClick={startDesigning}>
            Create the form
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </section>
    )
  }

  return (
    <>
      {entryOpen && (
        <form className="card form-panel" onSubmit={(event) => void saveEntry(event)}>
          <div className="card-head">
            <h2>{editingId ? 'Edit record' : 'New record'}</h2>
            <button type="button" className="text-button" onClick={() => setEntryOpen(false)}>
              Close
            </button>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                required
              />
            </label>
            <label>
              Boiler
              <BoilerSelect boilers={boilers} value={entryBoiler} onChange={setEntryBoiler} />
            </label>
            {fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'field-wide' : undefined}>
                {field.label}
                <FieldInput
                  field={field}
                  value={entryValues[field.key] ?? ''}
                  onChange={(value) =>
                    setEntryValues((current) => ({ ...current, [field.key]: value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add record'}
            </button>
            <button type="button" className="button ghost" onClick={() => setEntryOpen(false)}>
              Cancel
            </button>
          </div>
          {error && <p className="err">{error}</p>}
        </form>
      )}

      <section className="card">
        <div className="card-head">
          <h2>External work</h2>
          <div className="head-actions">
            <span className="count">{entries.length}</span>
            <button type="button" className="button ghost" onClick={startDesigning}>
              Edit form
            </button>
            {!entryOpen && (
              <button type="button" className="button" onClick={startEntry}>
                New record
              </button>
            )}
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="muted">Nothing recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Boiler</th>
                  {fields.map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const values = parseValues(entry.answers)
                  return (
                    <tr key={entry.id}>
                      <td className="nowrap" data-label="Date">
                        {showDate(entry.date)}
                      </td>
                      <td className="nowrap" data-label="Boiler">
                        {entry.boiler_id === null ? '—' : boilerLabel(byId.get(entry.boiler_id))}
                      </td>
                      {fields.map((field) => (
                        <td key={field.key} className="wrap" data-label={field.label}>
                          {showValue(field, values[field.key])}
                        </td>
                      ))}
                      <td className="actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => editEntry(entry)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => void removeEntry(entry.id)}
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
        {error && <p className="err">{error}</p>}
      </section>
    </>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: string
  onChange: (value: string) => void
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    )
  }
  if (field.type === 'choice' || field.type === 'yesno') {
    const options = field.type === 'yesno' ? ['Yes', 'No'] : (field.options ?? [])
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  )
}
