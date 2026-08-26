import { useEffect, useMemo, useState } from 'react'
import { boilersApi } from '../api/client'
import type { Boiler } from '../api/types'
import { boilerMap, sortBoilers } from '../lib/format'

export function useBoilers() {
  const [boilers, setBoilers] = useState<Boiler[]>([])
  const [loaded, setLoaded] = useState(false)

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
  return { boilers, byId, loaded }
}
