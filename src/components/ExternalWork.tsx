import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { externalWorkApi, externalWorkFormsApi } from '../api/client'
import type { AnswerValue, ExternalWorkEntry, ExternalWorkForm, FormField } from '../api/types'
import { today } from '../lib/format'
import {
  fieldKey,
  groupRows,
  inferType,
  leafValue,
  parseFields,
  parseValues,
  showValue,
  typeLabel,
} from '../lib/formFields'

function blankField(taken: string[]): FormField {
  return { key: fieldKey('field', taken), label: '', type: 'text' }
}

/**
 * External work, kept against forms the office designs itself.
 *
 * There is no fixed shape for an external job, so there is no fixed form: each
 * one is named and given its own fields here, and its records follow. A record
 * holds nothing the form did not ask for.
 *
 * A form can also hold a repeating section -- the HETAS maintenance notice
 * lists appliance, output, serial number, RHI number and engineer once per
 * boiler -- so those five fields are described once and filled in as many
 * times as the job needs.
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
  const [entryValues, setEntryValues] = useState<Record<string, AnswerValue>>({})
  const [copying, setCopying] = useState<{ entry: ExternalWorkEntry; keep: Set<string> } | null>(
    null,
  )

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

  /** Edit a top-level field, or one inside a group when `inside` is given. */
  function patchField(index: number, patch: Partial<FormField>, inside?: number) {
    setDraft((current) =>
      current.map((field, i) => {
        if (inside === undefined) return i === index ? { ...field, ...patch } : field
        if (i !== inside) return field
        return {
          ...field,
          fields: (field.fields ?? []).map((sub, j) => (j === index ? { ...sub, ...patch } : sub)),
        }
      }),
    )
  }

  function moveField(index: number, by: number, inside?: number) {
    setDraft((current) => {
      const swap = (list: FormField[]) => {
        const target = index + by
        if (target < 0 || target >= list.length) return list
        const next = [...list]
        const held = next[index]
        next[index] = next[target]
        next[target] = held
        return next
      }
      if (inside === undefined) return swap(current)
      return current.map((field, i) =>
        i === inside ? { ...field, fields: swap(field.fields ?? []) } : field,
      )
    })
  }

  function removeField(index: number, inside?: number) {
    setDraft((current) => {
      if (inside === undefined) return current.filter((_, i) => i !== index)
      return current.map((field, i) =>
        i === inside ? { ...field, fields: (field.fields ?? []).filter((_, j) => j !== index) } : field,
      )
    })
  }

  function addFieldInside(inside: number) {
    setDraft((current) =>
      current.map((field, i) =>
        i === inside
          ? {
              ...field,
              fields: [...(field.fields ?? []), blankField((field.fields ?? []).map((f) => f.key))],
            }
          : field,
      ),
    )
  }

  /** Tidy one field for saving, or null if it was never named. */
  function cleanField(field: FormField, known: FormField[], taken: string[]): FormField | null {
    const label = field.label.trim()
    if (!label) return null
    // A field that already exists keeps the key its records are stored under.
    const seen = known.some((f) => f.key === field.key)
    const key = seen ? field.key : fieldKey(label, taken)

    if (field.type === 'group') {
      const knownSubs = known.find((f) => f.key === key)?.fields ?? []
      const subs: FormField[] = []
      for (const sub of field.fields ?? []) {
        const cleaned = cleanField(sub, knownSubs, subs.map((f) => f.key))
        if (cleaned) subs.push(cleaned)
      }
      if (subs.length === 0) return null
      return { key, label, type: 'group', fields: subs }
    }

    const options = (field.options ?? []).map((o) => o.trim()).filter(Boolean)
    // The kind of box follows from the name, so nobody has to pick one.
    const type = inferType(label, options.length > 0)
    return { key, label, type, ...(type === 'choice' ? { options } : {}) }
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
      const tidy = cleanField(field, known, cleaned.map((f) => f.key))
      if (tidy) cleaned.push(tidy)
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

  function setLeaf(key: string, value: string) {
    setEntryValues((current) => ({ ...current, [key]: value }))
  }

  function setRepeat(key: string, rows: Record<string, string>[]) {
    setEntryValues((current) => ({ ...current, [key]: rows }))
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

  function startCopy(entry: ExternalWorkEntry) {
    // Everything carries over by default; a duplicate is normally mostly the
    // same record, and it is quicker to clear the few that change.
    setCopying({ entry, keep: new Set(fields.map((field) => field.key)) })
    setError('')
  }

  function makeCopy() {
    if (!copying) return
    const source = parseValues(copying.entry.answers)
    const next: Record<string, AnswerValue> = {}
    for (const field of fields) {
      if (!copying.keep.has(field.key)) continue
      const value = source[field.key]
      if (value === undefined) continue
      // A section's repeats are cloned, not shared, or editing the copy would
      // reach back into the record it came from.
      next[field.key] = Array.isArray(value) ? value.map((row) => ({ ...row })) : value
    }
    setEditingId(null)
    setEntryValues(next)
    setCopying(null)
    setEntryOpen(true)
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
            placeholder="e.g. HETAS maintenance notice"
          />
        </label>

        <p className="muted">
          Name the fields this form needs; the kind of box each one gets follows from its name.
          Give a field choices and it becomes a dropdown. Tick Repeats and it becomes a section
          with its own fields, described once and filled in as many times as a job needs — one
          per appliance, say.
        </p>

        <ul className="field-builder">
          {draft.map((field, index) => (
            <li key={field.key} className={field.type === 'group' ? 'field-group' : undefined}>
              <FieldRow
                field={field}
                first={index === 0}
                last={index === draft.length - 1}
                onPatch={(patch) => patchField(index, patch)}
                onMove={(by) => moveField(index, by)}
                onRemove={() => removeField(index)}
                onToggleRepeat={(on) =>
                  patchField(
                    index,
                    on
                      ? {
                          type: 'group',
                          fields: (field.fields ?? []).length > 0 ? field.fields : [blankField([])],
                        }
                      : { type: 'text' },
                  )
                }
              />
              {field.type === 'group' && (
                <>
                  <p className="section-hint">
                    The fields below are filled in <strong>once for each</strong>{' '}
                    {field.label.trim() || 'one'}, so describe a single one rather than the group.
                    {(field.fields ?? []).every((sub) => !sub.label.trim()) &&
                      ' Serial number, output, who did it — that sort of thing.'}
                  </p>
                  <ul className="field-builder">
                    {(field.fields ?? []).map((sub, subIndex) => (
                      <li key={sub.key}>
                        <FieldRow
                          field={sub}
                          nested
                          first={subIndex === 0}
                          last={subIndex === (field.fields ?? []).length - 1}
                          onPatch={(patch) => patchField(subIndex, patch, index)}
                          onMove={(by) => moveField(subIndex, by, index)}
                          onRemove={() => removeField(subIndex, index)}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="row">
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => addFieldInside(index)}
                    >
                      Add field to {field.label.trim() || 'this section'}
                    </button>
                  </div>
                </>
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
            {fields
              .filter((field) => field.type !== 'group')
              .map((field) => (
                <label
                  key={field.key}
                  className={field.type === 'textarea' ? 'field-wide' : undefined}
                >
                  {field.label}
                  <FieldInput
                    field={field}
                    value={leafValue(entryValues[field.key])}
                    onChange={(value) => setLeaf(field.key, value)}
                  />
                </label>
              ))}
          </div>

          {fields
            .filter((field) => field.type === 'group')
            .map((field) => (
              <RepeatingSection
                key={field.key}
                field={field}
                rows={groupRows(entryValues[field.key])}
                onChange={(rows) => setRepeat(field.key, rows)}
              />
            ))}

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
                          className="text-button"
                          onClick={() => startCopy(entry)}
                        >
                          Duplicate
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

      {copying && (
        <div className="modal-backdrop" onClick={() => setCopying(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <h2>Duplicate record</h2>
              <button type="button" className="text-button" onClick={() => setCopying(null)}>
                Close
              </button>
            </div>
            <p className="muted">
              Ticked answers carry over. Anything unticked starts blank on the copy, ready to fill
              in.
            </p>

            <div className="row">
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setCopying((current) =>
                    current ? { ...current, keep: new Set(fields.map((f) => f.key)) } : current,
                  )
                }
              >
                Tick all
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setCopying((current) => (current ? { ...current, keep: new Set() } : current))
                }
              >
                Tick none
              </button>
            </div>

            <ul className="copy-list">
              {fields.map((field) => {
                const kept = copying.keep.has(field.key)
                const value = parseValues(copying.entry.answers)[field.key]
                return (
                  <li key={field.key}>
                    <label className="toolbar-toggle">
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={(event) =>
                          setCopying((current) => {
                            if (!current) return current
                            const keep = new Set(current.keep)
                            if (event.target.checked) keep.add(field.key)
                            else keep.delete(field.key)
                            return { ...current, keep }
                          })
                        }
                      />
                      {field.label}
                    </label>
                    <span className={kept ? 'copy-value' : 'copy-value blank'}>
                      {kept ? showValue(field, value) : 'left blank'}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="row">
              <button type="button" className="button" onClick={makeCopy}>
                Create copy
              </button>
              <button type="button" className="button ghost" onClick={() => setCopying(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * One row of the designer: a field's name, its choices, and whether it repeats.
 * Ticking "Repeats" turns the field into a section with its own fields inside;
 * a field already inside one cannot, because sections do not nest.
 */
function FieldRow({
  field,
  first,
  last,
  nested,
  onPatch,
  onMove,
  onRemove,
  onToggleRepeat,
}: {
  field: FormField
  first: boolean
  last: boolean
  nested?: boolean
  onPatch: (patch: Partial<FormField>) => void
  onMove: (by: number) => void
  onRemove: () => void
  onToggleRepeat?: (on: boolean) => void
}) {
  const repeats = field.type === 'group'
  return (
    <div className="field-builder-row">
      <label>
        {repeats ? 'Section name' : 'Field name'}
        <input
          value={field.label}
          onChange={(event) => onPatch({ label: event.target.value })}
          placeholder={repeats ? 'e.g. Appliance — name one of them' : 'e.g. Serial number'}
        />
      </label>
      {repeats ? (
        <span />
      ) : (
        <label>
          Choices, separated by commas
          <input
            value={(field.options ?? []).join(', ')}
            onChange={(event) => onPatch({ options: event.target.value.split(',') })}
            placeholder="leave blank for a free box"
          />
        </label>
      )}
      {nested ? (
        <span />
      ) : (
        <label className="toolbar-toggle">
          <input
            type="checkbox"
            checked={repeats}
            onChange={(event) => onToggleRepeat?.(event.target.checked)}
          />
          Repeats
        </label>
      )}
      <span className="field-kind">
        {repeats
          ? 'Section'
          : field.label.trim()
            ? typeLabel(inferType(field.label, (field.options ?? []).some((o) => o.trim())))
            : ''}
      </span>
      <div className="field-builder-actions">
        <button type="button" className="text-button" disabled={first} onClick={() => onMove(-1)}>
          Up
        </button>
        <button type="button" className="text-button" disabled={last} onClick={() => onMove(1)}>
          Down
        </button>
        <button type="button" className="text-button danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}

/** A block of fields filled in once per appliance, job, or whatever repeats. */
function RepeatingSection({
  field,
  rows,
  onChange,
}: {
  field: FormField
  rows: Record<string, string>[]
  onChange: (rows: Record<string, string>[]) => void
}) {
  const subs = field.fields ?? []
  const name = field.label || 'entry'

  return (
    <div className="check-section">
      <h3>{field.label}</h3>
      {rows.length === 0 && <p className="muted">None added.</p>}
      {rows.map((row, index) => (
        <div className="repeat-row" key={index}>
          <div className="repeat-head">
            <span className="repeat-no">
              {name} {index + 1}
            </span>
            <button
              type="button"
              className="text-button danger"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          <div className="form-grid">
            {subs.map((sub) => (
              <label key={sub.key} className={sub.type === 'textarea' ? 'field-wide' : undefined}>
                {sub.label}
                <FieldInput
                  field={sub}
                  value={row[sub.key] ?? ''}
                  onChange={(value) =>
                    onChange(rows.map((r, i) => (i === index ? { ...r, [sub.key]: value } : r)))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="row">
        <button type="button" className="button ghost" onClick={() => onChange([...rows, {}])}>
          Add {name.toLowerCase()}
        </button>
      </div>
    </div>
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
      />
    )
  }
  if (field.type === 'choice' || field.type === 'yesno') {
    const options = field.type === 'yesno' ? ['Yes', 'No'] : (field.options ?? [])
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
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
    />
  )
}
