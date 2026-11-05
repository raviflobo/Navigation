import { useState } from 'react'
import { DropWaypointSheet } from './DropWaypointSheet'
import { useDataset } from '../shared/DatasetContext'
import { useGeolocation } from '../shared/useGeolocation'
import { isAccuracyOk } from '../shared/geo'
import { Map2D } from '../shared/Map2D'
import { WaypointScene3D } from '../shared/WaypointScene3D'

export function SurveyScreen() {
  const { dataset, addWaypoint, deleteWaypoint, undoLastWaypoint } = useDataset()
  const gps = useGeolocation(true)
  const [activeId, setActiveId] = useState<string>('')
  const [draft, setDraft] = useState<{
    lat: number
    lon: number
    accuracyM: number
  } | null>(null)

  if (!dataset) return null

  const selectedId = activeId || dataset.geolocations[0]?.id || ''
  const selected =
    dataset.geolocations.find((g) => g.id === selectedId) ?? null

  const drop = () => {
    if (!selected) {
      alert('Select a geolocation cluster first.')
      return
    }
    if (!gps.position) {
      alert('No GPS fix yet.')
      return
    }
    if (!isAccuracyOk(gps.position.accuracyM, 50)) {
      const ok = confirm(
        `Accuracy ±${gps.position.accuracyM.toFixed(0)} m is weak. Drop anyway?`,
      )
      if (!ok) return
    }
    setDraft({
      lat: gps.position.lat,
      lon: gps.position.lon,
      accuracyM: gps.position.accuracyM,
    })
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Survey waypoints</h2>
        <p className="muted">
          Select a geolocation cluster, walk, and drop waypoints (especially at turns).
        </p>
        <div className="field">
          <label>Active geolocation</label>
          <select
            value={selectedId}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {dataset.geolocations.length === 0 && (
              <option value="">No geolocations — add some first</option>
            )}
            {dataset.geolocations.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.waypoints.length} wp)
              </option>
            ))}
          </select>
        </div>
        {gps.position ? (
          <p className="muted">
            Live GPS {gps.position.lat.toFixed(6)}, {gps.position.lon.toFixed(6)} · ±
            {gps.position.accuracyM.toFixed(0)} m
          </p>
        ) : (
          <p className="muted">Waiting for GPS…</p>
        )}
        <button className="primary big-btn" onClick={drop} disabled={!selected}>
          Drop waypoint
        </button>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="ghost"
            disabled={!selected || selected.waypoints.length === 0}
            onClick={() => selected && undoLastWaypoint(selected.id)}
          >
            Undo last
          </button>
        </div>
      </div>

      {selected && (
        <>
          <div className="card">
            <h3>2D path — {selected.name}</h3>
            <Map2D
              geolocations={dataset.geolocations}
              activeGeoId={selected.id}
              user={
                gps.position
                  ? {
                      lat: gps.position.lat,
                      lon: gps.position.lon,
                      accuracyM: gps.position.accuracyM,
                    }
                  : null
              }
            />
          </div>
          <div className="card">
            <h3>3D cluster view</h3>
            <WaypointScene3D
              waypoints={selected.waypoints}
              origin={
                selected.spawn
                  ? { lat: selected.spawn.lat, lon: selected.spawn.lon }
                  : selected.waypoints[0]
                    ? {
                        lat: selected.waypoints[0].lat,
                        lon: selected.waypoints[0].lon,
                      }
                    : null
              }
            />
          </div>
          <div className="card">
            <h3>Waypoints ({selected.waypoints.length})</h3>
            {selected.waypoints.length === 0 && (
              <p className="empty">No waypoints in this cluster yet.</p>
            )}
            {selected.waypoints.map((w, i) => (
              <div key={w.id} className="list-item">
                <div>
                  <strong>#{i + 1}</strong>{' '}
                  <span className="muted">
                    {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                  </span>
                  {w.text && <div>{w.text}</div>}
                  {w.photos && w.photos.length > 0 && (
                    <div className="photo-row" style={{ marginTop: 6 }}>
                      {w.photos.map((src, j) => (
                        <img key={j} src={src} alt="" className="photo-thumb" />
                      ))}
                    </div>
                  )}
                </div>
                <button className="danger" onClick={() => deleteWaypoint(selected.id, w.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {draft && selected && (
        <DropWaypointSheet
          lat={draft.lat}
          lon={draft.lon}
          accuracyM={draft.accuracyM}
          onCancel={() => setDraft(null)}
          onSave={({ text, photos }) => {
            addWaypoint(selected.id, {
              lat: draft.lat,
              lon: draft.lon,
              accuracyM: draft.accuracyM,
              droppedAt: new Date().toISOString(),
              text,
              photos: photos.length ? photos : undefined,
            })
            setDraft(null)
          }}
        />
      )}
    </div>
  )
}
