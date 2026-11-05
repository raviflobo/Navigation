import { useRef, useState } from 'react'
import { resizeImageToDataUrl } from '../shared/photos'

export interface WaypointSheetSave {
  text?: string
  photos: string[]
  /** When set, overwrite lat/lon/accuracy from GPS re-pin */
  lat?: number
  lon?: number
  accuracyM?: number
}

interface Props {
  mode?: 'create' | 'edit'
  title?: string
  lat: number
  lon: number
  accuracyM: number
  initialText?: string
  initialPhotos?: string[]
  /** Live GPS for “update position” while editing */
  liveGps?: { lat: number; lon: number; accuracyM: number } | null
  onSave: (data: WaypointSheetSave) => void
  onCancel: () => void
  onDelete?: () => void
}

export function DropWaypointSheet({
  mode = 'create',
  title,
  lat,
  lon,
  accuracyM,
  initialText = '',
  initialPhotos = [],
  liveGps = null,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [text, setText] = useState(initialText)
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [coords, setCoords] = useState({ lat, lon, accuracyM })
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addPhoto = async (file: File | undefined) => {
    if (!file) return
    if (photos.length >= 2) {
      alert('Maximum 2 photos per waypoint.')
      return
    }
    setBusy(true)
    try {
      const url = await resizeImageToDataUrl(file)
      setPhotos((p) => [...p, url].slice(0, 2))
    } catch {
      alert('Could not process photo.')
    } finally {
      setBusy(false)
    }
  }

  const pinFromGps = () => {
    if (!liveGps) {
      alert('No GPS fix yet.')
      return
    }
    setCoords({
      lat: liveGps.lat,
      lon: liveGps.lon,
      accuracyM: liveGps.accuracyM,
    })
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{title || (mode === 'edit' ? 'Edit waypoint' : 'Waypoint details')}</h2>
        <p className="muted">
          {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)} · ±{coords.accuracyM.toFixed(0)} m
        </p>
        {mode === 'edit' && (
          <button className="ghost" style={{ marginBottom: 12 }} onClick={pinFromGps}>
            Update position from GPS
          </button>
        )}
        <div className="field">
          <label>Text (optional)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Turn left at blue gate"
          />
        </div>
        <div className="field">
          <label>Photos (0–2, optional)</label>
          <div className="photo-row">
            {photos.map((src, i) => (
              <div key={i}>
                <img src={src} alt="" className="photo-thumb" />
                <button
                  className="ghost"
                  style={{ marginTop: 4 }}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {photos.length < 2 && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  void addPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button
                className="ghost"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                style={{ marginTop: 8 }}
              >
                {busy ? 'Processing…' : 'Add photo'}
              </button>
            </>
          )}
        </div>
        <div className="row">
          <button className="ghost" onClick={onCancel}>
            Cancel
          </button>
          {mode === 'edit' && onDelete && (
            <button
              className="danger"
              onClick={() => {
                if (confirm('Delete this waypoint?')) onDelete()
              }}
            >
              Delete
            </button>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              onSave({
                text: text.trim() || undefined,
                photos,
                lat: coords.lat,
                lon: coords.lon,
                accuracyM: coords.accuracyM,
              })
            }
          >
            {mode === 'edit' ? 'Save changes' : 'Save waypoint'}
          </button>
        </div>
      </div>
    </div>
  )
}
