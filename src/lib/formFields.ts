import type { FormField, FormFieldType } from '../api/types'

export const FIELD_TYPES: { id: FormFieldType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'textarea', label: 'Long text' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
  { id: 'yesno', label: 'Yes / No' },
  { id: 'choice', label: 'Choice' },
]

/**
 * A stable key for a field, derived from its label the first time it is named.
 * Records store their values against the key, so renaming "Cost" to "Cost (£)"
 * later does not lose what has already been entered.
 */
export function fieldKey(label: string, taken: string[]) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}

export function parseFields(raw: string): FormField[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as FormField[]) : []
  } catch {
    return []
  }
}

export function parseValues(raw: string): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** What a value should read as in the table. */
export function showValue(field: FormField, value: string | undefined) {
  if (value === undefined || value === '') return '—'
  if (field.type === 'date') {
    const [y, m, d] = value.split('-')
    return y && m && d ? `${d}/${m}/${y}` : value
  }
  return value
}
