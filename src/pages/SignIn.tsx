import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function SignIn() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin-page">
      <form className="card signin-card" onSubmit={(event) => void onSubmit(event)}>
        <div className="brand signin-brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="currentColor" />
            <circle cx="16" cy="16" r="10.5" fill="none" stroke="#c9a227" strokeWidth="1.4" />
            <circle cx="16" cy="16" r="6.5" fill="none" stroke="#d7e4d6" strokeWidth="1.4" />
            <circle cx="16" cy="16" r="2.2" fill="#efe6d4" />
          </svg>
          <strong>BiomassWood</strong>
        </div>

        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="err">{error}</p>}
      </form>
    </div>
  )
}
