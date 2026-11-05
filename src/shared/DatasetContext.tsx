import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearDataset,
  downloadJson,
  flushAutosave,
  getCachedDataset,
  importJson,
  loadDataset,
  scheduleAutosave,
  subscribeDataset,
} from './store'
import type { Direction, GeolocationCluster, RouteDataset, Waypoint } from './types'
import { newId } from './types'

interface DatasetApi {
  dataset: RouteDataset | null
  loading: boolean
  error: string | null
  setDataset: (updater: (prev: RouteDataset) => RouteDataset) => void
  addGeolocation: (partial: {
    name: string
    role: GeolocationCluster['role']
    radiusM?: number
  }) => void
  updateGeolocation: (id: string, patch: Partial<GeolocationCluster>) => void
  deleteGeolocation: (id: string) => void
  addWaypoint: (geoId: string, wp: Omit<Waypoint, 'id'>) => string
  updateWaypoint: (geoId: string, wpId: string, patch: Partial<Waypoint>) => void
  deleteWaypoint: (geoId: string, wpId: string) => void
  undoLastWaypoint: (geoId: string) => void
  addDirection: (name: string, geolocationIds: string[]) => void
  updateDirection: (id: string, patch: Partial<Direction>) => void
  deleteDirection: (id: string) => void
  exportFile: () => Promise<void>
  importFile: (file: File) => Promise<void>
  resetAll: () => Promise<void>
}

const Ctx = createContext<DatasetApi | null>(null)

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<RouteDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await loadDataset()
        if (!cancelled) setDatasetState(d)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return subscribeDataset((d) => setDatasetState(d))
  }, [])

  const setDataset = useCallback((updater: (prev: RouteDataset) => RouteDataset) => {
    setDatasetState((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      scheduleAutosave(next)
      return next
    })
  }, [])

  const api = useMemo<DatasetApi>(() => {
    return {
      dataset,
      loading,
      error,
      setDataset,
      addGeolocation: ({ name, role, radiusM = 40 }) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: [
            ...prev.geolocations,
            {
              id: newId('geo'),
              name,
              role,
              spawn: null,
              radiusM,
              waypoints: [],
            },
          ],
        }))
      },
      updateGeolocation: (id, patch) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.map((g) =>
            g.id === id ? { ...g, ...patch } : g,
          ),
        }))
      },
      deleteGeolocation: (id) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.filter((g) => g.id !== id),
          directions: prev.directions.map((d) => ({
            ...d,
            geolocationIds: d.geolocationIds.filter((gid) => gid !== id),
          })),
        }))
      },
      addWaypoint: (geoId, wp) => {
        const id = newId('wp')
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.map((g) =>
            g.id === geoId
              ? { ...g, waypoints: [...g.waypoints, { ...wp, id }] }
              : g,
          ),
        }))
        return id
      },
      updateWaypoint: (geoId, wpId, patch) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.map((g) =>
            g.id === geoId
              ? {
                  ...g,
                  waypoints: g.waypoints.map((w) =>
                    w.id === wpId ? { ...w, ...patch } : w,
                  ),
                }
              : g,
          ),
        }))
      },
      deleteWaypoint: (geoId, wpId) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.map((g) =>
            g.id === geoId
              ? { ...g, waypoints: g.waypoints.filter((w) => w.id !== wpId) }
              : g,
          ),
        }))
      },
      undoLastWaypoint: (geoId) => {
        setDataset((prev) => ({
          ...prev,
          geolocations: prev.geolocations.map((g) =>
            g.id === geoId ? { ...g, waypoints: g.waypoints.slice(0, -1) } : g,
          ),
        }))
      },
      addDirection: (name, geolocationIds) => {
        setDataset((prev) => ({
          ...prev,
          directions: [
            ...prev.directions,
            { id: newId('dir'), name, geolocationIds },
          ],
        }))
      },
      updateDirection: (id, patch) => {
        setDataset((prev) => ({
          ...prev,
          directions: prev.directions.map((d) =>
            d.id === id ? { ...d, ...patch } : d,
          ),
        }))
      },
      deleteDirection: (id) => {
        setDataset((prev) => ({
          ...prev,
          directions: prev.directions.filter((d) => d.id !== id),
        }))
      },
      exportFile: async () => {
        const current = getCachedDataset() ?? dataset
        if (!current) return
        const flushed = await flushAutosave(current)
        downloadJson(flushed)
      },
      importFile: async (file) => {
        await importJson(file)
      },
      resetAll: async () => {
        await clearDataset()
      },
    }
  }, [dataset, loading, error, setDataset])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useDataset() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider')
  return ctx
}
