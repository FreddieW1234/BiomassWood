import { useEffect, useMemo, useState } from 'react'
import { boilersApi } from '../api/client'
import type { Boiler } from '../api/types'
import { useBoilerDate } from '../context/BoilerDateContext'
import { boilerMap, ownedOn, sortBoilers } from '../lib/format'

/**
 * `boilers` is every boiler on the register, which is what a picker needs so a
 * historic record can still name the boiler it was written against. `visible`
 * is those still owned on the sidebar's date, and is what a list should show.
 */
export function useBoilers() {
  const [boilers, setBoilers] = useState<Boiler[]>([])
  const [loaded, setLoaded] = useState(false)
  const { asOf } = useBoilerDate()

  useEffect(() => {
    let cancelled = false
    boilersApi
      .list()
      .then((result) => {
        if (!cancelled) setBoilers(sortBoilers(result.data.items))
      })
      .catch(() => {
        // pages surface their own errors; the selector just stays empty
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byId = useMemo(() => boilerMap(boilers), [boilers])
  const visible = useMemo(
    () => boilers.filter((boiler) => ownedOn(boiler, asOf)),
    [boilers, asOf],
  )
  return { boilers, visible, byId, loaded }
}
