import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Whether sold and transferred boilers are shown anywhere in the app.
 *
 * Most of the register is boilers that left years ago, so the default is off
 * and the whole app reads as the site does today. The choice is remembered per
 * browser: it is a way of looking at the data, not a setting anyone else needs.
 */
const STORAGE_KEY = 'biomasswood.showSold'

type SoldBoilersState = {
  showSold: boolean
  setShowSold: (value: boolean) => void
}

const SoldBoilersContext = createContext<SoldBoilersState | null>(null)

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'yes'
  } catch {
    return false
  }
}

export function SoldBoilersProvider({ children }: { children: ReactNode }) {
  const [showSold, setStored] = useState(readStored)

  const setShowSold = useCallback((value: boolean) => {
    setStored(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? 'yes' : 'no')
    } catch {
      // a browser with storage disabled still works, just not across reloads
    }
  }, [])

  const value = useMemo(() => ({ showSold, setShowSold }), [showSold, setShowSold])
  return <SoldBoilersContext.Provider value={value}>{children}</SoldBoilersContext.Provider>
}

export function useSoldBoilers() {
  const context = useContext(SoldBoilersContext)
  if (!context) throw new Error('useSoldBoilers must be used inside SoldBoilersProvider')
  return context
}
