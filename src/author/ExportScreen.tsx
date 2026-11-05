import { useRef, useState } from 'react'
import { useDataset } from '../shared/DatasetContext'

export function ExportScreen() {
  const { dataset, exportFile, importFile, resetAll } = useDataset()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  if (!dataset) return null

  return (
    <div className="stack">
      <div className="card">
        <h2>Local data</h2>
        <p className="muted">
          Autosaved in IndexedDB on this browser/origin. Clearing site data wipes the
          draft — export JSON for backup and further development.
        </p>
        <p>
          <span className="pill">schema {dataset.schemaVersion}</span>{' '}
          <span className="pill">version {dataset.dataVersion}</span>
        </p>
        <p className="muted">Last updated: {dataset.updatedAt || '—'}</p>
        <p className="muted">
          {dataset.geolocations.length} geolocations · {dataset.directions.length}{' '}
          directions ·{' '}
          {dataset.geolocations.reduce((n, g) => n + g.waypoints.length, 0)} waypoints
        </p>
      </div>

      <div className="card">
        <h2>Export / Import</h2>
        <div className="stack">
          <button
            className="primary big-btn"
            onClick={async () => {
              await exportFile()
              setMsg('Download started.')
            }}
          >
            Download route JSON
          </button>
          <button
            className="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(dataset, null, 2))
                setMsg('Copied JSON to clipboard.')
              } catch {
                setMsg('Clipboard not available.')
              }
            }}
          >
            Copy JSON to clipboard
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                await importFile(file)
                setMsg(`Imported ${file.name}`)
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Import failed')
              }
            }}
          />
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <button
            className="danger"
            onClick={async () => {
              if (!confirm('Clear all local route data on this device?')) return
              await resetAll()
              setMsg('Dataset cleared.')
            }}
          >
            Clear all local data
          </button>
        </div>
        {msg && <p className="muted" style={{ marginTop: 12 }}>{msg}</p>}
      </div>

      <div className="card">
        <h2>GitHub Pages note</h2>
        <p className="muted">
          IndexedDB is per-origin. Data on localhost is separate from your GitHub Pages
          URL — use Export / Import to move surveys between them.
        </p>
      </div>
    </div>
  )
}
