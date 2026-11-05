import { useState, type ReactNode } from 'react'
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

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'geolocations',
    label: 'Places',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
        />
      </svg>
    ),
  },
  {
    id: 'survey',
    label: 'Survey',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a1 1 0 0 1 1 1v1.06A8.001 8.001 0 0 1 20 12h-2a6 6 0 1 0-6 6v2a8 8 0 0 1 0-16V3a1 1 0 0 1 1-1zm1 7.5V12l2.2 1.3-.9 1.5L11 13V9.5h2z"
        />
      </svg>
    ),
  },
  {
    id: 'directions',
    label: 'Routes',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 6a2 2 0 1 1 0 4H3v2h1a4 4 0 0 0 3.87-3H14a3 3 0 0 1 2.82 2H15v2h1.82A3 3 0 1 0 14 9H8.87A4 4 0 0 0 5 6H4zm16 8a2 2 0 1 1 0 4h-1v2h1a4 4 0 0 0 0-8h-1v2h1z"
        />
      </svg>
    ),
  },
  {
    id: 'preview',
    label: 'Map',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.5 3l-5.2 1.7L9 3 3.5 4.8A1 1 0 0 0 3 5.7V19a1 1 0 0 0 1.3.96L9 18.3l6.3 1.7 5.2-1.8A1 1 0 0 0 21 17.3V5a1 1 0 0 0-.5-.97zM9 16.5l-4 1.3V6.7l4-1.3v11.1zm6.3 1.1L11 16.3V5.2l4.3 1.3v11.1z"
        />
      </svg>
    ),
  },
  {
    id: 'export',
    label: 'Data',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L19.5 9H15zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V9z"
        />
      </svg>
    ),
  },
  {
    id: 'user',
    label: 'Walk',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.5 5.5a2 2 0 1 1-2 0 2 2 0 0 1 2 0zM9.8 9.2 8 21h2.1l1.1-7 2.2 2v5h2v-6.2l-2.3-2.2.7-3.5A5.5 5.5 0 0 0 18 12h1.5a7 7 0 0 1-6.2-3.7L11.8 5.8 9.8 9.2z"
        />
      </svg>
    ),
  },
]

const TITLES: Record<Exclude<Tab, 'user'>, { title: string; sub: string }> = {
  geolocations: { title: 'Places', sub: 'Spawns & clusters' },
  survey: { title: 'Survey', sub: 'Drop waypoints on site' },
  directions: { title: 'Routes', sub: 'Start → end waypoints' },
  preview: { title: 'Map', sub: '2D / 3D data check' },
  export: { title: 'Data', sub: 'Export · import · reset' },
}

function AuthorShell() {
  const { loading, error, dataset } = useDataset()
  const [tab, setTab] = useState<Tab>('geolocations')

  if (loading) {
    return (
      <div className="app-shell boot">
        <div className="boot-mark">VECV</div>
        <p className="muted">Loading local draft…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell boot">
        <p className="empty">{error}</p>
      </div>
    )
  }

  if (tab === 'user') {
    return <PreviewFlow onExit={() => setTab('geolocations')} />
  }

  const meta = TITLES[tab]
  const geoCount = dataset?.geolocations.length ?? 0
  const dirCount = dataset?.directions.length ?? 0

  return (
    <div className="app-shell">
      <div className="app-atmosphere" aria-hidden="true" />
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">VECV</div>
          <div>
            <h1>{meta.title}</h1>
            <p className="header-sub">{meta.sub}</p>
          </div>
        </div>
        <div className="header-chips">
          <span className="chip">{geoCount} places</span>
          <span className="chip">{dirCount} routes</span>
        </div>
      </header>

      <main className="app-main">
        {tab === 'geolocations' && <GeolocationsScreen />}
        {tab === 'survey' && <SurveyScreen />}
        {tab === 'directions' && <DirectionsScreen />}
        {tab === 'preview' && <DataPreviewScreen />}
        {tab === 'export' && <ExportScreen />}
      </main>

      <nav className="tab-bar" aria-label="Author tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
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
