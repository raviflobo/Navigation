import { useState } from 'react'
import type { Waypoint } from '../shared/types'

interface Props {
  title?: string
  index?: number
  waypoint: Waypoint
  onClose: () => void
  onEdit?: () => void
}

export function WaypointHotspotViewer({
  title,
  index,
  waypoint,
  onClose,
  onEdit,
}: Props) {
  const photos = waypoint.photos ?? []
  const [photoIndex, setPhotoIndex] = useState(0)
  const current = photos[photoIndex]

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet hotspot-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>
            {index != null ? `#${index} ` : ''}
            {waypoint.text || title || 'Waypoint'}
          </h2>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          {waypoint.lat.toFixed(6)}, {waypoint.lon.toFixed(6)} · ±
          {waypoint.accuracyM.toFixed(0)} m
        </p>

        {current ? (
          <div className="hotspot-photo-wrap">
            <img src={current} alt={waypoint.text || 'Waypoint photo'} className="hotspot-photo" />
            {photos.length > 1 && (
              <div className="row" style={{ marginTop: 8, justifyContent: 'center' }}>
                <button
                  className="ghost"
                  disabled={photoIndex <= 0}
                  onClick={() => setPhotoIndex((i) => i - 1)}
                >
                  Prev
                </button>
                <span className="muted">
                  {photoIndex + 1} / {photos.length}
                </span>
                <button
                  className="ghost"
                  disabled={photoIndex >= photos.length - 1}
                  onClick={() => setPhotoIndex((i) => i + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty">No photo for this waypoint.</div>
        )}

        {waypoint.text && (
          <p style={{ marginTop: 12 }}>
            <strong>Note:</strong> {waypoint.text}
          </p>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          {onEdit && (
            <button className="primary" onClick={onEdit}>
              Edit waypoint
            </button>
          )}
          <button className="ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
