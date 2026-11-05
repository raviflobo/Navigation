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
  geolocationIds: string[]
}

export interface RouteDataset {
  schemaVersion: 1
  dataVersion: string
  updatedAt: string
  geolocations: GeolocationCluster[]
  directions: Direction[]
}

export function emptyDataset(): RouteDataset {
  return {
    schemaVersion: 1,
    dataVersion: '0',
    updatedAt: new Date().toISOString(),
    geolocations: [],
    directions: [],
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
