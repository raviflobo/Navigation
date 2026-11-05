import { useState } from 'react'
import { useDataset } from '../shared/DatasetContext'

export function DirectionsScreen() {
  const { dataset, addDirection, updateDirection, deleteDirection } = useDataset()
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (!dataset) return null

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const move = (id: string, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const create = () => {
    if (!name.trim()) {
      alert('Enter a direction name.')
      return
    }
    if (selectedIds.length === 0) {
      alert('Select at least one geolocation (destination last).')
      return
    }
    const last = dataset.geolocations.find(
      (g) => g.id === selectedIds[selectedIds.length - 1],
    )
    if (last && last.role !== 'destination') {
      const ok = confirm(
        'Last geolocation is not marked as destination. Continue anyway?',
      )
      if (!ok) return
    }
    addDirection(name.trim(), selectedIds)
    setName('')
    setSelectedIds([])
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Build a direction</h2>
        <p className="muted">
          Order geolocations for sync context. The <strong>last</strong> should be the
          destination — User Preview follows only that destination&apos;s waypoints.
        </p>
        <div className="field">
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "To Home", "To Garden"'
          />
        </div>
        <div className="field">
          <label>Geolocations (tap to include, reorder below)</label>
          {dataset.geolocations.length === 0 && (
            <p className="muted">Add geolocations first.</p>
          )}
          {dataset.geolocations.map((g) => (
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
                checked={selectedIds.includes(g.id)}
                onChange={() => toggle(g.id)}
                style={{ width: 'auto', minHeight: 0 }}
              />
              {g.name} <span className="pill">{g.role}</span>
            </label>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <div className="field">
            <label>Order (destination last)</label>
            {selectedIds.map((id) => {
              const g = dataset.geolocations.find((x) => x.id === id)
              return (
                <div key={id} className="row" style={{ marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>{g?.name ?? id}</span>
                  <button className="ghost" onClick={() => move(id, -1)}>
                    Up
                  </button>
                  <button className="ghost" onClick={() => move(id, 1)}>
                    Down
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <button className="primary big-btn" onClick={create}>
          Save direction
        </button>
      </div>

      <div className="card">
        <h2>Directions ({dataset.directions.length})</h2>
        {dataset.directions.length === 0 && (
          <p className="empty">No directions yet.</p>
        )}
        {dataset.directions.map((d) => (
          <div key={d.id} className="list-item">
            <div>
              <strong>{d.name}</strong>
              <div className="muted">
                {d.geolocationIds
                  .map((id) => dataset.geolocations.find((g) => g.id === id)?.name ?? '?')
                  .join(' → ')}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  onClick={() => {
                    const n = prompt('Rename direction', d.name)
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
