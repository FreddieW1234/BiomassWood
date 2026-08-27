import { useState, type FormEvent } from 'react'
import { changeOwnPassword, setAuthToken, usersApi } from '../api/client'
import type { ManagedUser } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useAuth } from '../context/AuthContext'
import { showDate } from '../lib/format'
import { displayLabel } from '../lib/options'

const empty = () => ({
  username: '',
  display_name: '',
  role: 'staff',
  password: '',
  active: 'yes',
})

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff — add and edit records' },
  { value: 'admin', label: 'Admin — everything, including accounts' },
]

export function Users() {
  const { user } = useAuth()

  return (
    <>
      <RecordPage<ManagedUser>
        title="Users"
        tableTitle="Accounts"
        api={usersApi}
        empty={empty}
        toForm={(item) => ({
          username: item.username,
          display_name: item.display_name,
          role: item.role,
          password: '',
          active: item.active ? 'yes' : 'no',
        })}
        fields={[
          {
            name: 'username',
            label: 'Username or email',
            required: true,
            placeholder: 'e.g. tony@michton.com',
            width: 'half',
          },
          { name: 'display_name', label: 'Full name', width: 'half' },
          { name: 'role', label: 'Role', kind: 'select', options: ROLE_OPTIONS, required: true },
          {
            name: 'active',
            label: 'Account enabled',
            kind: 'select',
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No — cannot sign in' },
            ],
            width: 'half',
          },
          {
            name: 'password',
            label: 'Password',
            placeholder: 'At least 10 characters',
            width: 'half',
          },
        ]}
        hint="Leave the password blank when editing to keep the current one. Setting a password signs that person out everywhere."
        columns={[
          { header: 'Username', className: 'nowrap', cell: (item) => item.username },
          { header: 'Name', cell: (item) => item.display_name || '—' },
          { header: 'Role', className: 'nowrap', cell: (item) => displayLabel(item.role) },
          {
            header: 'Enabled',
            className: 'nowrap',
            cell: (item) => (item.active ? '✓' : '✗'),
          },
          {
            header: 'Last signed in',
            className: 'nowrap',
            cell: (item) => (item.last_login_at ? showDate(item.last_login_at.slice(0, 10)) : 'Never'),
          },
        ]}
        toPayload={(form) => {
          const payload: Record<string, unknown> = {
            username: form.username,
            display_name: form.display_name,
            role: form.role,
            active: form.active === 'yes',
          }
          // Blank means "leave the password alone" when editing.
          if (form.password) payload.password = form.password
          return payload
        }}
      />

      <div className="page wide" style={{ marginTop: '-0.5rem' }}>
        <ChangeOwnPassword username={user?.username ?? ''} />
      </div>
    </>
  )
}

function ChangeOwnPassword({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (next !== repeat) {
      setError('The new passwords do not match')
      return
    }
    setBusy(true)
    try {
      const result = await changeOwnPassword(current, next)
      // The server ends every other session, so adopt the fresh token here.
      setAuthToken(result.data.token)
      try {
        window.localStorage.setItem('biomasswood.token', result.data.token)
      } catch {
        // storage may be unavailable; the in-memory token still works
      }
      setCurrent('')
      setNext('')
      setRepeat('')
      setOpen(false)
      setMessage('Password changed. Any other device you were signed in on has been signed out.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Your password ({username})</h2>
        {!open && (
          <button type="button" className="text-button" onClick={() => setOpen(true)}>
            Change
          </button>
        )}
      </div>
      {message && <p className="hint">{message}</p>}
      {open && (
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Current password
            <input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Repeat new password
            <input
              type="password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <div className="field-wide row">
            <button type="submit" className="button" disabled={busy}>
              Save password
            </button>
            <button type="button" className="button ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {error && <p className="err field-wide">{error}</p>}
        </form>
      )}
    </section>
  )
}
