import { useState } from 'react'
import { fuelStoresApi, sitesApi } from '../api/client'
import type { FuelStore } from '../api/types'
import { PhotoPanel, PhotoViewer } from '../components/PhotoPanel'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
import { useRecordPhotos } from '../hooks/useRecordPhotos'
import { idValue } from '../lib/format'
import { displayLabel, selectOptions, STORE_TYPES } from '../lib/options'

const empty = () => ({
  site_id: '',
  name: '',
  store_type: '',
  capacity: '',
  location: '',
  moisture_protection: '',
  fire_protection: '',
  notes: '',
})

export function FuelStores() {
  const { items: sites, byId } = useList(sitesApi)

  const { photos, busy, error, attach, remove } = useRecordPhotos('fuel-stores')
  const [viewing, setViewing] = useState<FuelStore | null>(null)

  // An image picked in the form: uploaded once the row is saved, so it works
  // for a brand-new store as well as an edit.
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  function choosePending(file: File | null) {
    setPendingPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return file ? URL.createObjectURL(file) : null
    })
    setPendingFile(file)
  }

  return (
    <>
      <RecordPage<FuelStore>
        title="Fuel stores"
        tableTitle="Stores"
        api={fuelStoresApi}
        empty={empty}
        toForm={(item) => ({
          site_id: idValue(item.site_id),
          name: item.name,
          store_type: item.store_type,
          capacity: item.capacity,
          location: item.location,
          moisture_protection: item.moisture_protection,
          fire_protection: item.fire_protection,
          notes: item.notes,
        })}
        fields={[
          { name: 'name', label: 'Store name', required: true, placeholder: 'e.g. Chip shed 1' },
          {
            name: 'site_id',
            label: 'Site',
            kind: 'select',
            options: sites.map((site) => ({ value: String(site.id), label: site.name })),
            emptyLabel: 'No site',
            width: 'half',
          },
          {
            name: 'store_type',
            label: 'Type',
            kind: 'select',
            options: selectOptions(STORE_TYPES),
            emptyLabel: 'Not set',
            width: 'half',
          },
          { name: 'capacity', label: 'Capacity', placeholder: 'e.g. 40 t', width: 'half' },
          { name: 'location', label: 'Location', width: 'half' },
          { name: 'moisture_protection', label: 'Moisture protection' },
          { name: 'fire_protection', label: 'Fire protection' },
          { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
        ]}
        columns={[
          { header: 'Name', cell: (item) => item.name },
          {
            header: 'Site',
            cell: (item) => (item.site_id ? byId.get(item.site_id)?.name || `#${item.site_id}` : '—'),
          },
          { header: 'Type', cell: (item) => displayLabel(item.store_type) },
          { header: 'Capacity', cell: (item) => item.capacity || '—' },
          {
            header: 'Image',
            className: 'nowrap',
            cell: (item) => (photos.has(item.id) ? '✓' : '—'),
          },
        ]}
        rowActions={(item) => (
          <button type="button" className="text-button" onClick={() => setViewing(item)}>
            View
          </button>
        )}
        formExtras={(editing) => (
          <PhotoPanel
            existing={editing ? photos.get(editing.id) : undefined}
            pendingFile={pendingFile}
            pendingPreview={pendingPreview}
            busy={busy}
            onChoose={choosePending}
            onRemove={() => editing && void remove(editing.id)}
          />
        )}
        onSaved={async (store) => {
          if (!pendingFile) return
          await attach(store.id, `${store.name} photo`, pendingFile)
          choosePending(null)
        }}
      />

      {viewing && (
        <PhotoViewer
          title={viewing.name}
          photo={photos.get(viewing.id)}
          busy={busy}
          error={error}
          onClose={() => setViewing(null)}
          onChoose={(file) => void attach(viewing.id, `${viewing.name} photo`, file)}
          onRemove={() => void remove(viewing.id)}
        >
          <dl className="detail-list">
            <div>
              <dt>Site</dt>
              <dd>{viewing.site_id ? byId.get(viewing.site_id)?.name || '—' : '—'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{displayLabel(viewing.store_type)}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>{viewing.capacity || '—'}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{viewing.location || '—'}</dd>
            </div>
          </dl>
        </PhotoViewer>
      )}
    </>
  )
}
