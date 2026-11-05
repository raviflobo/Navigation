import { useRef, useState } from 'react'
import { resizeImageToDataUrl } from '../shared/photos'

interface Props {
  lat: number
  lon: number
  accuracyM: number
  onSave: (data: { text?: string; photos: string[] }) => void
  onCancel: () => void
}

export function DropWaypointSheet({ lat, lon, accuracyM, onSave, onCancel }: Props) {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
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

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Waypoint details</h2>
        <p className="muted">
          {lat.toFixed(6)}, {lon.toFixed(6)} · ±{accuracyM.toFixed(0)} m
        </p>
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
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              onSave({
                text: text.trim() || undefined,
                photos,
              })
            }
          >
            Save waypoint
          </button>
        </div>
      </div>
    </div>
  )
}
