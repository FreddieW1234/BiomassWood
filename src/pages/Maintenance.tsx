import { useMemo, useState } from 'react'
import { annualServicesApi, maintenanceApi, maintenancePartsApi } from '../api/client'
import type { AnnualService, Boiler, MaintenanceEntry, MaintenancePart } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { ExternalWork } from '../components/ExternalWork'
import { RangeExport } from '../components/RangeExport'
import { RecordPage } from '../components/RecordPage'
import { useAuth } from '../context/AuthContext'
import { useBoilers } from '../hooks/useBoilers'
import { figure, money, showDate, today } from '../lib/format'
import { exportSource, loadRange } from '../lib/rangeExport'
import { WORK_TYPES, YES_NO, YES_NO_PENDING } from '../lib/options'

type Tab = 'log' | 'parts' | 'service'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Maintenance & repair' },
  { id: 'parts', label: 'Parts & purchases' },
  { id: 'service', label: 'Annual service' },
]

type Section = 'routine' | 'external'

/** The three routine record types, for the date-range export. */
function routineExports(byId: Map<number, Boiler>) {
  const boiler = (id: number | null) => (id === null ? '' : byId.get(id)?.number ?? id)
  return [
    exportSource<MaintenanceEntry>({
      key: 'log',
      label: 'Maintenance & repair log',
      fileName: 'maintenance',
      load: (from, to) => loadRange(maintenanceApi, from, to, (row) => row.date, true),
      date: (row) => row.date,
      boilerId: (row) => row.boiler_id,
      columns: [
        { label: 'Job no.', value: (row) => row.job_no },
        { label: 'Date of work', value: (row) => row.date },
        { label: 'Boiler', value: (row) => boiler(row.boiler_id) },
        { label: 'Type of work', value: (row) => row.work_type },
        { label: 'Fault / reason for work', value: (row) => row.fault },
        { label: 'Work carried out', value: (row) => row.work_done },
        { label: 'Parts fitted', value: (row) => row.parts },
        { label: 'Carried out by', value: (row) => row.staff },
        { label: 'Contractor / company', value: (row) => row.contractor },
        { label: 'Back in service', value: (row) => row.back_in_service },
        { label: 'Cost (GBP)', value: (row) => row.cost || '' },
        { label: 'Invoice / receipt ref.', value: (row) => row.invoice_ref },
        { label: 'Notifiable change?', value: (row) => row.notifiable },
        { label: 'Reported to Ofgem', value: (row) => row.ofgem_reported_on },
        { label: 'Record source', value: (row) => row.record_source },
        { label: 'Photos', value: (row) => row.photos },
        { label: 'Notes', value: (row) => row.notes },
      ],
    }),
    exportSource<MaintenancePart>({
      key: 'parts',
      label: 'Parts & purchases',
      fileName: 'maintenance-parts',
      load: (from, to) => loadRange(maintenancePartsApi, from, to, (row) => row.purchase_date, false),
      date: (row) => row.purchase_date,
      boilerId: (row) => row.boiler_id,
      columns: [
        { label: 'Purchase date', value: (row) => row.purchase_date },
        { label: 'Order no.', value: (row) => row.order_no },
        { label: 'Boiler', value: (row) => boiler(row.boiler_id) },
        { label: 'Part / consumable', value: (row) => row.part },
        { label: 'Part number', value: (row) => row.part_number },
        { label: 'Quantity', value: (row) => row.quantity || '' },
        { label: 'Supplier', value: (row) => row.supplier },
        { label: 'Unit cost (GBP)', value: (row) => row.unit_cost || '' },
        { label: 'Total cost (GBP)', value: (row) => row.total_cost || '' },
        { label: 'Invoice / receipt ref.', value: (row) => row.invoice_ref },
        { label: 'Date fitted', value: (row) => row.fitted_on },
        { label: 'Fitted by', value: (row) => row.fitted_by },
        { label: 'Notes', value: (row) => row.notes },
      ],
    }),
    exportSource<AnnualService>({
      key: 'service',
      label: 'Annual service',
      fileName: 'annual-services',
      load: (from, to) => loadRange(annualServicesApi, from, to, (row) => row.service_date, false),
      date: (row) => row.service_date,
      boilerId: (row) => row.boiler_id,
      columns: [
        { label: 'Year', value: (row) => row.year },
        { label: 'Service date', value: (row) => row.service_date },
        { label: 'Boiler', value: (row) => boiler(row.boiler_id) },
        { label: 'Engineer name', value: (row) => row.engineer_name },
        { label: 'Company', value: (row) => row.company },
        { label: 'HETAS / HABMS reg. no.', value: (row) => row.registration_no },
        { label: 'Certificate / PPM reference', value: (row) => row.certificate_ref },
        { label: 'Maintenance standard met?', value: (row) => row.standard_met },
        { label: 'Invoice ref.', value: (row) => row.invoice_ref },
        { label: 'Next service due', value: (row) => row.next_service_due },
        { label: 'Outstanding actions', value: (row) => row.outstanding_actions },
      ],
    }),
  ]
}

