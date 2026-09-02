import type { Boiler } from '../api/types'

export function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Now, rounded to the nearest hour: 08:20 -> 08:00, 08:40 -> 09:00. */
export function nearestHour(now = new Date()) {
  const rounded = new Date(now)
  if (rounded.getMinutes() >= 30) rounded.setHours(rounded.getHours() + 1)
  rounded.setMinutes(0, 0, 0)
  return `${String(rounded.getHours()).padStart(2, '0')}:00`
}

/** The clock time now, HH:MM -- what a check recorded on the spot happened at. */
export function clockTime(now = new Date()) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** A date that many days after the given one, both YYYY-MM-DD. */
export function addDaysTo(date: string, days: number) {
  const moved = new Date(`${date}T00:00:00`)
  moved.setDate(moved.getDate() + days)
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-${String(moved.getDate()).padStart(2, '0')}`
}

export function showDate(value: string) {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

export function money(value: number) {
  return gbp.format(value)
}

const num = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

export function figure(value: number) {
  return num.format(value)
}

export function boilerLabel(boiler: Boiler | undefined | null) {
  if (!boiler) return '—'
  return `No. ${boiler.number} · ${boiler.type}`
}

// Boiler numbers are text and have gaps. Sort them as numbers, with No. 33
// (the boiler relocated from Fforestfach) sitting next to No. 3 where it
// physically belongs. Anything non-numeric sorts last.
/**
 * Was this boiler still ours on that date? A blank date means every boiler
 * that has ever been on the register.
 */
export function ownedOn(boiler: Boiler, asOf: string) {
  if (!asOf) return true
  const gone = (boiler.sold_on || boiler.decommissioned_on || '').trim()
  return !gone || gone >= asOf
}

export function boilerSortKey(number: string) {
  if (number === '33') return 3.5
  const parsed = Number.parseInt(number, 10)
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

export function compareBoilers(a: Boiler, b: Boiler) {
  const diff = boilerSortKey(a.number) - boilerSortKey(b.number)
  if (diff !== 0 && Number.isFinite(diff)) return diff
  return a.number.localeCompare(b.number, 'en', { numeric: true })
}

export function sortBoilers(boilers: Boiler[]) {
  return [...boilers].sort(compareBoilers)
}

export function boilerMap(boilers: Boiler[]) {
  const map = new Map<number, Boiler>()
  for (const boiler of boilers) map.set(boiler.id, boiler)
  return map
}

export function idValue(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

export function namedMap<T extends { id: number }>(items: T[]) {
  const map = new Map<number, T>()
  for (const item of items) map.set(item.id, item)
  return map
}

export function recordLabel(item: Record<string, unknown> | undefined | null) {
  if (!item) return '—'
  const id = Number(item.id)
  if (item.number != null && String(item.number) && item.type) {
    return `No. ${String(item.number)} · ${String(item.type)}`
  }
  if (typeof item.name === 'string' && item.name) return item.name
  if (typeof item.title === 'string' && item.title) return item.title
  if (typeof item.serial_number === 'string' && item.serial_number) return item.serial_number
  if (typeof item.date === 'string' && item.date) return `${showDate(item.date)} (#${id})`
  return `#${id}`
}
