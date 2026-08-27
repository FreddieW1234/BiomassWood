export const BOILER_STATUSES = [
  'ACTIVE',
  'TEMPORARILY_INACTIVE',
  'SOLD_TRANSFERRED',
  'DECOMMISSIONED',
  'SCRAPPED',
  'ARCHIVED',
]

export const FUEL_TYPES = [
  { value: 'pellet', label: 'Wood pellets' },
  { value: 'wood_chip', label: 'Wood chip' },
  { value: 'pellet_chip', label: 'Pellet / wood chip' },
  { value: 'roundwood', label: 'Roundwood timber' },
  { value: 'other', label: 'Other approved biomass' },
]

export const SUPPLY_ROUTES = [
  { value: 'purchased', label: 'Purchased' },
  { value: 'self_supplied', label: 'Self-supplied' },
]

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const STORE_TYPES = ['silo', 'bunker', 'shed', 'container', 'external bay', 'other']

export const TASK_STATUSES = ['open', 'done', 'overdue']

export const HS_OUTCOMES = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'incomplete', label: 'Incomplete' },
]

export const DEFECT_SEVERITIES = ['low', 'medium', 'high']

export const DOC_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'delivery_ticket', label: 'Delivery ticket' },
  { value: 'emissions_certificate', label: 'Emissions certificate' },
  { value: 'photo', label: 'Photo' },
  { value: 'annual_declaration', label: 'Annual declaration' },
  { value: 'other', label: 'Other' },
]

export const MANUFACTURERS = ['FACI', 'Moretti Camini', 'Ala-Talkkari Veto']

export const DOCUMENT_RESOURCES = [
  { value: 'boilers', label: 'Boiler' },
  { value: 'sites', label: 'Site' },
  { value: 'fuel-stores', label: 'Fuel store' },
  { value: 'fuel-suppliers', label: 'Fuel supplier' },
  { value: 'fuel-batches', label: 'Fuel batch' },
  { value: 'fuel-deliveries', label: 'Fuel delivery' },
  { value: 'fuel-consumption', label: 'Fuel usage' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'meter-readings', label: 'Meter reading' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'maintenance-templates', label: 'Maintenance template' },
  { value: 'maintenance-tasks', label: 'Maintenance task' },
  { value: 'defects', label: 'Defect' },
  { value: 'hs-inspections', label: 'H&S inspection' },
]

export const ALERT_LINKS: Record<string, string> = {
  boilers: '/boilers',
  cleaning: '/cleaning',
  maintenance: '/maintenance',
  'maintenance-tasks': '/maintenance-tasks',
  'hs-inspections': '/hs-inspections',
  documents: '/documents',
}

// Stored values stay lowercase; only the label is dressed up for display.
export function selectOptions(values: string[]) {
  return values.map((value) => {
    const text = value.replaceAll('_', ' ')
    return { value, label: text.charAt(0).toUpperCase() + text.slice(1) }
  })
}

export function statusLabel(value: string) {
  if (!value) return 'Active'
  const text = value.replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function fuelLabel(value: string) {
  if (!value) return '—'
  const match = FUEL_TYPES.find((option) => option.value === value)
  return match ? match.label : value.replaceAll('_', ' ')
}
