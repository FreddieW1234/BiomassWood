import { useEffect, useState, type FormEvent } from 'react'
import {
  documentsApi,
  downloadDocumentFile,
  listResource,
  uploadDocumentFile,
} from '../api/client'
import type { DocumentEntry } from '../api/types'
import { useLedger } from '../hooks/useLedger'
import { recordLabel, showDate, today } from '../lib/format'
import { DOC_TYPES, DOCUMENT_RESOURCES } from '../lib/options'

const empty = () => ({
  linked_resource: 'boilers',
  linked_id: '',
  doc_type: '',
  title: '',
  date: today(),
  expires_on: '',
  notes: '',
})

export function Documents() {
  const ledger = useLedger<DocumentEntry, ReturnType<typeof empty>>({
    api: documentsApi,
    empty,
    toForm: (item) => ({
      linked_resource: item.linked_resource,
      linked_id: String(item.linked_id),
      doc_type: item.doc_type,
      title: item.title,
      date: item.date,
      expires_on: item.expires_on,
      notes: item.notes,
    }),
  })
  const [file, setFile] = useState<File | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    let cancelled = false
    listResource(ledger.form.linked_resource)
      .then((result) => {
        if (cancelled) return
        setOptions(
          result.data.items.map((item) => ({
            value: String(item.id),
            label: recordLabel(item),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [ledger.form.linked_resource])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const saved = await ledger.submit()
    if (!saved) return
    if (file) {
      try {
        await uploadDocumentFile(saved.id, file)
        await ledger.refresh()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'File upload failed')
      }
    }
    setFile(null)
    setFormOpen(false)
  }

  function close() {
    ledger.cancel()
    setFile(null)
    setFormOpen(false)
  }

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>Documents</h1>
        </div>
        {!formOpen && (
          <button type="button" className="button" onClick={() => setFormOpen(true)}>
            New document
          </button>
        )}
      </div>

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>{ledger.editingId ? 'Edit document' : 'New document'}</h2>
            <button type="button" className="text-button" onClick={close}>
              Close
            </button>
          </div>
          <div className="form-body">
          <label>
            Linked to
            <select
              value={ledger.form.linked_resource}
              onChange={(event) => {
                ledger.setField('linked_resource', event.target.value)
                ledger.setField('linked_id', '')
              }}
              required
            >
              {DOCUMENT_RESOURCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Record
            <select
              value={ledger.form.linked_id}
              onChange={(event) => ledger.setField('linked_id', event.target.value)}
              required
            >
              <option value="">Select…</option>
              {options.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Document type
            <select
              value={ledger.form.doc_type}
              onChange={(event) => ledger.setField('doc_type', event.target.value)}
              required
            >
              <option value="">Select…</option>
              {DOC_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={ledger.form.title}
              onChange={(event) => ledger.setField('title', event.target.value)}
            />
          </label>
          <div className="field-row">
            <label>
              Date
              <input
                type="date"
                value={ledger.form.date}
                onChange={(event) => ledger.setField('date', event.target.value)}
              />
            </label>
            <label>
              Expires
              <input
                type="date"
                value={ledger.form.expires_on}
                onChange={(event) => ledger.setField('expires_on', event.target.value)}
              />
            </label>
          </div>
          <label>
            File
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            Notes
            <textarea
              value={ledger.form.notes}
              onChange={(event) => ledger.setField('notes', event.target.value)}
              rows={2}
            />
          </label>
          </div>
          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Add document'}
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
            <h2>Library</h2>
            <span className="count">{ledger.items.length}</span>
          </div>
          {ledger.loading ? (
            <p className="muted">Loading…</p>
          ) : ledger.items.length === 0 ? (
            <p className="muted">No documents yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Linked</th>
                    <th>File</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((item) => (
                    <tr key={item.id}>
                      <td className="nowrap">{showDate(item.date)}</td>
                      <td>{item.title || item.doc_type}</td>
                      <td className="nowrap">
                        {item.linked_resource} #{item.linked_id}
                      </td>
                      <td className="nowrap">{item.original_filename || '—'}</td>
                      <td className="actions">
                        {item.original_filename && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => void downloadDocumentFile(item.id, item.original_filename)}
                          >
                            Download
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            ledger.edit(item)
                            setFormOpen(true)
                          }}
                        >
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
    </div>
  )
}