import type { Boiler } from '../api/types'

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
  return (
    <select
      className="boiler-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    >
      <option value="">{required ? 'Select a boiler…' : 'Not boiler-specific'}</option>
      {boilers.map((boiler) => {
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
