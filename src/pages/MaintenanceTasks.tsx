import { boilersApi, maintenanceApi, maintenanceTasksApi, maintenanceTemplatesApi } from '../api/client'
import type { MaintenanceTask } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { boilerLabel, idValue, showDate, today } from '../lib/format'
import { displayLabel, selectOptions, TASK_STATUSES } from '../lib/options'

const empty = () => ({
  boiler_id: '',
  template_id: '',
  title: '',
  due_on: today(),
  status: 'open',
  completed_on: '',
  record_id: '',
  notes: '',
})

export function MaintenanceTasks() {
  const { items: boilers, byId: boilersById } = useList(boilersApi)
  const { items: templates, byId: templatesById } = useList(maintenanceTemplatesApi)
  const { items: records } = useList(maintenanceApi)

  return (
    <RecordPage<MaintenanceTask>
      title="Maintenance tasks"
      tableTitle="Tasks"
      api={maintenanceTasksApi}
      empty={empty}
      toForm={(item) => ({
        boiler_id: String(item.boiler_id),
        template_id: idValue(item.template_id),
        title: item.title,
        due_on: item.due_on,
        status: item.status || 'open',
        completed_on: item.completed_on,
        record_id: idValue(item.record_id),
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
        { name: 'title', label: 'Title', required: true },
        {
          name: 'template_id',
          label: 'Template',
          kind: 'select',
          options: templates.map((item) => ({ value: String(item.id), label: item.name })),
          emptyLabel: 'None',
        },
        { name: 'due_on', label: 'Due', kind: 'date', required: true, width: 'half' },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: selectOptions(TASK_STATUSES),
          required: true,
          width: 'half',
        },
        { name: 'completed_on', label: 'Completed', kind: 'date', width: 'half' },
        {
          name: 'record_id',
          label: 'Completion record',
          kind: 'select',
          options: records.map((item) => ({
            value: String(item.id),
            label: `#${item.id} · ${showDate(item.date)}`,
          })),
          emptyLabel: 'None',
          width: 'half',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Due', className: 'nowrap', cell: (item) => showDate(item.due_on) },
        { header: 'Boiler', className: 'nowrap', cell: (item) => boilerLabel(boilersById.get(item.boiler_id)) },
        { header: 'Title', cell: (item) => item.title },
        { header: 'Status', className: 'nowrap', cell: (item) => displayLabel(item.status) },
        {
          header: 'Template',
          cell: (item) => (item.template_id ? templatesById.get(item.template_id)?.name || '—' : '—'),
        },
      ]}
    />
  )
}