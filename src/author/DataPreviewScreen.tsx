import { useState } from 'react'
import { useDataset } from '../shared/DatasetContext'
import { Map2D } from '../shared/Map2D'
import { WaypointScene3D } from '../shared/WaypointScene3D'

export function DataPreviewScreen() {
  const { dataset } = useDataset()
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  if (!dataset) return null

  const selectedId = activeId || dataset.geolocations[0]?.id || ''
  const selected = dataset.geolocations.find((g) => g.id === selectedId)

  return (
    <div className="stack">
      <div className="card">
        <h2>Data preview</h2>
        <p className="muted">Inspect capture quality before User Preview or export.</p>
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
          <Map2D
            className="map-wrap tall"
            geolocations={dataset.geolocations}
            activeGeoId={selectedId}
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
    </div>
  )
}
