import { useMemo, useState, type FormEvent } from 'react'
import { cleaningApi } from '../api/client'
import type { CleaningEntry } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { boilerLabel, nearestHour, showDate, today } from '../lib/format'
import {
  CLEANING_FORMS,
  COLUMN_LABELS,
  countAnswered,
  countItems,
  defectItems,
  emptyAnswers,
  findForm,
  parseAnswers,
  startingAnswers,
  type CheckColumn,
  type CleaningAnswers,
} from '../lib/cleaningForms'

const empty = () => ({
  date: today(),
  time: nearestHour(),
  staff: '',
  boiler_id: '',
  form_code: '',
  answers: '',
  work_done: '',
  duration: '',
  next_due: '',
  parts: '',
  engineer: '',
  outcome: '',
})

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function Cleaning() {
  const { boilers, byId } = useBoilers()
  const ledger = useLedger<CleaningEntry, ReturnType<typeof empty>>({
    api: cleaningApi,
    empty,
    toForm: (entry) => ({
      date: entry.date,
      time: entry.time || '',
      staff: entry.staff,
      boiler_id: entry.boiler_id === null ? '' : String(entry.boiler_id),
      form_code: entry.form_code || '',
      answers: entry.answers || '',
      work_done: entry.work_done || '',
      duration: entry.duration || '',
      next_due: entry.next_due || '',
      parts: entry.parts || '',
      engineer: entry.engineer || '',
      outcome: entry.outcome || '',
    }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [chosenCode, setChosenCode] = useState('')
  const [answers, setAnswers] = useState<CleaningAnswers>(emptyAnswers)
  const [viewing, setViewing] = useState<CleaningEntry | null>(null)

  const form = findForm(chosenCode)

  function start(code: string) {
    const definition = findForm(code)
    ledger.cancel()
    setChosenCode(code)
    setAnswers(startingAnswers(definition))
    ledger.setField('form_code', code)
    ledger.setField('date', today())
    ledger.setField('time', nearestHour())
    if (definition) ledger.setField('next_due', addDays(definition.intervalDays))
    setFormOpen(true)
  }

  function edit(entry: CleaningEntry) {
    ledger.edit(entry)
    setChosenCode(entry.form_code || '')
    setAnswers(parseAnswers(entry.answers || ''))
    setFormOpen(true)
  }

  function close() {
    ledger.cancel()
    setChosenCode('')
    setAnswers(emptyAnswers())
    setFormOpen(false)
  }

  function setItem(no: number, column: CheckColumn, checked: boolean) {
    setAnswers((current) => {
      const key = String(no)
      const existing = current.items[key] ?? {}
      // One answer per item: ticking a box clears the others, and ticking the
      // same box again clears it.
      const item = checked ? { [column]: true, note: existing.note } : { note: existing.note }
      return { ...current, items: { ...current.items, [key]: item } }
    })
  }

  function setNote(no: number, note: string) {
    setAnswers((current) => {
      const key = String(no)
      return { ...current, items: { ...current.items, [key]: { ...(current.items[key] ?? {}), note } } }
    })
  }

  function setExtra(name: string, value: string) {
    setAnswers((current) => ({ ...current, extras: { ...current.extras, [name]: value } }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    ledger.setField('answers', JSON.stringify(answers))
    // setField is async, so build the payload here rather than trusting state.
    const payload = { ...ledger.form, form_code: chosenCode, answers: JSON.stringify(answers) }
    const saved = ledger.editingId
      ? await cleaningApi.update(ledger.editingId, payload).then((r) => r.data.item).catch(() => null)
      : await cleaningApi.create(payload).then((r) => r.data.item).catch(() => null)
    if (saved) {
      await ledger.refresh()
      close()
    }
  }

  const rows = useMemo(
    () =>
      ledger.items.map((entry) => {
        const definition = findForm(entry.form_code || '')
        const parsed = parseAnswers(entry.answers || '')
        return {
          entry,
          definition,
          parsed,
          defects: defectItems(definition, parsed).length,
          answered: countAnswered(definition, parsed),
          total: countItems(definition),
        }
      }),
    [ledger.items],
  )

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>Cleaning</h1>
        </div>
      </div>

      {!formOpen && (
        <section className="card">
          <div className="card-head">
            <h2>Start a check</h2>
          </div>
          <div className="form-picker">
            {CLEANING_FORMS.map((item) => (
              <button key={item.code} type="button" className="form-choice" onClick={() => start(item.code)}>
                <strong>{item.code}</strong>
                <span>{item.title}</span>
                <em>{item.frequency}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {formOpen && (
        <form className="card form-panel" onSubmit={(event) => void onSubmit(event)}>
          <div className="card-head">
            <h2>
              {chosenCode} · {form?.title ?? 'Cleaning record'}
            </h2>
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
                onChange={(event) => ledger.setField('date', event.target.value)}
                required
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={ledger.form.time}
                onChange={(event) => ledger.setField('time', event.target.value)}
              />
            </label>
            <label>
              Operator
              <input
                value={ledger.form.staff}
                onChange={(event) => ledger.setField('staff', event.target.value)}
                required
              />
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
              Next check due
              <input
                type="date"
                value={ledger.form.next_due}
                onChange={(event) => ledger.setField('next_due', event.target.value)}
              />
            </label>
          </div>

          {form?.sections.map((section, index) => (
            <div key={section.heading ?? index} className="check-section">
              {section.heading && <h3>{section.heading}</h3>}
              {section.items.map((item) => {
                const answer = answers.items[String(item.no)] ?? {}
                return (
                  <div className="check-item" key={item.no}>
                    <p className="check-text">
                      <span className="check-no">{item.no}</span>
                      {item.text}
                    </p>
                    <div className="check-boxes">
                      {item.columns.map((column) => (
                        <label key={column} className="check-box">
                          <input
                            type="checkbox"
                            checked={Boolean(answer[column])}
                            onChange={(event) => setItem(item.no, column, event.target.checked)}
                          />
                          {COLUMN_LABELS[column]}
                        </label>
                      ))}
                    </div>
                    <input
                      className="check-note"
                      value={answer.note ?? ''}
                      onChange={(event) => setNote(item.no, event.target.value)}
                      placeholder={item.note ?? 'Notes'}
                    />
                  </div>
                )
              })}
            </div>
          ))}

          {form && form.extras.length > 0 && (
            <div className="check-section">
              <h3>Record</h3>
              <div className="form-grid">
                {form.extras.map((extra) => (
                  <label key={extra.name} className={extra.kind === 'textarea' ? 'field-wide' : undefined}>
                    {extra.label}
                    {extra.kind === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={answers.extras[extra.name] ?? ''}
                        onChange={(event) => setExtra(extra.name, event.target.value)}
                      />
                    ) : extra.kind === 'select' ? (
                      <select
                        value={answers.extras[extra.name] ?? ''}
                        onChange={(event) => setExtra(extra.name, event.target.value)}
                      >
                        <option value="">Not set</option>
                        {(extra.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={extra.kind === 'date' ? 'date' : extra.kind === 'number' ? 'number' : 'text'}
                        value={answers.extras[extra.name] ?? ''}
                        onChange={(event) => setExtra(extra.name, event.target.value)}
                        placeholder={extra.placeholder}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            <button type="submit" className="button" disabled={ledger.saving}>
              {ledger.editingId ? 'Save changes' : 'Save check'}
            </button>
            <button type="button" className="button ghost" onClick={close}>
              Cancel
            </button>
          </div>
          {ledger.error && <p className="err">{ledger.error}</p>}
          <p className="hint">
            {countAnswered(form, answers)} of {countItems(form)} items ticked.
          </p>
        </form>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Completed checks</h2>
          <span className="count">{rows.length}</span>
        </div>
        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">Nothing recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Form</th>
                  <th>Boiler</th>
                  <th>Operator</th>
                  <th className="num">Items</th>
                  <th className="num">Defects</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, definition, defects, answered, total }) => (
                  <tr key={entry.id}>
                    <td className="nowrap" data-label="Date">
                      {showDate(entry.date)}
                      {entry.time ? ` ${entry.time}` : ''}
                    </td>
                    <td className="nowrap" data-label="Form">
                      {entry.form_code ? `${entry.form_code} · ${definition?.title ?? ''}` : 'Free text'}
                    </td>
                    <td className="nowrap" data-label="Boiler">
                      {entry.boiler_id === null ? '—' : boilerLabel(byId.get(entry.boiler_id))}
                    </td>
                    <td data-label="Operator">{entry.staff}</td>
                    <td className="num" data-label="Items">
                      {total ? `${answered}/${total}` : '—'}
                    </td>
                    <td className={`num${defects > 0 ? ' suspect-value' : ''}`} data-label="Defects">
                      {total ? defects : '—'}
                    </td>
                    <td className="actions">
                      <button type="button" className="text-button" onClick={() => setViewing(entry)}>
                        View
                      </button>
                      <button type="button" className="text-button" onClick={() => edit(entry)}>
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

      {viewing && <CompletedCheck entry={viewing} onClose={() => setViewing(null)} boilerName={
        viewing.boiler_id === null ? '—' : boilerLabel(byId.get(viewing.boiler_id))
      } />}
    </div>
  )
}

function CompletedCheck({
  entry,
  boilerName,
  onClose,
}: {
  entry: CleaningEntry
  boilerName: string
  onClose: () => void
}) {
  const definition = findForm(entry.form_code || '')
  const parsed = parseAnswers(entry.answers || '')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide-modal" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h2>
            {entry.form_code || 'Cleaning'} · {showDate(entry.date)}
            {entry.time ? ` ${entry.time}` : ''}
          </h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Form</dt>
            <dd>{definition?.title ?? 'Free text'}</dd>
          </div>
          <div>
            <dt>Boiler</dt>
            <dd>{boilerName}</dd>
          </div>
          <div>
            <dt>Operator</dt>
            <dd>{entry.staff}</dd>
          </div>
          <div>
            <dt>Next due</dt>
            <dd>{entry.next_due ? showDate(entry.next_due) : '—'}</dd>
          </div>
        </dl>

        {definition?.sections.map((section, index) => (
          <div key={section.heading ?? index} className="check-section">
            {section.heading && <h3>{section.heading}</h3>}
            {section.items.map((item) => {
              const answer = parsed.items[String(item.no)] ?? {}
              const ticked = item.columns.filter((column) => answer[column])
              const flagged = Boolean(answer.defect || answer.fail)
              return (
                <p className={`check-result${flagged ? ' flagged' : ''}`} key={item.no}>
                  <span className="check-no">{item.no}</span>
                  <span>{item.text}</span>
                  <strong>{ticked.length ? ticked.map((c) => COLUMN_LABELS[c]).join(', ') : 'Not answered'}</strong>
                  {answer.note && <em>{answer.note}</em>}
                </p>
              )
            })}
          </div>
        ))}

        {definition && definition.extras.some((extra) => parsed.extras[extra.name]) && (
          <div className="check-section">
            <h3>Record</h3>
            <dl className="detail-list">
              {definition.extras
                .filter((extra) => parsed.extras[extra.name])
                .map((extra) => (
                  <div key={extra.name}>
                    <dt>{extra.label}</dt>
                    <dd>{parsed.extras[extra.name]}</dd>
                  </div>
                ))}
            </dl>
          </div>
        )}

        {entry.work_done && <p className="muted">{entry.work_done}</p>}
      </div>
    </div>
  )
}