export function Maintenance() {
  const { boilers, byId } = useBoilers()
  const { isAdmin } = useAuth()
  const [boilerId, setBoilerId] = useState('')
  const [tab, setTab] = useState<Tab>('log')
  // External work is an admin's; staff go straight to the routine records and
  // never see that there is a choice to make.
  const [section, setSection] = useState<Section>('routine')
  const showing: Section = isAdmin ? section : 'routine'

  const selectedId = Number(boilerId) || null
  const boiler = selectedId ? byId.get(selectedId) : undefined
  const exportSources = useMemo(() => routineExports(byId), [byId])

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>Maintenance</h1>
        </div>
        {/* External work is not filed against a boiler, so the picker would do
            nothing there. */}
        {showing === 'routine' && (
          <div className="head-actions">
            <label className="toolbar-toggle">
              Boiler
              <BoilerSelect boilers={boilers} value={boilerId} onChange={setBoilerId} required />
            </label>
            <RangeExport boilers={boilers} sources={exportSources} />
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="view-switch tabs section-switch">
          <button
            type="button"
            className={showing === 'routine' ? 'on' : ''}
            onClick={() => setSection('routine')}
          >
            Routine
          </button>
          <button
            type="button"
            className={showing === 'external' ? 'on' : ''}
            onClick={() => setSection('external')}
          >
            External Work
          </button>
        </div>
      )}

      {showing === 'external' ? (
        <ExternalWork />
      ) : (
        <>
          {!selectedId && <p className="muted">Choose a boiler to see and add its records.</p>}

          {selectedId && (
            <>
              <div className="view-switch tabs">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? 'on' : ''}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'log' && (
                <RepairLog key={`log-${selectedId}`} boilerId={selectedId} title={boiler?.number} />
              )}
              {tab === 'parts' && <Parts key={`parts-${selectedId}`} boilerId={selectedId} />}
              {tab === 'service' && <AnnualService_ key={`service-${selectedId}`} boilerId={selectedId} />}
            </>
          )}
        </>
      )}
    </div>
  )
}

