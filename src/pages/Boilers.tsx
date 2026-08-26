import { boilersApi, sitesApi } from '../api/client'
import type { Boiler } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { idValue } from '../lib/format'
import { BOILER_STATUSES, FUEL_TYPES, MANUFACTURERS, selectOptions } from '../lib/options'

const empty = () => ({
  number: '',
  type: '',
  location: '',
  notes: '',
  site_id: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  fuel_type: '',
  nominal_output_kw: '',
  installed_on: '',
  accredited_on: '',
  scheme: '',
  emissions_certificate: '',
  permitted_fuels: '',
  status: 'ACTIVE',
  heat_uses: '',
  operator: '',
  rhi_number: '',
  serial_number_2: '',
  opening_reading: '',
  sold_on: '',
  sold_to: '',
  final_reading: '',
  decommissioned_on: '',
  final_reading_on: '',
  final_reading_submitted_on: '',
  sale_agent: '',
  ofgem_notified: '',
  reaccredited: '',
  new_rhi_number: '',
})

export function Boilers() {
  const { items: sites } = useList(sitesApi)

  return (
    <RecordPage<Boiler>
      title="Boilers"
      blurb="Master register. Cleaning, fuel, meters and tasks all point at these rows. Status stays on the boiler when it is sold or archived."
      tableTitle="Register"
      api={boilersApi}
      empty={empty}
      toForm={(b) => ({
        number: b.number,
        type: b.type,
        location: b.location,
        notes: b.notes,
        site_id: idValue(b.site_id),
        manufacturer: b.manufacturer,
        model: b.model,
        serial_number: b.serial_number,
        fuel_type: b.fuel_type,
        nominal_output_kw: b.nominal_output_kw ? String(b.nominal_output_kw) : '',
        installed_on: b.installed_on,
        accredited_on: b.accredited_on,
        scheme: b.scheme,
        emissions_certificate: b.emissions_certificate,
        permitted_fuels: b.permitted_fuels,
        status: b.status || 'ACTIVE',
        heat_uses: b.heat_uses,
        operator: b.operator,
        rhi_number: b.rhi_number,
        serial_number_2: b.serial_number_2,
        opening_reading: b.opening_reading ? String(b.opening_reading) : '',
        sold_on: b.sold_on,
        sold_to: b.sold_to,
        final_reading: b.final_reading ? String(b.final_reading) : '',
        decommissioned_on: b.decommissioned_on,
        final_reading_on: b.final_reading_on,
        final_reading_submitted_on: b.final_reading_submitted_on,
        sale_agent: b.sale_agent,
        ofgem_notified: b.ofgem_notified,
        reaccredited: b.reaccredited,
        new_rhi_number: b.new_rhi_number,
      })}
      fields={[
        { name: 'number', label: 'Boiler number', required: true, placeholder: 'e.g. 1, 2, B3', width: 'half' },
        { name: 'type', label: 'Type / model name', required: true, placeholder: 'e.g. FACI 150', width: 'half' },
        {
          name: 'site_id',
          label: 'Site',
          kind: 'select',
          options: sites.map((site) => ({ value: String(site.id), label: site.name })),
          emptyLabel: 'No site',
        },
        { name: 'location', label: 'Location on site', placeholder: 'Building or plant room' },
        {
          name: 'manufacturer',
          label: 'Manufacturer',
          list: 'manufacturers',
          listValues: MANUFACTURERS,
          placeholder: 'FACI, Moretti Camini, Ala-Talkkari Veto…',
          width: 'half',
        },
        { name: 'model', label: 'Model', width: 'half' },
        { name: 'serial_number', label: 'Serial number (unit 1)', width: 'half' },
        { name: 'serial_number_2', label: 'Serial number (unit 2)', width: 'half' },
        { name: 'rhi_number', label: 'RHI number', width: 'half' },
        {
          name: 'fuel_type',
          label: 'Fuel type',
          kind: 'select',
          options: FUEL_TYPES,
          emptyLabel: 'Not set',
          width: 'half',
        },
        { name: 'nominal_output_kw', label: 'Nominal output (kW)', kind: 'number', width: 'half' },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: selectOptions(BOILER_STATUSES),
          required: true,
          width: 'half',
        },
        { name: 'installed_on', label: 'Installed', kind: 'date', width: 'half' },
        { name: 'accredited_on', label: 'Accredited / registered', kind: 'date', width: 'half' },
        { name: 'scheme', label: 'Scheme / compliance route', placeholder: 'e.g. RHI', width: 'half' },
        { name: 'operator', label: 'Responsible operator', width: 'half' },
        { name: 'emissions_certificate', label: 'Emissions certificate' },
        { name: 'permitted_fuels', label: 'Permitted fuels' },
        { name: 'heat_uses', label: 'Heat uses', placeholder: 'Space heating, DHW, process, drying…' },
        { name: 'opening_reading', label: 'Opening meter reading', kind: 'number' },
        { name: 'sold_on', label: 'Sold / transferred', kind: 'date', width: 'half' },
        { name: 'sold_to', label: 'Buyer / transfer ref', width: 'half' },
        { name: 'decommissioned_on', label: 'Decommissioned', kind: 'date', width: 'half' },
        { name: 'sale_agent', label: 'Sale agent', width: 'half' },
        { name: 'final_reading', label: 'Final meter reading', kind: 'number', width: 'half' },
        { name: 'final_reading_on', label: 'Final reading date', kind: 'date', width: 'half' },
        {
          name: 'final_reading_submitted_on',
          label: 'Final reading submitted',
          kind: 'date',
          width: 'half',
        },
        { name: 'ofgem_notified', label: 'Ofgem notified?', placeholder: 'Yes / No', width: 'half' },
        { name: 'reaccredited', label: 'Re-accredited?', placeholder: 'Yes / No', width: 'half' },
        { name: 'new_rhi_number', label: 'New RHI number (buyer)', width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 3 },
      ]}
      columns={[
        {
          header: 'No.',
          cell: (item) => <span className="chip">No. {item.number}</span>,
        },
        { header: 'Type', cell: (item) => item.type },
        { header: 'RHI', className: 'nowrap', cell: (item) => item.rhi_number || '—' },
        { header: 'Status', className: 'nowrap', cell: (item) => item.status || 'ACTIVE' },
        { header: 'Fuel', className: 'nowrap', cell: (item) => item.fuel_type || '—' },
        { header: 'Serial', className: 'nowrap', cell: (item) => item.serial_number || '—' },
        { header: 'Location', cell: (item) => item.location || '—' },
      ]}
    />
  )
}