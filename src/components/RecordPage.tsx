import { useState, type FormEvent, type ReactNode } from 'react'
import type { Resource } from '../api/client'
import { useLedger } from '../hooks/useLedger'
import { recordLabel } from '../lib/format'

export type RecordField = {
  name: string
  label: string
  kind?: 'text' | 'textarea' | 'date' | 'time' | 'number' | 'select'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  emptyLabel?: string
  width?: 'half'
  rows?: number
  list?: string
  listValues?: string[]
  step?: string
}

export type RecordColumn<T> = {
  header: string
  className?: string
  cell: (item: T) => ReactNode
}

type Props<T extends { id: number }> = {
  title: string
  tableTitle?: string
  api: Resource<T>
  empty: () => Record<string, string>
  toForm: (item: T) => Record<string, string>
  fields: RecordField[]
  columns: RecordColumn<T>[]
  hint?: string
  /** Filter and/or sort the rows before they are listed. */
  transformItems?: (items: T[]) => T[]
  /** Controls shown beside the "New record" button. */
  toolbar?: ReactNode
  /** Extra buttons at the start of each row's actions cell. */
  rowActions?: (item: T) => ReactNode
  /** Extra controls inside the form, below the fields. */
  formExtras?: (editing: T | null) => ReactNode
  /** Called with the saved row, so a page can attach files afterwards. */
  onSaved?: (item: T) => void | Promise<void>
  /** Convert form strings into the shape the API expects. */
  toPayload?: (form: Record<string, string>) => Record<string, unknown>
  /** Render inside an existing page (a tab) rather than as a page of its own. */
  embedded?: boolean
}

export function RecordPage<T extends { id: number }>({
  title,
  tableTitle = 'Records',
  api,
  empty,
  toForm,
  fields,
  columns,
  hint,
  transformItems,
  toolbar,
  rowActions,
  formExtras,
  onSaved,
  toPayload,
  embedded,
}: Props<T>) {
  const ledger = useLedger<T, Record<string, string>>({ api, empty, toForm, toPayload })
  const [formOpen, setFormOpen] = useState(false)
  const rows = transformItems ? transformItems(ledger.items) : ledger.items
  const editing = ledger.items.find((item) => item.id === ledger.editingId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const saved = await ledger.submit()
    if (!saved) return
    await onSaved?.(saved)
    setFormOpen(false)
  }

  function close() {
    ledger.cancel()
    setFormOpen(false)
  }

  function startEdit(item: T) {
    ledger.edit(item)
    setFormOpen(true)
  }

  const Wrapper = embedded ? 'div' : 'div'

  return (
    <Wrapper className={embedded ? 'embedded-records' : 'page wide'}>
      <div className="page-head with-action">
        {title ? (
          <div>
            <h1>{title}</h1>
          </div>
        ) : (
          <div />
        )}
        <div className="head-actions">
          {toolbar}
          {!formOpen && (
            <button type="button" className="button" onClick={() => setFormOpen(true)}>
              New record
            </button>
          )}
        </div>
      </div>

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>{editing ? `Edit ${recordLabel(editing)}` : 'New record'}</h2>
            <button type="button" className="text-button" onClick={close}>
              Close
            </button>
          </div>
          <div className="form-grid">
            {fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={ledger.form[field.name] ?? ''}
                onChange={(value) => ledger.setField(field.name, value)}
              />
            ))}
          </div>
          {formExtras?.(editing ?? null)}
          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Add record'}
            </button>
            <button type="button" className="button ghost" onClick={close}>
              Cancel
            </button>
          </div>
          {ledger.error && <p className="err">{ledger.error}</p>}
          {hint && <p className="hint">{hint}</p>}
        </form>
      )}

      <section className="card">
        <div className="card-head">
          <h2>{tableTitle}</h2>
          <span className="count">{rows.length}</span>
        </div>
        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">Nothing to show.</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.header} className={column.className}>
                      {column.header}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    {columns.map((column) => (
                      <td key={column.header} className={column.className} data-label={column.header}>
                        {column.cell(item)}
                      </td>
                    ))}
                    <td className="actions">
                      {rowActions?.(item)}
                      <button type="button" className="text-button" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => void ledger.remove(item.id)}
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
    </Wrapper>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: RecordField
  value: string
  onChange: (value: string) => void
}) {
  const kind = field.kind ?? 'text'
  return (
    <label className={kind === 'textarea' ? 'field-wide' : undefined}>
      {field.label}
      {kind === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          required={field.required}
        />
      ) : kind === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">{field.emptyLabel ?? (field.required ? 'Select…' : 'None')}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            type={
              kind === 'date' ? 'date' : kind === 'time' ? 'time' : kind === 'number' ? 'number' : 'text'
            }
            inputMode={kind === 'number' ? 'decimal' : undefined}
            step={kind === 'number' ? field.step ?? 'any' : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            list={field.list}
          />
          {field.list && field.listValues && (
            <datalist id={field.list}>
              {field.listValues.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          )}
        </>
      )}
    </label>
  )
}