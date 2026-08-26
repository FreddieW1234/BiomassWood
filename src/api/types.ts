export type HealthResponse = {
  ok: boolean
  service: string
  time: string
  database: string
  boilerCount: number
  cleaningCount: number
  maintenanceCount: number
  meterReadingCount: number
  earningCount: number
  siteCount?: number
  fuelStoreCount?: number
  fuelSupplierCount?: number
  fuelBatchCount?: number
  fuelDeliveryCount?: number
  fuelConsumptionCount?: number
  maintenanceTemplateCount?: number
  maintenanceTaskCount?: number
  defectCount?: number
  hsInspectionCount?: number
  documentCount?: number
  'rhi-yearsCount'?: number
  'rhi-usageCount'?: number
  'solar-readingsCount'?: number
  'solar-submissionsCount'?: number
}

export type AlertItem = {
  kind: string
  resource: string
  id: number
  due: string
  text: string
}

type Timestamps = {
  id: number
  created_at: string
  updated_at: string
}

export type Site = Timestamps & {
  name: string
  address: string
  notes: string
}

export type Boiler = Timestamps & {
  number: string
  type: string
  location: string
  notes: string
  site_id: number | null
  manufacturer: string
  model: string
  serial_number: string
  fuel_type: string
  nominal_output_kw: number
  installed_on: string
  accredited_on: string
  scheme: string
  emissions_certificate: string
  permitted_fuels: string
  status: string
  heat_uses: string
  operator: string
  rhi_number: string
  serial_number_2: string
  heat_calculator: string
  flowmeter: string
  meter_changed_on: string
  commissioned_on: string
  opening_reading: number
  sold_on: string
  sold_to: string
  final_reading: number
  decommissioned_on: string
  final_reading_on: string
  final_reading_submitted_on: string
  sale_agent: string
  ofgem_notified: string
  reaccredited: string
  new_rhi_number: string
}

export type RhiYear = Timestamps & {
  boiler_id: number
  year_index: number
  tier1_kwh: number
  notes: string
}

export type RhiUsage = Timestamps & {
  boiler_id: number
  year_index: number
  quarter: number
  kwh: number
  notes: string
}

export type SolarReading = Timestamps & {
  date: string
  reading: number
  notes: string
}

export type SolarSubmission = Timestamps & {
  date: string
  submission_no: string
  reading: number
  units: number
  price_per_unit: number
  total: number
  notes: string
}

export type FuelStore = Timestamps & {
  site_id: number | null
  name: string
  store_type: string
  capacity: string
  location: string
  moisture_protection: string
  fire_protection: string
  notes: string
}

export type FuelSupplier = Timestamps & {
  name: string
  bsl_sfr_number: string
  contact: string
  notes: string
}

export type FuelBatch = Timestamps & {
  supplier_id: number | null
  fuel_type: string
  supply_route: string
  grade: string
  bsl_sfr_number: string
  moisture_content: string
  species: string
  virgin_wood: string
  harvest_location: string
  harvest_from: string
  harvest_to: string
  felling_reference: string
  roundwood_qty: number
  roundwood_unit: string
  chipping_contractor: string
  chipped_on: string
  chip_location: string
  chip_qty: number
  chip_unit: string
  quality_notes: string
  notes: string
}

export type FuelDelivery = Timestamps & {
  batch_id: number
  store_id: number | null
  boiler_id: number | null
  date: string
  quantity: number
  unit: string
  invoice_number: string
  ticket_number: string
  storage_condition: string
  contamination: string
  first_used_on: string
  notes: string
}

export type FuelConsumption = Timestamps & {
  boiler_id: number
  batch_id: number | null
  store_id: number | null
  date: string
  quantity: number
  unit: string
  notes: string
}

export type CleaningEntry = Timestamps & {
  date: string
  staff: string
  boiler_id: number | null
  work_done: string
  duration: string
  next_due: string
  parts: string
  engineer: string
  outcome: string
}

export type MaintenanceEntry = Timestamps & {
  date: string
  staff: string
  boiler_id: number | null
  work_done: string
  duration: string
  next_due: string
  parts: string
  engineer: string
  outcome: string
}

export type MeterReading = Timestamps & {
  date: string
  boiler_id: number
  reading: number
  staff: string
  notes: string
  reading_at: string
}

export type EarningEntry = Timestamps & {
  date: string
  scheme: string
  amount: number
  boiler_id: number | null
  notes: string
}

export type MaintenanceTemplate = Timestamps & {
  manufacturer: string
  boiler_type: string
  name: string
  interval_days: number
  checklist: string
  notes: string
}

export type MaintenanceTask = Timestamps & {
  boiler_id: number
  template_id: number | null
  title: string
  due_on: string
  status: string
  completed_on: string
  record_id: number | null
  notes: string
}

export type Defect = Timestamps & {
  boiler_id: number
  date: string
  description: string
  severity: string
  status: string
  closed_on: string
  notes: string
}

export type HsInspection = Timestamps & {
  site_id: number | null
  boiler_id: number | null
  date: string
  inspector: string
  outcome: string
  findings: string
  next_due: string
  notes: string
}

export type DocumentEntry = Timestamps & {
  linked_resource: string
  linked_id: number
  doc_type: string
  title: string
  date: string
  expires_on: string
  original_filename: string
  checksum: string
  notes: string
}

export type ListResponse<T> = { items: T[] }
export type ItemResponse<T> = { item: T }
export type DeleteResponse = { ok: boolean; id: number }

export type ConnectionSettings = {
  apiUrl: string
  apiKey: string
}
