import { useEffect, useMemo, useState } from 'react'
import { boilersApi } from '../api/client'
import type { Boiler } from '../api/types'
import { isSold } from '../components/BoilerSelect'
import { useSoldBoilers } from '../context/SoldBoilersContext'
import { boilerMap, sortBoilers } from '../lib/format'

/**
 * `boilers` is every boiler on the register, which is what a picker needs so a
 * historic record can still name the boiler it was written against. `visible`
 * respects the sidebar's sold-boilers switch, and is what a list should show.
 */
export function useBoilers() {
  const [boilers, setBoilers] = useState<Boiler[]>([])
  const [loaded, setLoaded] = useState(false)
  const { showSold } = useSoldBoilers()

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
    () => (showSold ? boilers : boilers.filter((boiler) => !isSold(boiler))),
    [boilers, showSold],
  )
  return { boilers, visible, byId, loaded }
}
