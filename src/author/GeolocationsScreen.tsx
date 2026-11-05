import { useState } from 'react'
import { useDataset } from '../shared/DatasetContext'
import { useGeolocation } from '../shared/useGeolocation'
import { isAccuracyOk } from '../shared/geo'
import type { GeoRole } from '../shared/types'

const ROLES: { value: GeoRole; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'waypoint_cluster', label: 'Waypoint cluster' },
  { value: 'destination', label: 'Destination' },
]

export function GeolocationsScreen() {
  const { dataset, addGeolocation, updateGeolocation, deleteGeolocation } = useDataset()
  const geo = useGeolocation(true)
  const [name, setName] = useState('')
  const [role, setRole] = useState<GeoRole>('waypoint_cluster')
  const [radiusM, setRadiusM] = useState(40)

  if (!dataset) return null

  const pinSpawn = (id: string) => {
    if (!geo.position) {
      alert('No GPS fix yet. Wait for a location reading.')
      return
    }
    if (!isAccuracyOk(geo.position.accuracyM, 50)) {
      const ok = confirm(
        `Accuracy is ${geo.position.accuracyM.toFixed(0)} m (preferred ≤ 30–50 m). Use this fix anyway?`,
      )
      if (!ok) return
    }
    updateGeolocation(id, {
      spawn: {
        lat: geo.position.lat,
        lon: geo.position.lon,
        accuracyM: geo.position.accuracyM,
        capturedAt: new Date().toISOString(),
      },
    })
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>GPS status</h2>
        {geo.error && <p className="muted">{geo.error}</p>}
        {geo.permissionHint && <p className="muted">{geo.permissionHint}</p>}
        {geo.position ? (
          <p className="muted">
            {geo.position.lat.toFixed(6)}, {geo.position.lon.toFixed(6)} · ±
            {geo.position.accuracyM.toFixed(0)} m
            {isAccuracyOk(geo.position.accuracyM) ? (
              <span className="pill ok"> good</span>
            ) : (
              <span className="pill warn"> weak</span>
            )}
          </p>
        ) : (
          <p className="muted">Waiting for location…</p>
        )}
      </div>

      <div className="card">
        <h2>Add geolocation</h2>
        <div className="field">
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Start, Yard, Home, Garden"
          />
        </div>
        <div className="field">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as GeoRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Sync radius (m)</label>
          <input
            type="number"
            min={10}
            max={200}
            value={radiusM}
            onChange={(e) => setRadiusM(Number(e.target.value) || 40)}
          />
        </div>
        <button
          className="primary big-btn"
          disabled={!name.trim()}
          onClick={() => {
            addGeolocation({ name: name.trim(), role, radiusM })
            setName('')
          }}
        >
          Add geolocation
        </button>
      </div>

      <div className="card">
        <h2>Geolocations ({dataset.geolocations.length})</h2>
        {dataset.geolocations.length === 0 && (
          <p className="empty">No geolocations yet. Add Start, then destinations like Home and Garden.</p>
        )}
        {dataset.geolocations.map((g) => (
          <div key={g.id} className="list-item">
            <div>
              <strong>{g.name}</strong>{' '}
              <span className="pill">{g.role}</span>
              <div className="muted">
                {g.spawn
                  ? `Spawn ${g.spawn.lat.toFixed(5)}, ${g.spawn.lon.toFixed(5)} (±${g.spawn.accuracyM.toFixed(0)} m)`
                  : 'Spawn not set'}
              </div>
              <div className="muted">
                Radius {g.radiusM} m · {g.waypoints.length} waypoints
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="primary" onClick={() => pinSpawn(g.id)}>
                  Set spawn from GPS
                </button>
                <button
                  onClick={() => {
                    const n = prompt('Rename', g.name)
                    if (n?.trim()) updateGeolocation(g.id, { name: n.trim() })
                  }}
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    const r = prompt('Sync radius (m)', String(g.radiusM))
                    if (r) updateGeolocation(g.id, { radiusM: Number(r) || g.radiusM })
                  }}
                >
                  Radius
                </button>
                <select
                  style={{ width: 'auto' }}
                  value={g.role}
                  onChange={(e) =>
                    updateGeolocation(g.id, { role: e.target.value as GeoRole })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button className="danger" onClick={() => deleteGeolocation(g.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
