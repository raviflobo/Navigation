import { useState } from 'react'
import { DatasetProvider, useDataset } from './shared/DatasetContext'
import { GeolocationsScreen } from './author/GeolocationsScreen'
import { SurveyScreen } from './author/SurveyScreen'
import { DirectionsScreen } from './author/DirectionsScreen'
import { DataPreviewScreen } from './author/DataPreviewScreen'
import { ExportScreen } from './author/ExportScreen'
import { PreviewFlow } from './preview/PreviewFlow'

type Tab =
  | 'geolocations'
  | 'survey'
  | 'directions'
  | 'preview'
  | 'export'
  | 'user'

const TABS: { id: Tab; label: string }[] = [
  { id: 'geolocations', label: 'Geos' },
  { id: 'survey', label: 'Survey' },
  { id: 'directions', label: 'Dirs' },
  { id: 'preview', label: 'Data' },
  { id: 'export', label: 'Export' },
  { id: 'user', label: 'As user' },
]

function AuthorShell() {
  const { loading, error } = useDataset()
  const [tab, setTab] = useState<Tab>('geolocations')

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">Loading local data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="empty">{error}</div>
      </div>
    )
  }

  if (tab === 'user') {
    return <PreviewFlow onExit={() => setTab('geolocations')} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>VECV Route Author</h1>
        <span className="pill">POC</span>
      </header>
      <main className="app-main">
        {tab === 'geolocations' && <GeolocationsScreen />}
        {tab === 'survey' && <SurveyScreen />}
        {tab === 'directions' && <DirectionsScreen />}
        {tab === 'preview' && <DataPreviewScreen />}
        {tab === 'export' && <ExportScreen />}
      </main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <DatasetProvider>
      <AuthorShell />
    </DatasetProvider>
  )
}
