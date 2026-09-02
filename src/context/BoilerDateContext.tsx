import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { today } from '../lib/format'

/**
 * Which boilers the app is looking at: those still owned on a chosen date.
 *
 * A tickbox for sold boilers could only ever say "now" or "everything ever".
 * A date says who was on site when, which is the question compliance actually
 * asks -- the records for April 2022 are wanted for the boilers owned in April
 * 2022, whatever has been sold since.
 *
 * Today is the default, and that behaves as hiding sold boilers used to.
 * Clearing the date shows every boiler that has ever been on the register.
 */
const STORAGE_KEY = 'biomasswood.boilersAsOf'

type BoilerDateState = {
  /** YYYY-MM-DD, or '' for every boiler ever. */
  asOf: string
  setAsOf: (value: string) => void
}

const BoilerDateContext = createContext<BoilerDateState | null>(null)

function readStored() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === null ? today() : saved
  } catch {
    return today()
  }
}

export function BoilerDateProvider({ children }: { children: ReactNode }) {
  const [asOf, setStored] = useState(readStored)

  const setAsOf = useCallback((value: string) => {
    setStored(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // a browser with storage disabled still works, just not across reloads
    }
  }, [])

  const value = useMemo(() => ({ asOf, setAsOf }), [asOf, setAsOf])
  return <BoilerDateContext.Provider value={value}>{children}</BoilerDateContext.Provider>
}

export function useBoilerDate() {
  const context = useContext(BoilerDateContext)
  if (!context) throw new Error('useBoilerDate must be used inside BoilerDateProvider')
  return context
}
