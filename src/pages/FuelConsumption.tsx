import { boilersApi, fuelBatchesApi, fuelConsumptionApi, fuelStoresApi } from '../api/client'
import type { FuelConsumption } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { boilerLabel, figure, idValue, showDate, today } from '../lib/format'
import { fuelLabel } from '../lib/options'

const empty = () => ({
  boiler_id: '',
  batch_id: '',
  store_id: '',
  date: today(),
  quantity: '',
  unit: 't',
  notes: '',
})

export function FuelConsumptionPage() {
  const { items: boilers, byId: boilersById } = useList(boilersApi)
  const { items: batches } = useList(fuelBatchesApi)
  const { items: stores, byId: storesById } = useList(fuelStoresApi)

  return (
    <RecordPage<FuelConsumption>
      title="Fuel usage"
      blurb="Quantity taken from a store or batch into a boiler. Stock on the Batches page is deliveries minus these rows."
      tableTitle="Usage"
      api={fuelConsumptionApi}
      empty={empty}
      toForm={(item) => ({
        boiler_id: String(item.boiler_id),
        batch_id: idValue(item.batch_id),
        store_id: idValue(item.store_id),
        date: item.date,
        quantity: String(item.quantity),
        unit: item.unit,
        notes: item.notes,
      })}
      fields={[
        {
          name: 'boiler_id',
          label: 'Boiler',
          kind: 'select',
          required: true,
          options: boilers.map((boiler) => ({ value: String(boiler.id), label: boilerLabel(boiler) })),
        },
        { name: 'date', label: 'Date used', kind: 'date', required: true, width: 'half' },
        { name: 'quantity', label: 'Quantity', kind: 'number', required: true, width: 'half' },
        { name: 'unit', label: 'Unit', required: true, width: 'half' },
        {
          name: 'batch_id',
          label: 'Batch',
          kind: 'select',
          options: batches.map((batch) => ({
            value: String(batch.id),
            label: `Batch #${batch.id} · ${fuelLabel(batch.fuel_type)}`,
          })),
          emptyLabel: 'Not set',
          width: 'half',
        },
        {
          name: 'store_id',
          label: 'Store',
          kind: 'select',
          options: stores.map((store) => ({ value: String(store.id), label: store.name })),
          emptyLabel: 'Not set',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Boiler', className: 'nowrap', cell: (item) => boilerLabel(boilersById.get(item.boiler_id)) },
        { header: 'Qty', className: 'num', cell: (item) => `${figure(item.quantity)} ${item.unit}` },
        { header: 'Batch', className: 'nowrap', cell: (item) => (item.batch_id ? `#${item.batch_id}` : '—') },
        { header: 'Store', cell: (item) => (item.store_id ? storesById.get(item.store_id)?.name || '—' : '—') },
      ]}
    />
  )
}