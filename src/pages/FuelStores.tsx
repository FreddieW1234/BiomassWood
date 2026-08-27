import { fuelStoresApi, sitesApi } from '../api/client'
import type { FuelStore } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { idValue } from '../lib/format'
import { selectOptions, STORE_TYPES } from '../lib/options'

const empty = () => ({
  site_id: '',
  name: '',
  store_type: '',
  capacity: '',
  location: '',
  moisture_protection: '',
  fire_protection: '',
  notes: '',
})

export function FuelStores() {
  const { items: sites, byId } = useList(sitesApi)

  return (
    <RecordPage<FuelStore>
      title="Fuel stores"
      tableTitle="Stores"
      api={fuelStoresApi}
      empty={empty}
      toForm={(item) => ({
        site_id: idValue(item.site_id),
        name: item.name,
        store_type: item.store_type,
        capacity: item.capacity,
        location: item.location,
        moisture_protection: item.moisture_protection,
        fire_protection: item.fire_protection,
        notes: item.notes,
      })}
      fields={[
        { name: 'name', label: 'Store name', required: true, placeholder: 'e.g. Chip barn 1' },
        {
          name: 'site_id',
          label: 'Site',
          kind: 'select',
          options: sites.map((site) => ({ value: String(site.id), label: site.name })),
          emptyLabel: 'No site',
          width: 'half',
        },
        {
          name: 'store_type',
          label: 'Type',
          kind: 'select',
          options: selectOptions(STORE_TYPES),
          emptyLabel: 'Not set',
          width: 'half',
        },
        { name: 'capacity', label: 'Capacity', placeholder: 'e.g. 40 t', width: 'half' },
        { name: 'location', label: 'Location', width: 'half' },
        { name: 'moisture_protection', label: 'Moisture protection' },
        { name: 'fire_protection', label: 'Fire protection' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Name', cell: (item) => item.name },
        { header: 'Site', cell: (item) => (item.site_id ? byId.get(item.site_id)?.name || `#${item.site_id}` : '—') },
        { header: 'Type', cell: (item) => item.store_type || '—' },
        { header: 'Capacity', cell: (item) => item.capacity || '—' },
      ]}
    />
  )
}