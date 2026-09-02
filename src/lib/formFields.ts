import type { AnswerValue, FormField, FormFieldType } from '../api/types'

export const FIELD_TYPES: { id: FormFieldType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'textarea', label: 'Long text' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
  { id: 'yesno', label: 'Yes / No' },
  { id: 'choice', label: 'Choice' },
  { id: 'group', label: 'Repeats' },
]

/**
 * What kind of box a field should be, worked out from what it is called.
 * Nobody building a form wants to answer "what type is this?" about a field
 * named "Cost" -- the name already said so.
 *
 * Deliberately cautious: anything not clearly a date, a figure, a yes/no or a
 * paragraph stays a plain text box, because a wrong guess is worse than a dull
 * one. Giving a field choices settles it outright.
 */
export function inferType(label: string, hasOptions: boolean): FormFieldType {
  if (hasOptions) return 'choice'
  const text = label.trim().toLowerCase()
  if (!text) return 'text'

  // Longest phrases first: "work done" is a paragraph rather than a yes/no,
  // and "date received" is a date rather than a question.
  if (
    /\bnotes?\b|\bdescriptions?\b|\bdetails?\b|\bcomments?\b|\bwork done\b|\bfaults?\b|\bsummary\b|\bfindings?\b/.test(
      text,
    )
  ) {
    return 'textarea'
  }
  if (/\bdates?\b|\bday\b|\bon$/.test(text)) return 'date'
  if (
    /\bcosts?\b|\bprices?\b|\bamount\b|\btotal\b|\bqty\b|\bquantity\b|\bhours?\b|\bkwh\b|\bkg\b|\bfees?\b|\bcharges?\b/.test(
      text,
    )
  ) {
    return 'number'
  }
  if (
    /\?$|^(is|was|has|have|were|are|did)\b|\b(received|reported|completed|required|attended|notifiable|approved|paid|signed)\b/.test(
      text,
    )
  ) {
    return 'yesno'
  }
  return 'text'
}

export function typeLabel(type: FormFieldType) {
  return FIELD_TYPES.find((entry) => entry.id === type)?.label ?? 'Text'
}

/**
 * A stable key for a field, derived from its label the first time it is named.
 * Records store their values against the key, so renaming "Cost" to "Cost (net)"
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

export function parseValues(raw: string): Record<string, AnswerValue> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, AnswerValue>) : {}
  } catch {
    return {}
  }
}

/** A leaf answer as text, whatever was stored under it. */
export function leafValue(value: AnswerValue | undefined) {
  return typeof value === 'string' ? value : ''
}

/** The repeats held under a group field. */
export function groupRows(value: AnswerValue | undefined): Record<string, string>[] {
  return Array.isArray(value) ? value : []
}

function showDateish(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

/** What a value should read as in the table. */
export function showValue(field: FormField, value: AnswerValue | undefined): string {
  if (field.type === 'group') {
    const rows = groupRows(value)
    if (rows.length === 0) return '—'
    // One repeat per line, in the order the group's own fields are in.
    return rows
      .map((row) =>
        (field.fields ?? [])
          .map((sub) => (sub.type === 'date' ? showDateish(row[sub.key] ?? '') : (row[sub.key] ?? '')))
          .filter(Boolean)
          .join(' · '),
      )
      .filter(Boolean)
      .join(' / ')
  }
  const text = leafValue(value)
  if (text === '') return '—'
  if (field.type === 'date') return showDateish(text)
  return text
}
