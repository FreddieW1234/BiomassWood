import { useMemo } from 'react'
import { fuelBatchesApi, fuelDeliveriesApi, fuelSuppliersApi } from '../api/client'
import type { FuelBatch } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { figure, idValue, showDate } from '../lib/format'
import { FUEL_TYPES, SUPPLY_ROUTES, fuelLabel } from '../lib/options'

const empty = () => ({
  supplier_id: '',
  fuel_type: '',
  supply_route: '',
  grade: '',
  bsl_sfr_number: '',
  moisture_content: '',
  species: '',
  virgin_wood: '',
  harvest_location: '',
  harvest_from: '',
  harvest_to: '',
  felling_reference: '',
  roundwood_qty: '',
  roundwood_unit: '',
  chipping_contractor: '',
  chipped_on: '',
  chip_location: '',
  chip_qty: '',
  chip_unit: '',
  quality_notes: '',
  notes: '',
})

export function FuelBatches() {
  const { items: suppliers, byId } = useList(fuelSuppliersApi)
  const { items: deliveries } = useList(fuelDeliveriesApi)

  // Filling records count containers into a hopper, not kg out of a batch, so
  // this is what was delivered rather than a running stock figure.
  const delivered = useMemo(() => {
    const map = new Map<number, number>()
    for (const row of deliveries) {
      map.set(row.batch_id, (map.get(row.batch_id) || 0) + row.quantity)
    }
    return map
  }, [deliveries])

  return (
    <RecordPage<FuelBatch>
      title="Fuel batches"
      tableTitle="Batches"
      api={fuelBatchesApi}
      empty={empty}
      toForm={(item) => ({
        supplier_id: idValue(item.supplier_id),
        fuel_type: item.fuel_type,
        supply_route: item.supply_route,
        grade: item.grade,
        bsl_sfr_number: item.bsl_sfr_number,
        moisture_content: item.moisture_content,
        species: item.species,
        virgin_wood: item.virgin_wood,
        harvest_location: item.harvest_location,
        harvest_from: item.harvest_from,
        harvest_to: item.harvest_to,
        felling_reference: item.felling_reference,
        roundwood_qty: item.roundwood_qty ? String(item.roundwood_qty) : '',
        roundwood_unit: item.roundwood_unit,
        chipping_contractor: item.chipping_contractor,
        chipped_on: item.chipped_on,
        chip_location: item.chip_location,
        chip_qty: item.chip_qty ? String(item.chip_qty) : '',
        chip_unit: item.chip_unit,
        quality_notes: item.quality_notes,
        notes: item.notes,
      })}
      fields={[
        { name: 'fuel_type', label: 'Fuel type', kind: 'select', required: true, options: FUEL_TYPES },
        {
          name: 'supplier_id',
          label: 'Supplier',
          kind: 'select',
          options: suppliers.map((s) => ({ value: String(s.id), label: s.name })),
          emptyLabel: 'None',
          width: 'half',
        },
        { name: 'supply_route', label: 'Purchased or self-supplied', kind: 'select', options: SUPPLY_ROUTES, width: 'half' },
        { name: 'grade', label: 'Grade / specification', width: 'half' },
        { name: 'bsl_sfr_number', label: 'BSL / SFR number', width: 'half' },
        { name: 'moisture_content', label: 'Moisture content', width: 'half' },
        { name: 'species', label: 'Species mix', width: 'half' },
        { name: 'virgin_wood', label: 'Virgin wood?', placeholder: 'yes / no', width: 'half' },
        { name: 'harvest_location', label: 'Harvest location' },
        { name: 'harvest_from', label: 'Harvest from', kind: 'date', width: 'half' },
        { name: 'harvest_to', label: 'Harvest to', kind: 'date', width: 'half' },
        { name: 'felling_reference', label: 'Felling / forestry reference' },
        { name: 'roundwood_qty', label: 'Roundwood quantity', kind: 'number', width: 'half' },
        { name: 'roundwood_unit', label: 'Roundwood unit', placeholder: 't or m³', width: 'half' },
        { name: 'chipping_contractor', label: 'Chipping contractor', width: 'half' },
        { name: 'chipped_on', label: 'Chipped on', kind: 'date', width: 'half' },
        { name: 'chip_location', label: 'Chipping location' },
        { name: 'chip_qty', label: 'Chip output', kind: 'number', width: 'half' },
        { name: 'chip_unit', label: 'Chip unit', width: 'half' },
        { name: 'quality_notes', label: 'Quality / contamination notes', kind: 'textarea', rows: 2 },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'ID', className: 'nowrap', cell: (item) => `#${item.id}` },
        { header: 'Fuel', className: 'nowrap', cell: (item) => fuelLabel(item.fuel_type) },
        {
          header: 'Supplier',
          cell: (item) => (item.supplier_id ? byId.get(item.supplier_id)?.name || `#${item.supplier_id}` : '—'),
        },
        { header: 'BSL / SFR', className: 'nowrap', cell: (item) => item.bsl_sfr_number || '—' },
        { header: 'Harvest', className: 'nowrap', cell: (item) => showDate(item.harvest_from) },
        {
          header: 'Delivered',
          className: 'num',
          cell: (item) => {
            const total = delivered.get(item.id)
            return total === undefined ? '—' : figure(total)
          },
        },
      ]}
    />
  )
}