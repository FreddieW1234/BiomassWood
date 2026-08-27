import { boilersApi, defectsApi } from '../api/client'
import type { Defect } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { boilerLabel, showDate, today } from '../lib/format'
import { selectOptions, DEFECT_SEVERITIES } from '../lib/options'

const empty = () => ({
  boiler_id: '',
  date: today(),
  description: '',
  severity: '',
  status: 'open',
  closed_on: '',
  notes: '',
})

export function Defects() {
  const { items: boilers, byId } = useList(boilersApi)

  return (
    <RecordPage<Defect>
      title="Defects"
      tableTitle="Defects"
      api={defectsApi}
      empty={empty}
      toForm={(item) => ({
        boiler_id: String(item.boiler_id),
        date: item.date,
        description: item.description,
        severity: item.severity,
        status: item.status,
        closed_on: item.closed_on,
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
        { name: 'date', label: 'Date', kind: 'date', required: true, width: 'half' },
        {
          name: 'severity',
          label: 'Severity',
          kind: 'select',
          options: selectOptions(DEFECT_SEVERITIES),
          emptyLabel: 'Not set',
          width: 'half',
        },
        { name: 'description', label: 'Description', kind: 'textarea', required: true, rows: 3 },
        { name: 'status', label: 'Status', placeholder: 'open / closed', width: 'half' },
        { name: 'closed_on', label: 'Closed', kind: 'date', width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Boiler', className: 'nowrap', cell: (item) => boilerLabel(byId.get(item.boiler_id)) },
        { header: 'Description', className: 'wrap', cell: (item) => item.description },
        { header: 'Severity', className: 'nowrap', cell: (item) => item.severity || '—' },
        { header: 'Status', className: 'nowrap', cell: (item) => item.status || '—' },
      ]}
    />
  )
}