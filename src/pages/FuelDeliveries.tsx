import {
  boilersApi,
  fuelBatchesApi,
  fuelDeliveriesApi,
  fuelStoresApi,
  fuelSuppliersApi,
} from '../api/client'
import type { FuelDelivery } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { boilerLabel, figure, idValue, showDate, today } from '../lib/format'
import { YES_NO, fuelLabel } from '../lib/options'

// Rows created before this field existed have no value at all, so tolerate undefined.
function baggedMark(value: string | undefined) {
  const text = (value ?? '').trim().toLowerCase()
  if (text === 'yes') return '✓'
  if (text === 'no') return '✗'
  return '—'
}

function batchLabel(id: number, batches: { id: number; fuel_type: string }[]) {
  const batch = batches.find((item) => item.id === id)
  return batch ? `Batch #${id} · ${fuelLabel(batch.fuel_type)}` : `Batch #${id}`
}

const empty = () => ({
  batch_id: '',
  store_id: '',
  boiler_id: '',
  date: today(),
  quantity: '',
  unit: 't',
  bagged: '',
  invoice_number: '',
  ticket_number: '',
  storage_condition: '',
  contamination: '',
  first_used_on: '',
  notes: '',
})

export function FuelDeliveries() {
  const { items: batches, byId: batchesById } = useList(fuelBatchesApi)
  const { items: stores, byId: storesById } = useList(fuelStoresApi)
  const { items: boilers, byId: boilersById } = useList(boilersApi)
  const { byId: suppliersById } = useList(fuelSuppliersApi)

  const supplierName = (batchId: number) => {
    const supplierId = batchesById.get(batchId)?.supplier_id
    return (supplierId && suppliersById.get(supplierId)?.name) || '—'
  }

  // The sheet these came from has a column per fuel type; the quantity lands
  // in whichever column matches the batch. Units are kg unless stated.
  const quantityIn = (item: FuelDelivery, fuelType: string) => {
    if (batchesById.get(item.batch_id)?.fuel_type !== fuelType) return ''
    return item.unit && item.unit !== 'kg'
      ? `${figure(item.quantity)} ${item.unit}`
      : figure(item.quantity)
  }

  return (
    <RecordPage<FuelDelivery>
      title="Fuel deliveries"
      tableTitle="Deliveries"
      api={fuelDeliveriesApi}
      empty={empty}
      toForm={(item) => ({
        batch_id: String(item.batch_id),
        store_id: idValue(item.store_id),
        boiler_id: idValue(item.boiler_id),
        date: item.date,
        quantity: String(item.quantity),
        unit: item.unit,
        bagged: item.bagged ?? '',
        invoice_number: item.invoice_number,
        ticket_number: item.ticket_number,
        storage_condition: item.storage_condition,
        contamination: item.contamination,
        first_used_on: item.first_used_on,
        notes: item.notes,
      })}
      fields={[
        {
          name: 'batch_id',
          label: 'Batch',
          kind: 'select',
          required: true,
          options: batches.map((batch) => ({
            value: String(batch.id),
            label: batchLabel(batch.id, batches),
          })),
        },
        { name: 'date', label: 'Delivery date', kind: 'date', required: true, width: 'half' },
        { name: 'quantity', label: 'Quantity', kind: 'number', required: true, width: 'half' },
        { name: 'unit', label: 'Unit', required: true, placeholder: 't, m³, kg', width: 'half' },
        {
          name: 'bagged',
          label: 'Bagged?',
          kind: 'select',
          options: YES_NO,
          emptyLabel: 'Not recorded',
          width: 'half',
        },
        {
          name: 'store_id',
          label: 'Store location',
          kind: 'select',
          options: stores.map((store) => ({ value: String(store.id), label: store.name })),
          emptyLabel: 'Not set',
          width: 'half',
        },
        {
          name: 'boiler_id',
          label: 'Boiler (optional)',
          kind: 'select',
          options: boilers.map((boiler) => ({ value: String(boiler.id), label: boilerLabel(boiler) })),
          emptyLabel: 'Not boiler-specific',
        },
        { name: 'invoice_number', label: 'Invoice number', width: 'half' },
        { name: 'ticket_number', label: 'Ticket / vehicle ref', width: 'half' },
        { name: 'storage_condition', label: 'Storage condition at receipt' },
        { name: 'contamination', label: 'Contamination' },
        { name: 'first_used_on', label: 'First used', kind: 'date' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Supplier name', className: 'nowrap', cell: (item) => supplierName(item.batch_id) },
        { header: 'Delivery note number', className: 'num', cell: (item) => item.ticket_number || '—' },
        { header: 'Round', className: 'num', cell: (item) => quantityIn(item, 'roundwood') },
        { header: 'Chip', className: 'num', cell: (item) => quantityIn(item, 'wood_chip') },
        { header: 'Pellet', className: 'num', cell: (item) => quantityIn(item, 'pellet') },
        { header: 'Bagged?', className: 'nowrap', cell: (item) => baggedMark(item.bagged) },
        {
          header: 'Store Location',
          cell: (item) => (item.store_id ? storesById.get(item.store_id)?.name || '—' : '—'),
        },
        {
          header: 'Boiler',
          className: 'nowrap',
          cell: (item) => (item.boiler_id ? boilerLabel(boilersById.get(item.boiler_id)) : '—'),
        },
      ]}
      hint={batches.length === 0 ? 'Add a fuel batch first.' : undefined}
    />
  )
}