import { containersApi, fuelConsumptionApi, hoppersApi } from '../api/client'
import type { FuelConsumption } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { figure, showDate, today } from '../lib/format'


const empty = () => ({
  hopper_id: '',
  date: today(),
  time: '',
  quantity: '',
  container_id: '',
  notes: '',
})

export function FuelConsumptionPage() {
  const { items: hoppers, byId: hoppersById } = useList(hoppersApi)
  const { items: containers, byId: containersById } = useList(containersApi)

  const containerLabel = (id: number) => {
    const found = containersById.get(id)
    if (!found) return '—'
    return found.size ? `${found.name} - ${found.size}${found.unit}` : found.name
  }

  // Bags are a weight and buckets a volume, so a row total keeps its own unit.
  const rowTotal = (id: number, quantity: number) => {
    const found = containersById.get(id)
    if (!found || !found.size) return '—'
    return `${Number((found.size * quantity).toFixed(2))} ${found.unit}`
  }

  return (
    <RecordPage<FuelConsumption>
      title="Filling"
      tableTitle="Fillings"
      api={fuelConsumptionApi}
      empty={empty}
      toForm={(item) => ({
        hopper_id: String(item.hopper_id ?? ''),
        date: item.date,
        time: item.time ?? '',
        quantity: String(item.quantity),
        container_id: String(item.container_id ?? ''),
        notes: item.notes,
      })}
      fields={[
        {
          name: 'hopper_id',
          label: 'Hopper',
          kind: 'select',
          required: true,
          options: hoppers.map((hopper) => ({ value: String(hopper.id), label: hopper.name })),
        },
        { name: 'date', label: 'Date', kind: 'date', required: true, width: 'half' },
        { name: 'time', label: 'Time', placeholder: 'e.g. 07:30', width: 'half' },
        {
          name: 'quantity',
          label: 'Quantity',
          kind: 'number',
          required: true,
          placeholder: 'How many',
          width: 'half',
        },
        {
          name: 'container_id',
          label: 'Container',
          kind: 'select',
          required: true,
          options: containers.map((item) => ({
            value: String(item.id),
            label: item.size ? `${item.name} - ${item.size}${item.unit}` : item.name,
          })),
          width: 'half',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      hint={hoppers.length === 0 ? 'Add a hopper first on the Hoppers page.' : undefined}
      columns={[
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Time', className: 'nowrap', cell: (item) => item.time || '—' },
        {
          header: 'Hopper',
          className: 'nowrap',
          cell: (item) => hoppersById.get(item.hopper_id)?.name || '—',
        },
        { header: 'Quantity', className: 'num', cell: (item) => figure(item.quantity) },
        { header: 'Container', cell: (item) => containerLabel(item.container_id) },
        {
          header: 'Total',
          className: 'num',
          cell: (item) => rowTotal(item.container_id, item.quantity),
        },
      ]}
    />
  )
}
