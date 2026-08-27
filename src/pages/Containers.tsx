import { useState } from 'react'
import { containersApi } from '../api/client'
import type { Container } from '../api/types'
import { PhotoPanel, PhotoViewer } from '../components/PhotoPanel'
import { RecordPage } from '../components/RecordPage'
import { useRecordPhotos } from '../hooks/useRecordPhotos'
import { figure } from '../lib/format'

const empty = () => ({
  name: '',
  size: '',
  unit: 'm³',
  notes: '',
})

const UNITS = [
  { value: 'm³', label: 'm³ (volume)' },
  { value: 'tn', label: 'tn (weight)' },
]

export function Containers() {
  const { photos, busy, error, attach, remove } = useRecordPhotos('containers')
  const [viewing, setViewing] = useState<Container | null>(null)
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
      <RecordPage<Container>
        title="Containers To Fill Hoppers"
        tableTitle="Containers"
        api={containersApi}
        empty={empty}
        toForm={(item) => ({
          name: item.name,
          size: item.size ? String(item.size) : '',
          unit: item.unit || 'm³',
          notes: item.notes,
        })}
        fields={[
          { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Large blue bucket' },
          { name: 'size', label: 'Size', kind: 'number', width: 'half' },
          { name: 'unit', label: 'Unit', kind: 'select', options: UNITS, width: 'half' },
          { name: 'notes', label: 'Notes', kind: 'textarea', rows: 2 },
        ]}
        hint="A photo helps whoever is filling pick the right bucket or bag."
        columns={[
          { header: 'Name', cell: (item) => item.name },
          {
            header: 'Size',
            className: 'num',
            cell: (item) => (item.size ? `${figure(item.size)} ${item.unit || ''}`.trim() : '—'),
          },
          { header: 'Image', className: 'nowrap', cell: (item) => (photos.has(item.id) ? '✓' : '—') },
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
        onSaved={async (item) => {
          if (!pendingFile) return
          await attach(item.id, `${item.name} photo`, pendingFile)
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
          <p className="muted">
            {viewing.size ? `${figure(viewing.size)} ${viewing.unit || ''}`.trim() : 'No size set'}
          </p>
        </PhotoViewer>
      )}
    </>
  )
}
