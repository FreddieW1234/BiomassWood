import { fuelSuppliersApi } from '../api/client'
import type { FuelSupplier } from '../api/types'
import { RecordPage } from '../components/RecordPage'

const empty = () => ({ name: '', bsl_sfr_number: '', contact: '', notes: '' })

export function FuelSuppliers() {
  return (
    <RecordPage<FuelSupplier>
      title="Fuel suppliers"
      tableTitle="Suppliers"
      api={fuelSuppliersApi}
      empty={empty}
      toForm={(item) => ({
        name: item.name,
        bsl_sfr_number: item.bsl_sfr_number,
        contact: item.contact,
        notes: item.notes,
      })}
      fields={[
        { name: 'name', label: 'Supplier name', required: true },
        { name: 'bsl_sfr_number', label: 'BSL / SFR number', width: 'half' },
        { name: 'contact', label: 'Contact', width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Name', cell: (item) => item.name },
        { header: 'BSL / SFR', className: 'nowrap', cell: (item) => item.bsl_sfr_number || '—' },
        { header: 'Contact', cell: (item) => item.contact || '—' },
      ]}
    />
  )
}