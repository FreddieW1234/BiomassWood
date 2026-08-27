import { useEffect, useRef, useState } from 'react'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Props = {
  /** YYYY-MM */
  value: string
  onChange: (value: string) => void
  /** Earliest year offered. */
  minYear?: number
  /** Latest year offered. */
  maxYear?: number
}

export function MonthPicker({ value, onChange, minYear = 2013, maxYear }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear())
  const box = useRef<HTMLDivElement>(null)

  const selectedYear = Number(value.slice(0, 4))
  const selectedMonth = Number(value.slice(5, 7))
  const lastYear = maxYear ?? new Date().getFullYear() + 1

  // Reopening should land on the year you are looking at, not the last one browsed.
  useEffect(() => {
    if (open) setYear(Number(value.slice(0, 4)) || new Date().getFullYear())
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function onDocument(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocument)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocument)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(monthIndex: number) {
    onChange(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  const label = selectedMonth ? `${FULL[selectedMonth - 1]} ${selectedYear}` : 'Pick a month'

  return (
    <div className="month-picker" ref={box}>
      <button type="button" className="month-trigger" onClick={() => setOpen((o) => !o)}>
        {label}
      </button>

      {open && (
        <div className="month-pop">
          <div className="month-years">
            <button
              type="button"
              onClick={() => setYear((y) => Math.max(minYear, y - 1))}
              disabled={year <= minYear}
              aria-label="Previous year"
            >
              ‹
            </button>
            <strong>{year}</strong>
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(lastYear, y + 1))}
              disabled={year >= lastYear}
              aria-label="Next year"
            >
              ›
            </button>
          </div>
          <div className="month-grid">
            {MONTHS.map((name, index) => {
              const isSelected = year === selectedYear && index + 1 === selectedMonth
              return (
                <button
                  key={name}
                  type="button"
                  className={isSelected ? 'on' : undefined}
                  onClick={() => choose(index)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
