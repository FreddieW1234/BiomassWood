import { useCallback, useEffect, useState } from 'react'
import {
  documentObjectUrl,
  documentsApi,
  fuelStoresApi,
  sitesApi,
  uploadDocumentFile,
} from '../api/client'
import type { DocumentEntry, FuelStore } from '../api/types'
import { RecordPage } from '../components/RecordPage'
import { useList } from '../hooks/useList'
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

  // Store photos are ordinary documents linked to the store row.
  const [photos, setPhotos] = useState<Map<number, DocumentEntry>>(new Map())
  const [viewing, setViewing] = useState<FuelStore | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPhotos = useCallback(async () => {
    try {
      const result = await documentsApi.list()
      const map = new Map<number, DocumentEntry>()
      for (const doc of result.data.items) {
        if (doc.linked_resource === 'fuel-stores' && doc.original_filename) {
          map.set(doc.linked_id, doc)
        }
      }
      setPhotos(map)
    } catch {
      // the page still works without photos
    }
  }, [])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  // Fetch the image whenever the viewer opens on a store that has one.
  useEffect(() => {
    if (!viewing) {
      setImageUrl(null)
      return
    }
    const doc = photos.get(viewing.id)
    if (!doc) {
      setImageUrl(null)
      return
    }
    let url: string | null = null
    let cancelled = false
    documentObjectUrl(doc.id)
      .then((objectUrl) => {
        url = objectUrl
        if (cancelled) URL.revokeObjectURL(objectUrl)
        else setImageUrl(objectUrl)
      })
      .catch(() => setError('Could not load the image'))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [viewing, photos])

  async function attach(store: FuelStore, file: File) {
    setBusy(true)
    setError(null)
    try {
      const existing = photos.get(store.id)
      const doc =
        existing ??
        (
          await documentsApi.create({
            linked_resource: 'fuel-stores',
            linked_id: store.id,
            doc_type: 'photo',
            title: `${store.name} photo`,
          })
        ).data.item
      await uploadDocumentFile(doc.id, file)
      await loadPhotos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(store: FuelStore) {
    const doc = photos.get(store.id)
    if (!doc || !window.confirm('Remove this image?')) return
    setBusy(true)
    setError(null)
    try {
      await documentsApi.remove(doc.id)
      setImageUrl(null)
      await loadPhotos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the image')
    } finally {
      setBusy(false)
    }
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
      />

      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <h2>{viewing.name}</h2>
              <button type="button" className="text-button" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>

            {imageUrl ? (
              <img className="store-image" src={imageUrl} alt={`${viewing.name}`} />
            ) : (
              <p className="muted">No image yet for this store.</p>
            )}

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
              <div>
                <dt>Moisture protection</dt>
                <dd>{viewing.moisture_protection || '—'}</dd>
              </div>
              <div>
                <dt>Fire protection</dt>
                <dd>{viewing.fire_protection || '—'}</dd>
              </div>
            </dl>
            {viewing.notes && <p className="muted">{viewing.notes}</p>}

            <div className="row">
              <label className="upload-button">
                {photos.has(viewing.id) ? 'Replace image' : 'Add image'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void attach(viewing, file)
                    event.target.value = ''
                  }}
                />
              </label>
              {photos.has(viewing.id) && (
                <button
                  type="button"
                  className="button ghost"
                  disabled={busy}
                  onClick={() => void removePhoto(viewing)}
                >
                  Remove image
                </button>
              )}
            </div>
            {error && <p className="err">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}
