import type { Boiler } from '../api/types'
import { useSoldBoilers } from '../context/SoldBoilersContext'

type Props = {
  boilers: Boiler[]
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function isSold(boiler: Boiler) {
  return boiler.status === 'SOLD_TRANSFERRED'
}

export function BoilerSelect({ boilers, value, onChange, required }: Props) {
  const { showSold } = useSoldBoilers()
  // Hiding sold boilers must never hide the one a record already points at,
  // or editing an old entry would silently change which boiler it belongs to.
  const listed = showSold
    ? boilers
    : boilers.filter((boiler) => !isSold(boiler) || String(boiler.id) === value)

  return (
    <select
      className="boiler-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    >
      <option value="">{required ? 'Select a boiler…' : 'Not boiler-specific'}</option>
      {listed.map((boiler) => {
        const sold = isSold(boiler)
        const detail = [`No. ${boiler.number}`, boiler.type, boiler.location].filter(Boolean).join(' · ')
        return (
          <option
            key={boiler.id}
            value={String(boiler.id)}
            // Sold boilers stay selectable for historic entries, but should be
            // obvious. Option backgrounds are honoured on desktop browsers.
            className={sold ? 'option-sold' : undefined}
            style={sold ? { background: '#fdf3d0' } : undefined}
          >
            {detail}
            {sold ? '  —  SOLD' : ''}
          </option>
        )
      })}
    </select>
  )
}
