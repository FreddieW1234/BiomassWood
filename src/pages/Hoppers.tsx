import { boilersApi, hoppersApi, sitesApi } from '../api/client'
import type { Hopper } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { idValue, sortBoilers } from '../lib/format'

const empty = () => ({
  name: '',
  site_id: '',
  location: '',
  notes: '',
})

export function Hoppers() {
  const { items: sites, byId } = useList(sitesApi)
  const { items: boilers } = useList(boilersApi)

  // Which boilers this hopper feeds. Set on the boiler itself, shown here.
  const fed = (hopperId: number) =>
    sortBoilers(boilers.filter((boiler) => boiler.hopper_id === hopperId))

  return (
    <RecordPage<Hopper>
      title="Hoppers"
      tableTitle="Hoppers"
      api={hoppersApi}
      empty={empty}
      toForm={(item) => ({
        name: item.name,
        site_id: idValue(item.site_id),
        location: item.location,
        notes: item.notes,
      })}
      fields={[
        { name: 'name', label: 'Hopper name', required: true, placeholder: 'e.g. Warehouse hopper' },
        {
          name: 'site_id',
          label: 'Site',
          kind: 'select',
          options: sites.map((site) => ({ value: String(site.id), label: site.name })),
          emptyLabel: 'No site',
          width: 'half',
        },
        { name: 'location', label: 'Location', width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      hint="Assign boilers to a hopper on the Boilers page — each boiler picks the hopper that feeds it."
      columns={[
        { header: 'Name', cell: (item) => item.name },
        {
          header: 'Site',
          cell: (item) => (item.site_id ? byId.get(item.site_id)?.name || `#${item.site_id}` : '—'),
        },
        { header: 'Location', cell: (item) => item.location || '—' },
        {
          header: 'Feeds',
          cell: (item) => {
            const list = fed(item.id)
            if (list.length === 0) return 'No boilers yet'
            return list.map((boiler) => `No. ${boiler.number}`).join(', ')
          },
        },
      ]}
    />
  )
}
