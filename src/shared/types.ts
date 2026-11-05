export type GeoRole = 'start' | 'waypoint_cluster' | 'destination'

export interface LatLonFix {
  lat: number
  lon: number
  accuracyM: number
  capturedAt: string
}

export interface Waypoint {
  id: string
  lat: number
  lon: number
  accuracyM: number
  droppedAt: string
  text?: string
  photos?: string[]
}

export interface GeolocationCluster {
  id: string
  name: string
  role: GeoRole
  spawn: LatLonFix | null
  radiusM: number
  waypoints: Waypoint[]
}

export interface Direction {
  id: string
  name: string
  /** Sync / context geos; last is usually the path source if pathGeolocationId omitted. */
  geolocationIds: string[]
  /** Geolocation whose surveyed waypoints form the walk path. */
  pathGeolocationId?: string
  /** Start waypoint id on that path (omit = first waypoint). */
  startWaypointId?: string
  /** End waypoint id on that path (omit = last waypoint). */
  endWaypointId?: string
}

export interface RouteDataset {
  schemaVersion: 1
  dataVersion: string
  updatedAt: string
  geolocations: GeolocationCluster[]
  directions: Direction[]
}

/** Waypoint slice for a direction (start→end inclusive; reversed if end is before start). */
export function resolveDirectionPath(
  dataset: RouteDataset,
  direction: Direction,
): { pathGeo: GeolocationCluster | null; path: Waypoint[] } {
  const pathGeoId =
    direction.pathGeolocationId ??
    direction.geolocationIds[direction.geolocationIds.length - 1]
  const pathGeo = pathGeoId
    ? dataset.geolocations.find((g) => g.id === pathGeoId) ?? null
    : null
  if (!pathGeo || pathGeo.waypoints.length === 0) {
    return { pathGeo, path: [] }
  }
  const wps = pathGeo.waypoints
  let startIdx = 0
  let endIdx = wps.length - 1
  if (direction.startWaypointId) {
    const i = wps.findIndex((w) => w.id === direction.startWaypointId)
    if (i >= 0) startIdx = i
  }
  if (direction.endWaypointId) {
    const i = wps.findIndex((w) => w.id === direction.endWaypointId)
    if (i >= 0) endIdx = i
  }
  if (startIdx === endIdx) {
    return { pathGeo, path: [wps[startIdx]] }
  }
  if (startIdx < endIdx) {
    return { pathGeo, path: wps.slice(startIdx, endIdx + 1) }
  }
  return { pathGeo, path: wps.slice(endIdx, startIdx + 1).reverse() }
}

export function waypointLabel(wp: Waypoint, index: number): string {
  const n = `#${index + 1}`
  return wp.text?.trim() ? `${n} — ${wp.text.trim()}` : n
}

/** Known site point — Home (Indore area survey POC). */
export const HOME_SPAWN = {
  lat: 22.727916190455844,
  lon: 75.83056626681098,
  accuracyM: 5,
} as const

export const HOME_GEO_ID = 'geo-home'

export function emptyDataset(): RouteDataset {
  return {
    schemaVersion: 1,
    dataVersion: '0',
    updatedAt: new Date().toISOString(),
    geolocations: [],
    directions: [],
  }
}

/** First-launch seed includes Home destination at the known GPS point. */
export function seededDataset(): RouteDataset {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    dataVersion: '1',
    updatedAt: now,
    geolocations: [
      {
        id: HOME_GEO_ID,
        name: 'Home',
        role: 'destination',
        spawn: {
          lat: HOME_SPAWN.lat,
          lon: HOME_SPAWN.lon,
          accuracyM: HOME_SPAWN.accuracyM,
          capturedAt: now,
        },
        radiusM: 40,
        waypoints: [
          {
            id: 'wp-home-1',
            lat: HOME_SPAWN.lat,
            lon: HOME_SPAWN.lon,
            accuracyM: HOME_SPAWN.accuracyM,
            droppedAt: now,
            text: 'Home',
          },
        ],
      },
    ],
    directions: [],
  }
}

/** Ensure Home exists with the fixed spawn (idempotent for existing IndexedDB drafts). */
export function ensureHomeGeolocation(dataset: RouteDataset): RouteDataset {
  const now = new Date().toISOString()
  const spawn = {
    lat: HOME_SPAWN.lat,
    lon: HOME_SPAWN.lon,
    accuracyM: HOME_SPAWN.accuracyM,
    capturedAt: now,
  }
  const idx = dataset.geolocations.findIndex(
    (g) => g.id === HOME_GEO_ID || g.name.toLowerCase() === 'home',
  )
  if (idx >= 0) {
    const existing = dataset.geolocations[idx]
    const geos = [...dataset.geolocations]
    geos[idx] = {
      ...existing,
      name: 'Home',
      role: existing.role === 'start' ? 'destination' : existing.role || 'destination',
      spawn,
      waypoints:
        existing.waypoints.length > 0
          ? existing.waypoints
          : [
              {
                id: 'wp-home-1',
                lat: HOME_SPAWN.lat,
                lon: HOME_SPAWN.lon,
                accuracyM: HOME_SPAWN.accuracyM,
                droppedAt: now,
                text: 'Home',
              },
            ],
    }
    return { ...dataset, geolocations: geos }
  }
  return {
    ...dataset,
    geolocations: [
      ...dataset.geolocations,
      {
        id: HOME_GEO_ID,
        name: 'Home',
        role: 'destination',
        spawn,
        radiusM: 40,
        waypoints: [
          {
            id: 'wp-home-1',
            lat: HOME_SPAWN.lat,
            lon: HOME_SPAWN.lon,
            accuracyM: HOME_SPAWN.accuracyM,
            droppedAt: now,
            text: 'Home',
          },
        ],
      },
    ],
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
