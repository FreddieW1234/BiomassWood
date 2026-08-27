import type { DocumentEntry } from '../api/types'
import { usePhotoUrl } from '../hooks/useRecordPhotos'

type PanelProps = {
  /** The photo already attached to the record being edited, if any. */
  existing: DocumentEntry | undefined
  pendingFile: File | null
  pendingPreview: string | null
  busy: boolean
  onChoose: (file: File | null) => void
  onRemove: () => void
}

/** Image control for inside a record form. */
export function PhotoPanel({
  existing,
  pendingFile,
  pendingPreview,
  busy,
  onChoose,
  onRemove,
}: PanelProps) {
  return (
    <div className="form-image">
      {pendingPreview ? (
        <img className="store-image thumb" src={pendingPreview} alt="Chosen image" />
      ) : existing ? (
        <p className="muted">An image is already attached. Choose a file to replace it.</p>
      ) : (
        <p className="muted">No image attached.</p>
      )}
      <div className="row">
        <label className="upload-button">
          {pendingFile ? 'Choose a different image' : 'Choose image'}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              onChoose(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />
        </label>
        {pendingFile && (
          <button type="button" className="button ghost" onClick={() => onChoose(null)}>
            Clear
          </button>
        )}
        {!pendingFile && existing && (
          <button type="button" className="button ghost" disabled={busy} onClick={onRemove}>
            Remove image
          </button>
        )}
      </div>
    </div>
  )
}

type ViewerProps = {
  title: string
  photo: DocumentEntry | undefined
  busy: boolean
  error: string | null
  onClose: () => void
  onChoose: (file: File) => void
  onRemove: () => void
  children?: React.ReactNode
}

/** Full-record viewer with its photo. */
export function PhotoViewer({
  title,
  photo,
  busy,
  error,
  onClose,
  onChoose,
  onRemove,
  children,
}: ViewerProps) {
  const url = usePhotoUrl(photo?.id)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h2>{title}</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        {url ? (
          <img className="store-image" src={url} alt={title} />
        ) : (
          <p className="muted">No image yet.</p>
        )}

        {children}

        <div className="row">
          <label className="upload-button">
            {photo ? 'Replace image' : 'Add image'}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onChoose(file)
                event.target.value = ''
              }}
            />
          </label>
          {photo && (
            <button type="button" className="button ghost" disabled={busy} onClick={onRemove}>
              Remove image
            </button>
          )}
        </div>
        {error && <p className="err">{error}</p>}
      </div>
    </div>
  )
}
