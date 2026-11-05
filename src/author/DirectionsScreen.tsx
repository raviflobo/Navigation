import { useState } from 'react'
import { useDataset } from '../shared/DatasetContext'
import { resolveDirectionPath, waypointLabel } from '../shared/types'

export function DirectionsScreen() {
  const { dataset, addDirection, updateDirection, deleteDirection } = useDataset()
  const [name, setName] = useState('')
  const [pathGeoId, setPathGeoId] = useState('')
  const [startWpId, setStartWpId] = useState('')
  const [endWpId, setEndWpId] = useState('')
  const [extraSyncIds, setExtraSyncIds] = useState<string[]>([])

  if (!dataset) return null

  const pathGeos = dataset.geolocations.filter((g) => g.waypoints.length > 0)
  const preferredPathId =
    pathGeos.find((g) => g.role === 'start')?.id ?? pathGeos[0]?.id ?? ''
  const effectivePathGeoId = pathGeoId || preferredPathId
  const effectivePathGeo = pathGeos.find((g) => g.id === effectivePathGeoId)

  const startOptions = effectivePathGeo?.waypoints ?? []
  const endOptions = effectivePathGeo?.waypoints ?? []
  const startIdx = startOptions.findIndex((w) => w.id === startWpId)
  const endIdx = endOptions.findIndex((w) => w.id === endWpId)

  const toggleSync = (id: string) => {
    setExtraSyncIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const onPathGeoChange = (id: string) => {
    setPathGeoId(id)
    setStartWpId('')
    setEndWpId('')
  }

  const suggestedName = () => {
    if (!effectivePathGeo || startIdx < 0 || endIdx < 0) return ''
    const a = waypointLabel(startOptions[startIdx], startIdx)
    const b = waypointLabel(endOptions[endIdx], endIdx)
    return `${a} → ${b}`
  }

  const create = () => {
    if (!effectivePathGeo) {
      alert('Pick a geolocation that has surveyed waypoints.')
      return
    }
    if (!startWpId || !endWpId) {
      alert('Select both a start waypoint and an end waypoint.')
      return
    }
    if (startWpId === endWpId) {
      alert('Start and end must be different waypoints.')
      return
    }
    const label = name.trim() || suggestedName()
    const geolocationIds = [
      ...extraSyncIds.filter((id) => id !== effectivePathGeo.id),
      effectivePathGeo.id,
    ]
    addDirection(label, geolocationIds, {
      pathGeolocationId: effectivePathGeo.id,
      startWaypointId: startWpId,
      endWaypointId: endWpId,
    })
    setName('')
    setStartWpId('')
    setEndWpId('')
    setExtraSyncIds([])
  }

  const describeDirection = (d: (typeof dataset.directions)[0]) => {
    const { pathGeo: pg, path } = resolveDirectionPath(dataset, d)
    if (!pg || path.length === 0) {
      return d.geolocationIds
        .map((id) => dataset.geolocations.find((g) => g.id === id)?.name ?? '?')
        .join(' → ')
    }
    const all = pg.waypoints
    const s = d.startWaypointId
      ? all.findIndex((w) => w.id === d.startWaypointId)
      : 0
    const e = d.endWaypointId
      ? all.findIndex((w) => w.id === d.endWaypointId)
      : all.length - 1
    const startL = s >= 0 ? waypointLabel(all[s], s) : '?'
    const endL = e >= 0 ? waypointLabel(all[e], e) : '?'
    return `${pg.name}: ${startL} → ${endL} (${path.length} points)`
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>How routes work</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Pick the place that holds your surveyed path (often <strong>start</strong>),
          then choose an existing <strong>start</strong> and <strong>end</strong> waypoint.
          Walk mode follows that slice only.
        </p>
      </div>

      <div className="card">
        <h2>Build a route</h2>
        {pathGeos.length === 0 ? (
          <p className="empty">
            No waypoints yet. Survey a geolocation first, then come back here.
          </p>
        ) : (
          <>
            <div className="field">
              <label>Path geolocation (waypoints source)</label>
              <select
                value={effectivePathGeoId}
                onChange={(e) => onPathGeoChange(e.target.value)}
              >
                {pathGeos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.role}) — {g.waypoints.length} waypoints
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Start waypoint</label>
              <select
                value={startWpId}
                onChange={(e) => setStartWpId(e.target.value)}
              >
                <option value="">Select start…</option>
                {startOptions.map((w, i) => (
                  <option key={w.id} value={w.id}>
                    {waypointLabel(w, i)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>End waypoint</label>
              <select value={endWpId} onChange={(e) => setEndWpId(e.target.value)}>
                <option value="">Select end…</option>
                {endOptions.map((w, i) => (
                  <option key={w.id} value={w.id} disabled={w.id === startWpId}>
                    {waypointLabel(w, i)}
                  </option>
                ))}
              </select>
            </div>

            {startIdx >= 0 && endIdx >= 0 && startWpId !== endWpId && (
              <p className="muted">
                Path will use{' '}
                <strong>{Math.abs(endIdx - startIdx) + 1} waypoints</strong> (
                {waypointLabel(startOptions[startIdx], startIdx)} →{' '}
                {waypointLabel(endOptions[endIdx], endIdx)}
                {endIdx < startIdx ? ', reverse order' : ''}).
              </p>
            )}

            <div className="field">
              <label>Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggestedName() || 'e.g. Gate to Home'}
              />
            </div>

            {dataset.geolocations.some((g) => g.id !== effectivePathGeoId) && (
              <div className="field">
                <label>Extra sync geolocations (optional)</label>
                {dataset.geolocations
                  .filter((g) => g.id !== effectivePathGeoId)
                  .map((g) => (
                    <label
                      key={g.id}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        marginBottom: 8,
                        color: 'var(--text)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={extraSyncIds.includes(g.id)}
                        onChange={() => toggleSync(g.id)}
                        style={{ width: 'auto', minHeight: 0 }}
                      />
                      {g.name} <span className="pill">{g.role}</span>
                    </label>
                  ))}
              </div>
            )}

            <button
              className="primary big-btn"
              disabled={!startWpId || !endWpId || startWpId === endWpId}
              onClick={create}
            >
              Save route
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2>Routes ({dataset.directions.length})</h2>
        {dataset.directions.length === 0 && (
          <p className="empty">No routes yet.</p>
        )}
        {dataset.directions.map((d) => (
          <div key={d.id} className="list-item">
            <div>
              <strong>{d.name}</strong>
              <div className="muted">{describeDirection(d)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  onClick={() => {
                    const n = prompt('Rename route', d.name)
                    if (n?.trim()) updateDirection(d.id, { name: n.trim() })
                  }}
                >
                  Rename
                </button>
                <button className="danger" onClick={() => deleteDirection(d.id)}>
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