function RepairLog({ boilerId, title }: { boilerId: number; title?: string }) {
  return (
    <RecordPage<MaintenanceEntry>
      title=""
      embedded
      tableTitle={`Maintenance & repair log${title ? ` — No. ${title}` : ''}`}
      api={maintenanceApi}
      transformItems={(items) => items.filter((item) => item.boiler_id === boilerId)}
      empty={() => ({
        date: today(),
        job_no: '',
        boiler_id: String(boilerId),
        work_type: '',
        fault: '',
        work_done: '',
        parts: '',
        staff: '',
        contractor: '',
        back_in_service: '',
        cost: '',
        invoice_ref: '',
        notifiable: 'No',
        ofgem_reported_on: '',
        record_source: '',
        photos: 'No',
        notes: '',
      })}
      toForm={(item) => ({
        date: item.date,
        job_no: item.job_no ?? '',
        boiler_id: String(boilerId),
        work_type: item.work_type ?? '',
        fault: item.fault ?? '',
        work_done: item.work_done ?? '',
        parts: item.parts ?? '',
        staff: item.staff ?? '',
        contractor: item.contractor ?? '',
        back_in_service: item.back_in_service ?? '',
        cost: item.cost ? String(item.cost) : '',
        invoice_ref: item.invoice_ref ?? '',
        notifiable: item.notifiable || 'No',
        ofgem_reported_on: item.ofgem_reported_on ?? '',
        record_source: item.record_source ?? '',
        photos: item.photos || 'No',
        notes: item.notes ?? '',
      })}
      fields={[
        { name: 'job_no', label: 'Job no.', width: 'half' },
        { name: 'date', label: 'Date of work', kind: 'date', required: true, width: 'half' },
        { name: 'work_type', label: 'Type of work', kind: 'select', options: WORK_TYPES },
        { name: 'fault', label: 'Fault / reason for work', kind: 'textarea', rows: 2 },
        { name: 'work_done', label: 'Work carried out', kind: 'textarea', rows: 3 },
        { name: 'parts', label: 'Parts fitted', kind: 'textarea', rows: 2 },
        { name: 'staff', label: 'Carried out by', required: true, width: 'half' },
        { name: 'contractor', label: 'Contractor / company', width: 'half' },
        { name: 'back_in_service', label: 'Back in service', kind: 'date', width: 'half' },
        { name: 'cost', label: 'Cost (GBP)', kind: 'number', width: 'half' },
        { name: 'invoice_ref', label: 'Invoice / receipt ref.', width: 'half' },
        { name: 'notifiable', label: 'Notifiable change?', kind: 'select', options: YES_NO, width: 'half' },
        { name: 'ofgem_reported_on', label: 'Reported to Ofgem', kind: 'date', width: 'half' },
        { name: 'record_source', label: 'Record source', width: 'half' },
        { name: 'photos', label: 'Photos', kind: 'select', options: YES_NO, width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Job no.', className: 'nowrap', cell: (item) => item.job_no || '—' },
        { header: 'Date', className: 'nowrap', cell: (item) => showDate(item.date) },
        { header: 'Type', className: 'nowrap', cell: (item) => item.work_type || '—' },
        { header: 'Work carried out', className: 'wrap', cell: (item) => item.work_done || '—' },
        { header: 'By', cell: (item) => item.staff || '—' },
        { header: 'Cost', className: 'num', cell: (item) => (item.cost ? money(item.cost) : '—') },
        {
          header: 'Notifiable',
          className: 'nowrap',
          cell: (item) => (item.notifiable === 'Yes' ? 'Yes' : '—'),
        },
      ]}
    />
  )
}

function Parts({ boilerId }: { boilerId: number }) {
  return (
    <RecordPage<MaintenancePart>
      title=""
      embedded
      tableTitle="Parts & purchases"
      api={maintenancePartsApi}
      transformItems={(items) => items.filter((item) => item.boiler_id === boilerId)}
      empty={() => ({
        purchase_date: today(),
        order_no: '',
        boiler_id: String(boilerId),
        part: '',
        part_number: '',
        quantity: '1',
        supplier: '',
        unit_cost: '',
        total_cost: '',
        invoice_ref: '',
        fitted_on: '',
        fitted_by: '',
        notes: '',
      })}
      toForm={(item) => ({
        purchase_date: item.purchase_date,
        order_no: item.order_no ?? '',
        boiler_id: String(boilerId),
        part: item.part ?? '',
        part_number: item.part_number ?? '',
        quantity: item.quantity ? String(item.quantity) : '',
        supplier: item.supplier ?? '',
        unit_cost: item.unit_cost ? String(item.unit_cost) : '',
        total_cost: item.total_cost ? String(item.total_cost) : '',
        invoice_ref: item.invoice_ref ?? '',
        fitted_on: item.fitted_on ?? '',
        fitted_by: item.fitted_by ?? '',
        notes: item.notes ?? '',
      })}
      fields={[
        { name: 'purchase_date', label: 'Purchase date', kind: 'date', required: true, width: 'half' },
        { name: 'order_no', label: 'Order no.', width: 'half' },
        { name: 'part', label: 'Part / consumable', required: true },
        { name: 'part_number', label: 'Part number', width: 'half' },
        { name: 'quantity', label: 'Quantity', kind: 'number', width: 'half' },
        { name: 'supplier', label: 'Supplier', width: 'half' },
        { name: 'unit_cost', label: 'Unit cost (GBP)', kind: 'number', width: 'half' },
        { name: 'total_cost', label: 'Total cost (GBP)', kind: 'number', width: 'half' },
        { name: 'invoice_ref', label: 'Invoice / receipt ref.', width: 'half' },
        { name: 'fitted_on', label: 'Date fitted', kind: 'date', width: 'half' },
        { name: 'fitted_by', label: 'Fitted by', width: 'half' },
        { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Purchased', className: 'nowrap', cell: (item) => showDate(item.purchase_date) },
        { header: 'Order no.', className: 'nowrap', cell: (item) => item.order_no || '—' },
        { header: 'Part', cell: (item) => item.part || '—' },
        { header: 'Part number', className: 'nowrap', cell: (item) => item.part_number || '—' },
        { header: 'Qty', className: 'num', cell: (item) => (item.quantity ? figure(item.quantity) : '—') },
        { header: 'Supplier', cell: (item) => item.supplier || '—' },
        { header: 'Total', className: 'num', cell: (item) => (item.total_cost ? money(item.total_cost) : '—') },
        { header: 'Fitted', className: 'nowrap', cell: (item) => showDate(item.fitted_on) },
      ]}
    />
  )
}

function AnnualService_({ boilerId }: { boilerId: number }) {
  return (
    <RecordPage<AnnualService>
      title=""
      embedded
      tableTitle="Annual service register"
      api={annualServicesApi}
      transformItems={(items) => items.filter((item) => item.boiler_id === boilerId)}
      empty={() => ({
        year: String(new Date().getFullYear()),
        boiler_id: String(boilerId),
        service_date: today(),
        engineer_name: '',
        company: '',
        registration_no: '',
        certificate_ref: '',
        standard_met: 'Pending',
        invoice_ref: '',
        next_service_due: '',
        outstanding_actions: '',
      })}
      toForm={(item) => ({
        year: item.year ?? '',
        boiler_id: String(boilerId),
        service_date: item.service_date,
        engineer_name: item.engineer_name ?? '',
        company: item.company ?? '',
        registration_no: item.registration_no ?? '',
        certificate_ref: item.certificate_ref ?? '',
        standard_met: item.standard_met || 'Pending',
        invoice_ref: item.invoice_ref ?? '',
        next_service_due: item.next_service_due ?? '',
        outstanding_actions: item.outstanding_actions ?? '',
      })}
      fields={[
        { name: 'year', label: 'Year', width: 'half' },
        { name: 'service_date', label: 'Service date', kind: 'date', required: true, width: 'half' },
        { name: 'engineer_name', label: 'Engineer name', width: 'half' },
        { name: 'company', label: 'Company', width: 'half' },
        { name: 'registration_no', label: 'HETAS / HABMS reg. no.', width: 'half' },
        { name: 'certificate_ref', label: 'Certificate / PPM reference', width: 'half' },
        {
          name: 'standard_met',
          label: 'Maintenance standard met?',
          kind: 'select',
          options: YES_NO_PENDING,
          width: 'half',
        },
        { name: 'invoice_ref', label: 'Invoice ref.', width: 'half' },
        { name: 'next_service_due', label: 'Next service due', kind: 'date', width: 'half' },
        { name: 'outstanding_actions', label: 'Outstanding actions', kind: 'textarea', rows: 2 },
      ]}
      columns={[
        { header: 'Year', className: 'nowrap', cell: (item) => item.year || '—' },
        { header: 'Service date', className: 'nowrap', cell: (item) => showDate(item.service_date) },
        { header: 'Engineer', cell: (item) => item.engineer_name || '—' },
        { header: 'Company', cell: (item) => item.company || '—' },
        { header: 'Reg. no.', className: 'nowrap', cell: (item) => item.registration_no || '—' },
        { header: 'Certificate', className: 'nowrap', cell: (item) => item.certificate_ref || '—' },
        { header: 'Standard met', className: 'nowrap', cell: (item) => item.standard_met || '—' },
        { header: 'Next due', className: 'nowrap', cell: (item) => showDate(item.next_service_due) },
      ]}
    />
  )
}
