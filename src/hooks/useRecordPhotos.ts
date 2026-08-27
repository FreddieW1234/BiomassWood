import { useCallback, useEffect, useState } from 'react'
import { documentObjectUrl, documentsApi, uploadDocumentFile } from '../api/client'
import type { DocumentEntry } from '../api/types'

/**
 * One photo per record, stored as an ordinary document linked to it, so store
 * and container pictures live in the same evidence folder as everything else.
 */
export function useRecordPhotos(resourceSlug: string) {
  const [photos, setPhotos] = useState<Map<number, DocumentEntry>>(new Map())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const result = await documentsApi.list()
      const map = new Map<number, DocumentEntry>()
      for (const doc of result.data.items) {
        if (doc.linked_resource === resourceSlug && doc.original_filename) {
          map.set(doc.linked_id, doc)
        }
      }
      setPhotos(map)
    } catch {
      // the page still works without photos
    }
  }, [resourceSlug])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const attach = useCallback(
    async (recordId: number, title: string, file: File) => {
      setBusy(true)
      setError(null)
      try {
        const existing = photos.get(recordId)
        const doc =
          existing ??
          (
            await documentsApi.create({
              linked_resource: resourceSlug,
              linked_id: recordId,
              doc_type: 'photo',
              title,
            })
          ).data.item
        await uploadDocumentFile(doc.id, file)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setBusy(false)
      }
    },
    [photos, refresh, resourceSlug],
  )

  const remove = useCallback(
    async (recordId: number) => {
      const doc = photos.get(recordId)
      if (!doc || !window.confirm('Remove this image?')) return
      setBusy(true)
      setError(null)
      try {
        await documentsApi.remove(doc.id)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove the image')
      } finally {
        setBusy(false)
      }
    },
    [photos, refresh],
  )

  return { photos, busy, error, setError, attach, remove, refresh }
}

/** Fetch a photo as a blob URL, revoking it when the caller unmounts. */
export function usePhotoUrl(documentId: number | undefined) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    documentObjectUrl(documentId)
      .then((value) => {
        objectUrl = value
        if (cancelled) URL.revokeObjectURL(value)
        else setUrl(value)
      })
      .catch(() => setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  return url
}
