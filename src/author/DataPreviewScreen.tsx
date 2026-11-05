import { useState } from 'react'
import { WaypointHotspotViewer } from './WaypointHotspotViewer'
import { useDataset } from '../shared/DatasetContext'
import { Map2D } from '../shared/Map2D'
import { WaypointScene3D } from '../shared/WaypointScene3D'
import { useWaypointHotspot } from '../shared/useWaypointHotspot'

export function DataPreviewScreen() {
  const { dataset } = useDataset()
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  if (!dataset) return null

  const selectedId = activeId || dataset.geolocations[0]?.id || ''
  const selected = dataset.geolocations.find((g) => g.id === selectedId)
  const { hotspot, openHotspot, closeHotspot } = useWaypointHotspot(
    dataset.geolocations,
  )

  return (
    <div className="stack">
      <div className="card">
        <h2>Data preview</h2>
        <p className="muted">
          Inspect capture quality. Tap a waypoint hotspot to view its photo.
        </p>
        <div className="row">
          <button
            className={mode === '2d' ? 'primary' : 'ghost'}
            onClick={() => setMode('2d')}
          >
            2D map
          </button>
          <button
            className={mode === '3d' ? 'primary' : 'ghost'}
            onClick={() => setMode('3d')}
          >
            3D cluster
          </button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Focus cluster (3D)</label>
          <select value={selectedId} onChange={(e) => setActiveId(e.target.value)}>
            {dataset.geolocations.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dataset.geolocations.length === 0 ? (
        <p className="empty">Nothing to preview yet.</p>
      ) : mode === '2d' ? (
        <div className="card">
          <div className="map-legend">
            <span><i className="spawn" /> Geolocation spawn + radius</span>
            <span><i className="waypoint" /> Waypoints (tap for photo)</span>
          </div>
          <Map2D
            className="map-wrap tall"
            geolocations={dataset.geolocations}
            activeGeoId={selectedId}
            onWaypointClick={({ waypointId, geoId }) =>
              openHotspot(geoId, waypointId)
            }
          />
        </div>
      ) : selected ? (
        <div className="card">
          <h3>{selected.name}</h3>
          <WaypointScene3D
            className="scene-wrap"
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
          <p className="muted" style={{ marginTop: 8 }}>
            Drag sideways to rotate. {selected.waypoints.length} waypoints.
          </p>
        </div>
      ) : null}

      {hotspot && (
        <WaypointHotspotViewer
          title={hotspot.geoName}
          index={hotspot.index}
          waypoint={hotspot.waypoint}
          onClose={closeHotspot}
        />
      )}
    </div>
  )
}
