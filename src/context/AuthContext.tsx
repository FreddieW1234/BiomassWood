import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as apiLogin, logout as apiLogout, setAuthToken } from '../api/client'
import type { AuthUser } from '../api/types'

type AuthState = {
  user: AuthUser | null
  ready: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const TOKEN_KEY = 'biomasswood.token'

const AuthContext = createContext<AuthState | null>(null)

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function storeToken(token: string) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // a browser with storage disabled still works, just not across reloads
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  // Resume a stored session on load, and drop it if the server disagrees.
  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setReady(true)
      return
    }
    setAuthToken(token)
    getCurrentUser()
      .then((result) => setUser(result.data.user))
      .catch(() => {
        setAuthToken('')
        storeToken('')
      })
      .finally(() => setReady(true))
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password)
    setAuthToken(result.data.token)
    storeToken(result.data.token)
    setUser(result.data.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // signing out locally matters more than telling the server
    }
    setAuthToken('')
    storeToken('')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, isAdmin: user?.role === 'admin' }),
    [user, ready, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
