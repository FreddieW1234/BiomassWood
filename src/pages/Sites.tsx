import { sitesApi } from '../api/client'
import type { Site } from '../api/types'
import { RecordPage } from '../components/RecordPage'

const empty = () => ({ name: '', address: '', notes: '' })

export function Sites() {
  return (
    <RecordPage<Site>
      title="Sites"
      tableTitle="Sites"
      api={sitesApi}
      empty={empty}
      toForm={(item) => ({ name: item.name, address: item.address, notes: item.notes })}
      fields={[
        { name: 'name', label: 'Site name', required: true, placeholder: 'e.g. Yard, Farm, Works' },
        { name: 'address', label: 'Address', kind: 'textarea', rows: 2 },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Name', cell: (item) => item.name },
        { header: 'Address', className: 'wrap', cell: (item) => item.address || '—' },
        { header: 'Notes', className: 'wrap', cell: (item) => item.notes || '—' },
      ]}
    />
  )
}