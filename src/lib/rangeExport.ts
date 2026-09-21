import type { ListQuery, Resource } from '../api/client'

export type RangeExportColumn<T> = {
  label: string
  value: (row: T) => unknown
}

/** One kind of record the dialog can export. */
export type RangeExportSource<T> = {
  key: string
  label: string
  /** Base of the file name: `cleaning` -> `cleaning-2026-09-21.csv`. */
  fileName: string
  load: (from: string, to: string) => Promise<T[]>
  date: (row: T) => string
  boilerId: (row: T) => number | null
  columns: RangeExportColumn<T>[]
}

// Sources of different record types share one dialog, so the dialog only ever
// handles them through their own functions.
export type AnySource = RangeExportSource<never>

export function exportSource<T>(source: RangeExportSource<T>): AnySource {
  return source as unknown as AnySource
}

const PAGE = 5000

/**
 * Every row of a resource in a date range, a page at a time -- the API caps a
 * page at 5,000 and the cleaning log runs to tens of thousands. `dateFiltered`
 * says whether the API itself can filter on the date; if not, the whole table
 * comes down and is trimmed here.
 */
export async function loadRange<T>(
  api: Resource<T>,
  from: string,
  to: string,
  dateOf: (row: T) => string,
  dateFiltered: boolean,
) {
  const query: ListQuery = dateFiltered ? { from: from || undefined, to: to || undefined } : {}
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const result = await api.list({ ...query, limit: PAGE, offset })
    rows.push(...result.data.items)
    if (result.data.items.length < PAGE) break
  }
  return rows.filter((row) => {
    const date = dateOf(row) || ''
    return (!from || date >= from) && (!to || date <= to)
  })
}
