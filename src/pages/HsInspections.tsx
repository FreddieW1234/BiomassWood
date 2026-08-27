import { boilersApi, hsInspectionsApi, sitesApi } from '../api/client'
import type { HsInspection } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { boilerLabel, idValue, showDate, today } from '../lib/format'
import { HS_OUTCOMES, displayLabel } from '../lib/options'

const empty = () => ({
  site_id: '',
  boiler_id: '',
  date: today(),
  inspector: '',
  outcome: '',
  findings: '',
  next_due: '',
  notes: '',
})

export function HsInspections() {
  const { items: sites, byId: sitesById } = useList(sitesApi)
  const { items: boilers, byId: boilersById } = useList(boilersApi)

  return (
    <RecordPage<HsInspection>
      title="H&S inspections"
      tableTitle="Inspections"
      api={hsInspectionsApi}
      empty={empty}
      toForm={(item) => ({
        site_id: idValue(item.site_id),
        boiler_id: idValue(item.boiler_id),
        date: item.date,
        inspector: item.inspector,
        outcome: item.outcome,
        findings: item.findings,
        next_due: item.next_due,
        notes: item.notes,
      })}
      fields={[
        { name: 'date', label: 'Date', kind: 'date', required: true, width: 'half' },
        { name: 'inspector', label: 'Inspector', required: true, width: 'half' },
        {
          name: 'site_id',
          label: 'Site',
          kind: 'select',
          options: sites.map((site) => ({ value: String(site.id), label: site.name })),
          emptyLabel: 'Not set',
          width: 'half',
        },
        {
          name: 'boiler_id',
          label: 'Boiler',
          kind: 'select',
          options: boilers.map((boiler) => ({ value: String(boiler.id), label: boilerLabel(boiler) })),
          emptyLabel: 'Not boiler-specific',
          width: 'half',
        },
        { name: 'outcome', label: 'Outcome', kind: 'select', options: HS_OUTCOMES, emptyLabel: 'Not set' },
        { name: 'findings', label: 'Findings', kind: 'textarea', rows: 3 },
        { name: 'next_due', label: 'Next due', kind: 'date' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Inspector', cell: (item) => item.inspector },
        { header: 'Outcome', className: 'nowrap', cell: (item) => displayLabel(item.outcome) },
        { header: 'Site', cell: (item) => (item.site_id ? sitesById.get(item.site_id)?.name || '—' : '—') },
        { header: 'Boiler', className: 'nowrap', cell: (item) => (item.boiler_id ? boilerLabel(boilersById.get(item.boiler_id)) : '—') },
        { header: 'Next due', className: 'nowrap', cell: (item) => showDate(item.next_due) },
      ]}
    />
  )
}