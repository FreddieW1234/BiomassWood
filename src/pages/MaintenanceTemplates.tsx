import { maintenanceTemplatesApi } from '../api/client'
import type { MaintenanceTemplate } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { MANUFACTURERS } from '../lib/options'

const empty = () => ({
  manufacturer: '',
  boiler_type: '',
  name: '',
  interval_days: '',
  checklist: '',
  notes: '',
})

export function MaintenanceTemplates() {
  return (
    <RecordPage<MaintenanceTemplate>
      title="Maintenance templates"
      tableTitle="Templates"
      api={maintenanceTemplatesApi}
      empty={empty}
      toForm={(item) => ({
        manufacturer: item.manufacturer,
        boiler_type: item.boiler_type,
        name: item.name,
        interval_days: item.interval_days ? String(item.interval_days) : '',
        checklist: item.checklist,
        notes: item.notes,
      })}
      fields={[
        { name: 'name', label: 'Template name', required: true, placeholder: 'e.g. Annual service' },
        {
          name: 'manufacturer',
          label: 'Manufacturer',
          list: 'template-mfr',
          listValues: MANUFACTURERS,
          width: 'half',
        },
        { name: 'boiler_type', label: 'Boiler type', placeholder: 'pellet / wood chip', width: 'half' },
        { name: 'interval_days', label: 'Interval (days)', kind: 'number' },
        { name: 'checklist', label: 'Checklist', kind: 'textarea', rows: 4 },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Name', cell: (item) => item.name },
        { header: 'Manufacturer', cell: (item) => item.manufacturer || '—' },
        { header: 'Type', cell: (item) => item.boiler_type || '—' },
        { header: 'Every', className: 'nowrap', cell: (item) => (item.interval_days ? `${item.interval_days} days` : '—') },
      ]}
    />
  )
}