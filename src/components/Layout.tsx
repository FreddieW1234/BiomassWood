import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConnection } from '../context/ConnectionContext'

function statusKind(connected: boolean, error: string | null) {
  if (error) return 'down'
  if (connected) return 'up'
  return 'idle'
}

export function Layout() {
  const { health, lastError, lastMs, checking, ping } = useConnection()
  const { user, isAdmin, signOut } = useAuth()
  const kind = statusKind(Boolean(health?.ok), lastError)

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="currentColor" />
            <circle cx="16" cy="16" r="10.5" fill="none" stroke="#c9a227" strokeWidth="1.4" />
            <circle cx="16" cy="16" r="6.5" fill="none" stroke="#d7e4d6" strokeWidth="1.4" />
            <circle cx="16" cy="16" r="2.2" fill="#efe6d4" />
          </svg>
          <div>
            <strong>BiomassWood</strong>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <p className="nav-label">Records</p>
          <NavLink to="/cleaning">Cleaning</NavLink>
          <NavLink to="/maintenance">Maintenance</NavLink>
          <NavLink to="/meter-readings">Meter readings</NavLink>
          <NavLink to="/rhi-usage">RHI usage</NavLink>
          <NavLink to="/earnings">Earnings</NavLink>
          <NavLink to="/solar">Solar</NavLink>
          <p className="nav-label">Fuel</p>
          <NavLink to="/fuel-suppliers">Suppliers</NavLink>
          <NavLink to="/fuel-batches">Batches</NavLink>
          <NavLink to="/fuel-deliveries">Deliveries</NavLink>
          <NavLink to="/fuel-consumption">Usage</NavLink>
          <NavLink to="/fuel-stores">Stores</NavLink>
          <p className="nav-label">Compliance</p>
          <NavLink to="/maintenance-tasks">Tasks</NavLink>
          <NavLink to="/maintenance-templates">Templates</NavLink>
          <NavLink to="/defects">Defects</NavLink>
          <NavLink to="/hs-inspections">H&S</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <p className="nav-label">Setup</p>
          <NavLink to="/sites">Sites</NavLink>
          <NavLink to="/boilers">Boilers</NavLink>
          {isAdmin && <NavLink to="/users">Users</NavLink>}
        </nav>

        <div className="sidebar-foot">
          <div className="signed-in">
            <span>{user?.display_name || user?.username}</span>
            <button type="button" className="text-button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
          <button
            type="button"
            className={`status-pill status-${kind}`}
            onClick={() => void ping()}
            title="Click to re-check the connection"
          >
            <span className="status-dot" />
            <span>
              {checking && 'Checking…'}
              {!checking && kind === 'up' && 'Server connected'}
              {!checking && kind === 'down' && 'Server unreachable'}
              {!checking && kind === 'idle' && 'Not checked yet'}
            </span>
          </button>
          {lastError && kind === 'down' && <p className="muted">{lastError}</p>}
          {lastMs !== null && <p className="muted">Last check {lastMs} ms</p>}
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
