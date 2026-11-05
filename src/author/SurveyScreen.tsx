import { useState } from 'react'
import { DropWaypointSheet } from './DropWaypointSheet'
import { WaypointHotspotViewer } from './WaypointHotspotViewer'
import { useDataset } from '../shared/DatasetContext'
import { useGeolocation } from '../shared/useGeolocation'
import { isAccuracyOk } from '../shared/geo'
import { Map2D } from '../shared/Map2D'
import { WaypointScene3D } from '../shared/WaypointScene3D'
import { useWaypointHotspot } from '../shared/useWaypointHotspot'
import type { Waypoint } from '../shared/types'

type DraftCreate = {
  mode: 'create'
  lat: number
  lon: number
  accuracyM: number
}

type DraftEdit = {
  mode: 'edit'
  geoId: string
  waypoint: Waypoint
}

type Draft = DraftCreate | DraftEdit

export function SurveyScreen() {
  const {
    dataset,
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    undoLastWaypoint,
  } = useDataset()
  const gps = useGeolocation(true)
  const [activeId, setActiveId] = useState<string>('')
  const [draft, setDraft] = useState<Draft | null>(null)

  if (!dataset) return null

  const selectedId = activeId || dataset.geolocations[0]?.id || ''
  const selected =
    dataset.geolocations.find((g) => g.id === selectedId) ?? null
  const { hotspot, openHotspot, closeHotspot } = useWaypointHotspot(
    dataset.geolocations,
  )

  const liveGps = gps.position
    ? {
        lat: gps.position.lat,
        lon: gps.position.lon,
        accuracyM: gps.position.accuracyM,
      }
    : null

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
      mode: 'create',
      lat: gps.position.lat,
      lon: gps.position.lon,
      accuracyM: gps.position.accuracyM,
    })
  }

  const openEdit = (geoId: string, waypointId: string) => {
    const geo = dataset.geolocations.find((g) => g.id === geoId)
    const waypoint = geo?.waypoints.find((w) => w.id === waypointId)
    if (!geo || !waypoint) return
    setActiveId(geoId)
    setDraft({ mode: 'edit', geoId, waypoint })
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Survey waypoints</h2>
        <p className="muted">
          Drop new points while walking. Tap a hotspot to view its photo. Drag to move;
          use Edit for text/photos.
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
            <h3>2D map — {selected.name}</h3>
            <div className="map-legend">
              <span><i className="spawn" /> Geolocation spawn</span>
              <span><i className="waypoint" /> Waypoint (tap = photo · drag = move)</span>
              <span><i className="user" /> You (GPS)</span>
            </div>
            <Map2D
              className="map-wrap tall"
              geolocations={dataset.geolocations}
              activeGeoId={selected.id}
              user={liveGps}
              onWaypointClick={({ waypointId, geoId }) => {
                setActiveId(geoId)
                openHotspot(geoId, waypointId)
              }}
              onWaypointMove={({ waypointId, geoId, lat, lon }) => {
                updateWaypoint(geoId, waypointId, {
                  lat,
                  lon,
                  accuracyM: 5,
                })
              }}
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
                <div className="row">
                  <button className="ghost" onClick={() => openEdit(selected.id, w.id)}>
                    Edit
                  </button>
                  <button
                    className="danger"
                    onClick={() => deleteWaypoint(selected.id, w.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {draft?.mode === 'create' && selected && (
        <DropWaypointSheet
          mode="create"
          lat={draft.lat}
          lon={draft.lon}
          accuracyM={draft.accuracyM}
          liveGps={liveGps}
          onCancel={() => setDraft(null)}
          onSave={({ text, photos, lat, lon, accuracyM }) => {
            addWaypoint(selected.id, {
              lat: lat ?? draft.lat,
              lon: lon ?? draft.lon,
              accuracyM: accuracyM ?? draft.accuracyM,
              droppedAt: new Date().toISOString(),
              text,
              photos: photos.length ? photos : undefined,
            })
            setDraft(null)
          }}
        />
      )}

      {draft?.mode === 'edit' && (
        <DropWaypointSheet
          key={draft.waypoint.id}
          mode="edit"
          title="Edit waypoint"
          lat={draft.waypoint.lat}
          lon={draft.waypoint.lon}
          accuracyM={draft.waypoint.accuracyM}
          initialText={draft.waypoint.text || ''}
          initialPhotos={draft.waypoint.photos || []}
          liveGps={liveGps}
          onCancel={() => setDraft(null)}
          onDelete={() => {
            deleteWaypoint(draft.geoId, draft.waypoint.id)
            setDraft(null)
          }}
          onSave={({ text, photos, lat, lon, accuracyM }) => {
            updateWaypoint(draft.geoId, draft.waypoint.id, {
              text,
              photos: photos.length ? photos : undefined,
              lat: lat ?? draft.waypoint.lat,
              lon: lon ?? draft.waypoint.lon,
              accuracyM: accuracyM ?? draft.waypoint.accuracyM,
            })
            setDraft(null)
          }}
        />
      )}

      {hotspot && !draft && (
        <WaypointHotspotViewer
          title={hotspot.geoName}
          index={hotspot.index}
          waypoint={hotspot.waypoint}
          onClose={closeHotspot}
          onEdit={() => {
            openEdit(hotspot.geoId, hotspot.waypoint.id)
            closeHotspot()
          }}
        />
      )}
    </div>
  )
}
