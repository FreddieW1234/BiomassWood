import { useState } from 'react'
import { annualServicesApi, maintenanceApi, maintenancePartsApi } from '../api/client'
import type { AnnualService, MaintenanceEntry, MaintenancePart } from '../api/types'
import { BoilerSelect } from '../components/BoilerSelect'
import { RecordPage } from '../components/RecordPage'
import { useBoilers } from '../hooks/useBoilers'
import { figure, money, showDate, today } from '../lib/format'
import { WORK_TYPES, YES_NO, YES_NO_PENDING } from '../lib/options'

type Tab = 'log' | 'parts' | 'service'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Maintenance & repair' },
  { id: 'parts', label: 'Parts & purchases' },
  { id: 'service', label: 'Annual service' },
]

export function Maintenance() {
  const { boilers, byId } = useBoilers()
  const [boilerId, setBoilerId] = useState('')
  const [tab, setTab] = useState<Tab>('log')

  const selectedId = Number(boilerId) || null
  const boiler = selectedId ? byId.get(selectedId) : undefined

  return (
    <div className="page wide">
      <div className="page-head with-action">
        <div>
          <h1>Maintenance</h1>
        </div>
        <div className="head-actions">
          <label className="toolbar-toggle">
            Boiler
            <BoilerSelect boilers={boilers} value={boilerId} onChange={setBoilerId} required />
          </label>
        </div>
      </div>

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

          {tab === 'log' && <RepairLog key={`log-${selectedId}`} boilerId={selectedId} title={boiler?.number} />}
          {tab === 'parts' && <Parts key={`parts-${selectedId}`} boilerId={selectedId} />}
          {tab === 'service' && <AnnualService_ key={`service-${selectedId}`} boilerId={selectedId} />}
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
