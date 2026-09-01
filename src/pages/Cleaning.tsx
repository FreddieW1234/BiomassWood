import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { cleaningApi, getCleaningDue } from '../api/client'
import type { CleaningDueItem, CleaningEntry } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { MonthPicker } from '../components/MonthPicker'
import { useAuth } from '../context/AuthContext'
import { useBoilers } from '../hooks/useBoilers'
import { useLedger } from '../hooks/useLedger'
import { addDaysTo, boilerLabel, clockTime, nearestHour, showDate, today } from '../lib/format'
import {
  CLEANING_FORMS,
  COLUMN_LABELS,
  RETIRED_EXTRA_LABELS,
  completedAnswers,
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
  notes: '',
})

function thisMonth() {
  return today().slice(0, 7)
}

/** First and last day of a YYYY-MM value. */
function monthRange(month: string) {
  const [year, m] = month.split('-').map(Number)
  const last = new Date(year, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function Cleaning() {
  const { boilers, byId } = useBoilers()
  const { user } = useAuth()
  // A day at a time by default: a whole month of checks is hundreds of rows to
  // scroll past, and what anyone standing at a boiler wants is today.
  const [scope, setScope] = useState<'day' | 'month'>('day')
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(thisMonth)
  const [filterBoiler, setFilterBoiler] = useState('')

  // The log runs to tens of thousands of rows, so never fetch more than the
  // window being looked at.
  const scopedApi = useMemo(() => {
    const { from, to } = scope === 'day' ? { from: day, to: day } : monthRange(month)
    return {
      ...cleaningApi,
      list: () =>
        cleaningApi.list({
          from,
          to,
          limit: 2000,
          boiler_id: filterBoiler || undefined,
        }),
    }
  }, [scope, day, month, filterBoiler])
  // Whoever is signed in is doing the check; their name, not their login.
  const operatorName = user?.display_name?.trim() || user?.username || ''
  const ledger = useLedger<CleaningEntry, ReturnType<typeof empty>>({
    api: scopedApi,
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
      notes: entry.notes || '',
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
    ledger.setField('staff', operatorName)
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
        <TodaysRound
          date={today()}
          operator={operatorName}
          onRecorded={() => void ledger.refresh()}
        />
      )}

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

          <label className="field-wide">
            Notes
            <textarea
              rows={2}
              value={ledger.form.notes}
              onChange={(event) => ledger.setField('notes', event.target.value)}
              placeholder="Anything worth recording about this check as a whole"
            />
          </label>

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
                        {!extra.noEmpty && <option value="">Not set</option>}
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
          <div className="head-actions">
            <div className="view-switch">
              <button
                type="button"
                className={scope === 'day' ? 'on' : ''}
                onClick={() => setScope('day')}
              >
                Day
              </button>
              <button
                type="button"
                className={scope === 'month' ? 'on' : ''}
                onClick={() => setScope('month')}
              >
                Month
              </button>
            </div>
            <label className="toolbar-toggle">
              {scope === 'day' ? 'Date' : 'Month'}
              {scope === 'day' ? (
                <input type="date" value={day} onChange={(event) => setDay(event.target.value)} />
              ) : (
                <MonthPicker value={month} onChange={setMonth} />
              )}
            </label>
            <label className="toolbar-toggle">
              Boiler
              <BoilerSelect boilers={boilers} value={filterBoiler} onChange={setFilterBoiler} />
            </label>
            <span className="count">{rows.length}</span>
          </div>
        </div>
        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">
            {scope === 'day' ? 'No checks recorded on this day.' : 'No checks recorded in this month.'}
          </p>
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

/**
 * The order the boilers are walked on site: batch 1 first (No. 33 stands where
 * No. 3 used to), then the other two batches in number order. The round is
 * listed the way it is actually done, so nobody has to hunt up and down the row.
 */
const WALK_ORDER = ['1', '3', '33', '6', '2', '4', '5']

function walkPosition(number: string) {
  const known = WALK_ORDER.indexOf(number)
  if (known >= 0) return known
  const numeric = Number(number)
  return Number.isFinite(numeric) ? 100 + numeric : 1000
}

/**
 * The day's cleaning round. Every check each boiler is due today, in walking
 * order, recorded with one tap: "Done" fills the whole form in as a clean
 * check, "Not in use" records that the boiler was not running.
 */
function TodaysRound({
  date,
  operator,
  onRecorded,
}: {
  date: string
  operator: string
  onRecorded: () => void
}) {
  const [items, setItems] = useState<CleaningDueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    getCleaningDue(date)
      .then((result) => setItems(result.data.items))
      .catch(() => setError('Could not load the round. Check the connection and reload.'))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => load(), [load])

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          walkPosition(a.number) - walkPosition(b.number) || a.form_code.localeCompare(b.form_code),
      ),
    [items],
  )

  const outstanding = ordered.filter((item) => item.recorded_id === null)

  async function record(item: CleaningDueItem, inUse: boolean) {
    const key = `${item.boiler_id}|${item.form_code}`
    const definition = findForm(item.form_code)
    setBusy(key)
    setError('')
    try {
      await cleaningApi.create({
        date,
        time: clockTime(),
        staff: operator,
        boiler_id: String(item.boiler_id),
        form_code: item.form_code,
        // A boiler that was not running was not checked, so nothing is ticked;
        // the note says why the form is empty.
        answers: JSON.stringify(inUse ? completedAnswers(definition) : startingAnswers(definition)),
        next_due: addDaysTo(date, definition?.intervalDays ?? item.interval_days),
        notes: inUse ? '' : 'Boiler was not in use',
        work_done: '',
        duration: '',
        parts: '',
        engineer: '',
        outcome: '',
      })
      load()
      onRecorded()
    } catch {
      setError('That check could not be saved. Try again.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Today&rsquo;s round</h2>
        <span className="count">
          {loading ? '' : `${outstanding.length} left of ${ordered.length}`}
        </span>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="muted">Nothing due today.</p>
      ) : (
        <ul className="round-list">
          {ordered.map((item) => {
            const key = `${item.boiler_id}|${item.form_code}`
            const definition = findForm(item.form_code)
            const saving = busy === key
            return (
              <li key={key} className={item.recorded_id === null ? undefined : 'round-done'}>
                <div className="round-what">
                  <strong>No. {item.number}</strong>
                  <span>
                    {item.form_code} · {definition?.title ?? 'Check'}
                  </span>
                  <em>
                    {item.recorded_id !== null
                      ? item.recorded_notes || 'Recorded'
                      : item.overdue && item.last_date
                        ? `Last done ${showDate(item.last_date)}`
                        : item.last_date
                          ? `Due today · last ${showDate(item.last_date)}`
                          : 'Never recorded'}
                  </em>
                </div>
                {item.recorded_id === null ? (
                  <div className="round-actions">
                    <button
                      type="button"
                      className="button"
                      disabled={saving}
                      onClick={() => void record(item, true)}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="button ghost"
                      disabled={saving}
                      onClick={() => void record(item, false)}
                    >
                      Not in use
                    </button>
                  </div>
                ) : (
                  <span className="round-tick" aria-label="Recorded">
                    ✓
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="err">{error}</p>}
      {!loading && ordered.length > 0 && (
        <p className="hint">To correct one, edit it in the completed checks below.</p>
      )}
    </section>
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

        {entry.notes && (
          <div className="check-section">
            <h3>Notes</h3>
            <p>{entry.notes}</p>
          </div>
        )}

        {definition &&
          (definition.extras.some((extra) => parsed.extras[extra.name]) ||
            Object.keys(RETIRED_EXTRA_LABELS).some((name) => parsed.extras[name])) && (
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
              {/* Values saved under a field the form no longer has. */}
              {Object.entries(RETIRED_EXTRA_LABELS)
                .filter(([name]) => parsed.extras[name])
                .map(([name, label]) => (
                  <div key={name}>
                    <dt>{label}</dt>
                    <dd>{parsed.extras[name]}</dd>
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
