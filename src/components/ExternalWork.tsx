import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { externalWorkApi, externalWorkFormsApi } from '../api/client'
import type { ExternalWorkEntry, ExternalWorkForm, FormField } from '../api/types'
import { today } from '../lib/format'
import { fieldKey, inferType, parseFields, parseValues, showValue, typeLabel } from '../lib/formFields'

function blankField(taken: string[]): FormField {
  return { key: fieldKey('field', taken), label: '', type: 'text' }
}

/**
 * External work, kept against forms the office designs itself.
 *
 * There is no fixed shape for an external job, so there is no fixed form: each
 * one is named and given its own fields here, and its records follow. A record
 * holds nothing the form did not ask for -- if a job needs a date or a boiler,
 * that is a field like any other.
 *
 * Values are stored against a field's key rather than its label, so renaming a
 * field keeps whatever has already been entered under it.
 */
export function ExternalWork() {
  const [forms, setForms] = useState<ExternalWorkForm[]>([])
  const [entries, setEntries] = useState<ExternalWorkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [openId, setOpenId] = useState<number | null>(null)
  const [designingId, setDesigningId] = useState<number | 'new' | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draft, setDraft] = useState<FormField[]>([])

  const [entryOpen, setEntryOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [entryValues, setEntryValues] = useState<Record<string, string>>({})

  const openForm = openId === null ? null : (forms.find((f) => f.id === openId) ?? null)
  const fields = useMemo(() => parseFields(openForm?.fields ?? ''), [openForm])
  const formEntries = useMemo(
    () => entries.filter((entry) => entry.form_id === openId),
    [entries, openId],
  )

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([externalWorkFormsApi.list(), externalWorkApi.list({ limit: 1000 })])
      .then(([formList, rows]) => {
        setForms(formList.data.items)
        setEntries(rows.data.items)
      })
      .catch(() => setError('Could not load external work.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => load(), [load])

  // --- designing a form --------------------------------------------------

  function startNewForm() {
    setDraftName('')
    setDraft([blankField([])])
    setDesigningId('new')
    setError('')
  }

  function startEditingForm(form: ExternalWorkForm) {
    const existing = parseFields(form.fields)
    setDraftName(form.name)
    setDraft(existing.length > 0 ? existing : [blankField([])])
    setDesigningId(form.id)
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
    const name = draftName.trim()
    if (!name) {
      setError('Give the form a name.')
      return
    }
    const known =
      designingId === 'new'
        ? []
        : parseFields(forms.find((f) => f.id === designingId)?.fields ?? '')
    const cleaned: FormField[] = []
    for (const field of draft) {
      const label = field.label.trim()
      if (!label) continue
      // A field that already exists keeps the key its records are stored under.
      const seen = known.some((f) => f.key === field.key)
      const key = seen ? field.key : fieldKey(label, cleaned.map((f) => f.key))
      const options = (field.options ?? []).map((o) => o.trim()).filter(Boolean)
      // The kind of box follows from the name, so nobody has to pick one.
      const type = inferType(label, options.length > 0)
      cleaned.push({
        key,
        label,
        type,
        ...(type === 'choice' ? { options } : {}),
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
      const payload = { name, fields: JSON.stringify(cleaned) }
      if (designingId === 'new') {
        const created = await externalWorkFormsApi.create(payload)
        setOpenId(created.data.item.id)
      } else if (designingId !== null) {
        await externalWorkFormsApi.update(designingId, payload)
      }
      load()
      setDesigningId(null)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the form')
    } finally {
      setSaving(false)
    }
  }

  async function removeForm(form: ExternalWorkForm) {
    const used = entries.filter((entry) => entry.form_id === form.id).length
    if (used > 0) {
      setError(
        `${form.name} still has ${used} record${used === 1 ? '' : 's'}. Delete those first if the form is really going.`,
      )
      return
    }
    try {
      await externalWorkFormsApi.remove(form.id)
      if (openId === form.id) setOpenId(null)
      load()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not delete the form')
    }
  }

  // --- filling one in ----------------------------------------------------

  function startEntry() {
    setEditingId(null)
    setEntryValues({})
    setEntryOpen(true)
    setError('')
  }

  function editEntry(entry: ExternalWorkEntry) {
    setEditingId(entry.id)
    setEntryValues(parseValues(entry.answers))
    setEntryOpen(true)
    setError('')
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const editing = entries.find((entry) => entry.id === editingId)
      const payload = {
        // Not asked for and not shown: the day it was entered, kept only so the
        // list has something stable to order by.
        date: editing ? editing.date : today(),
        form_id: openId ?? '',
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

  // --- the designer ------------------------------------------------------

  if (designingId !== null) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>{designingId === 'new' ? 'New form' : 'Edit form'}</h2>
          <button type="button" className="text-button" onClick={() => setDesigningId(null)}>
            Close
          </button>
        </div>

        <label className="field-wide">
          Form name
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="e.g. Contractor visit"
          />
        </label>

        <p className="muted">
          Name the fields this form needs; the kind of box each one gets follows from its name.
          Give a field choices and it becomes a dropdown instead. Renaming a field keeps whatever
          has already been entered against it.
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
                  Choices, separated by commas
                  <input
                    value={(field.options ?? []).join(', ')}
                    onChange={(event) =>
                      patchField(index, { options: event.target.value.split(',') })
                    }
                    placeholder="leave blank for a free box"
                  />
                </label>
                <label className="toolbar-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(event) => patchField(index, { required: event.target.checked })}
                  />
                  Required
                </label>
                <span className="field-kind">
                  {field.label.trim()
                    ? typeLabel(inferType(field.label, (field.options ?? []).some((o) => o.trim())))
                    : ''}
                </span>
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

  // --- choosing a form ---------------------------------------------------

  if (openForm === null) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>External work</h2>
          <div className="head-actions">
            <button type="button" className="button" onClick={startNewForm}>
              New form
            </button>
          </div>
        </div>
        {forms.length === 0 ? (
          <p className="muted">No forms yet. Build one and records can be kept against it.</p>
        ) : (
          <div className="form-picker">
            {forms.map((form) => {
              const count = entries.filter((entry) => entry.form_id === form.id).length
              const fieldCount = parseFields(form.fields).length
              return (
                <button
                  key={form.id}
                  type="button"
                  className="form-choice"
                  onClick={() => setOpenId(form.id)}
                >
                  <strong>{form.name}</strong>
                  <span>
                    {count} record{count === 1 ? '' : 's'}
                  </span>
                  <em>
                    {fieldCount} field{fieldCount === 1 ? '' : 's'}
                  </em>
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="err">{error}</p>}
      </section>
    )
  }

  // --- one form's records ------------------------------------------------

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
          <h2>{openForm.name}</h2>
          <div className="head-actions">
            <span className="count">{formEntries.length}</span>
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                setOpenId(null)
                setEntryOpen(false)
                setError('')
              }}
            >
              All forms
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => startEditingForm(openForm)}
            >
              Edit form
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => void removeForm(openForm)}
            >
              Delete form
            </button>
            {!entryOpen && (
              <button type="button" className="button" onClick={startEntry}>
                New record
              </button>
            )}
          </div>
        </div>
        {formEntries.length === 0 ? (
          <p className="muted">Nothing recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  {fields.map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {formEntries.map((entry) => {
                  const values = parseValues(entry.answers)
                  return (
                    <tr key={entry.id}>
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
