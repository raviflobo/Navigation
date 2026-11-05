import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { HOME_SPAWN, type GeolocationCluster, type Waypoint } from './types'

export interface MapUser {
  lat: number
  lon: number
  accuracyM?: number
}

interface Props {
  geolocations: GeolocationCluster[]
  /** Highlight this cluster's polyline more strongly */
  activeGeoId?: string | null
  /** Destination path waypoints to emphasize (User Preview) */
  pathWaypoints?: Waypoint[]
  /** Sync spawn markers only (intermediate geos) */
  syncSpawns?: { id: string; name: string; lat: number; lon: number; radiusM: number }[]
  user?: MapUser | null
  nextWaypoint?: { lat: number; lon: number } | null
  className?: string
  interactive?: boolean
  /** Fired when a waypoint marker is tapped (Survey edit). */
  onWaypointClick?: (payload: { waypointId: string; geoId: string }) => void
}

function emptyFc(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function buildMapData(
  geolocations: GeolocationCluster[],
  activeGeoId: string | null | undefined,
  pathWaypoints: Waypoint[] | undefined,
  syncSpawns: Props['syncSpawns'],
  user: MapUser | null | undefined,
  nextWaypoint: Props['nextWaypoint'],
) {
  const pathFeatures: Feature[] = []
  const wpFeatures: Feature[] = []
  const spawnFeatures: Feature[] = []
  const seenWp = new Set<string>()

  for (const g of geolocations) {
    if (g.spawn) {
      spawnFeatures.push({
        type: 'Feature',
        properties: { name: g.name, id: g.id, kind: 'spawn' },
        geometry: { type: 'Point', coordinates: [g.spawn.lon, g.spawn.lat] },
      })
    }
    if (g.waypoints.length >= 2) {
      const active = g.id === activeGeoId
      pathFeatures.push({
        type: 'Feature',
        properties: {
          color: active ? '#2a9d8f' : '#5c6b7a',
          width: active ? 5 : 3,
        },
        geometry: {
          type: 'LineString',
          coordinates: g.waypoints.map((w) => [w.lon, w.lat]),
        },
      })
    }
    g.waypoints.forEach((w, i) => {
      seenWp.add(w.id)
      wpFeatures.push({
        type: 'Feature',
        properties: {
          id: w.id,
          geoId: g.id,
          index: i + 1,
          label: String(i + 1),
          title: w.text || `WP ${i + 1}`,
        },
        geometry: { type: 'Point', coordinates: [w.lon, w.lat] },
      })
    })
  }

  if (pathWaypoints && pathWaypoints.length >= 2) {
    pathFeatures.push({
      type: 'Feature',
      properties: { color: '#e76f51', width: 6 },
      geometry: {
        type: 'LineString',
        coordinates: pathWaypoints.map((w) => [w.lon, w.lat]),
      },
    })
  }

  // Ensure path waypoints appear even if not in geolocations list
  pathWaypoints?.forEach((w, i) => {
    if (seenWp.has(w.id)) return
    wpFeatures.push({
      type: 'Feature',
      properties: {
        id: w.id,
        index: i + 1,
        label: String(i + 1),
        title: w.text || `WP ${i + 1}`,
      },
      geometry: { type: 'Point', coordinates: [w.lon, w.lat] },
    })
  })

  for (const s of syncSpawns || []) {
    spawnFeatures.push({
      type: 'Feature',
      properties: { name: s.name, id: s.id, kind: 'sync' },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    })
  }

  const userFeatures: Feature[] = user
    ? [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [user.lon, user.lat] },
        },
      ]
    : []

  const nextFeatures: Feature[] = nextWaypoint
    ? [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [nextWaypoint.lon, nextWaypoint.lat],
          },
        },
      ]
    : []

  return { pathFeatures, wpFeatures, spawnFeatures, userFeatures, nextFeatures }
}

export function Map2D({
  geolocations,
  activeGeoId,
  pathWaypoints,
  syncSpawns = [],
  user,
  nextWaypoint,
  className = 'map-wrap',
  interactive = true,
  onWaypointClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const readyRef = useRef(false)
  const clickRef = useRef(onWaypointClick)
  clickRef.current = onWaypointClick
  const dataRef = useRef({
    geolocations,
    activeGeoId,
    pathWaypoints,
    syncSpawns,
    user,
    nextWaypoint,
  })
  dataRef.current = {
    geolocations,
    activeGeoId,
    pathWaypoints,
    syncSpawns,
    user,
    nextWaypoint,
  }

  const applyData = (m: MlMap) => {
    if (!m.getSource('waypoints')) return false

    const {
      geolocations: geos,
      activeGeoId: active,
      pathWaypoints: pathWp,
      syncSpawns: sync,
      user: u,
      nextWaypoint: next,
    } = dataRef.current

    const built = buildMapData(geos, active, pathWp, sync, u, next)

    ;(m.getSource('paths') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: built.pathFeatures,
    })
    ;(m.getSource('waypoints') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: built.wpFeatures,
    })
    ;(m.getSource('spawns') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: built.spawnFeatures,
    })
    ;(m.getSource('user') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: built.userFeatures,
    })
    ;(m.getSource('next') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: built.nextFeatures,
    })

    const bounds = new maplibregl.LngLatBounds()
    let has = false
    const extend = (lon: number, lat: number) => {
      bounds.extend([lon, lat])
      has = true
    }
    for (const g of geos) {
      if (g.spawn) extend(g.spawn.lon, g.spawn.lat)
      for (const w of g.waypoints) extend(w.lon, w.lat)
    }
    for (const w of pathWp || []) extend(w.lon, w.lat)
    if (u) extend(u.lon, u.lat)
    if (has) {
      m.fitBounds(bounds, { padding: 56, maxZoom: 18, duration: 0 })
    }
    // Force repaint after layout (common when map mounts in a tab)
    requestAnimationFrame(() => {
      m.resize()
    })
    return true
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [HOME_SPAWN.lon, HOME_SPAWN.lat],
      zoom: 17,
      attributionControl: { compact: true },
      interactive,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const onReady = () => {
      if (!map.getSource('paths')) {
        map.addSource('paths', { type: 'geojson', data: emptyFc() })
        map.addSource('spawns', { type: 'geojson', data: emptyFc() })
        map.addSource('waypoints', { type: 'geojson', data: emptyFc() })
        map.addSource('user', { type: 'geojson', data: emptyFc() })
        map.addSource('next', { type: 'geojson', data: emptyFc() })

        map.addLayer({
          id: 'paths-line',
          type: 'line',
          source: 'paths',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': 0.95,
          },
        })
        map.addLayer({
          id: 'spawns-circle',
          type: 'circle',
          source: 'spawns',
          paint: {
            'circle-radius': 9,
            'circle-color': '#e9c46a',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#1a222c',
          },
        })
        map.addLayer({
          id: 'waypoints-circle',
          type: 'circle',
          source: 'waypoints',
          paint: {
            'circle-radius': 10,
            'circle-color': '#2a9d8f',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1,
          },
        })
        map.addLayer({
          id: 'waypoints-label',
          type: 'symbol',
          source: 'waypoints',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 12,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        })
        map.addLayer({
          id: 'waypoints-title',
          type: 'symbol',
          source: 'waypoints',
          layout: {
            'text-field': ['get', 'title'],
            'text-size': 11,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-offset': [0, 1.6],
            'text-anchor': 'top',
            'text-max-width': 10,
            'text-optional': true,
          },
          paint: {
            'text-color': '#e8eef4',
            'text-halo-color': '#0f1419',
            'text-halo-width': 1.5,
          },
        })
        map.addLayer({
          id: 'user-circle',
          type: 'circle',
          source: 'user',
          paint: {
            'circle-radius': 8,
            'circle-color': '#4cc9f0',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        })
        map.addLayer({
          id: 'next-circle',
          type: 'circle',
          source: 'next',
          paint: {
            'circle-radius': 8,
            'circle-color': '#e76f51',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        })

        const hitLayers = ['waypoints-circle', 'waypoints-label', 'waypoints-title']
        for (const layerId of hitLayers) {
          map.on('click', layerId, (e) => {
            const f = e.features?.[0]
            const waypointId = f?.properties?.id as string | undefined
            const geoId = f?.properties?.geoId as string | undefined
            if (waypointId && geoId && clickRef.current) {
              e.originalEvent.stopPropagation()
              clickRef.current({ waypointId, geoId })
            }
          })
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = ''
          })
        }
      }
      readyRef.current = true
      applyData(map)
    }

    map.on('load', onReady)
    mapRef.current = map

    const ro = new ResizeObserver(() => {
      map.resize()
      if (readyRef.current) applyData(map)
    })
    ro.observe(containerRef.current)

    return () => {
      readyRef.current = false
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (readyRef.current || map.isStyleLoaded()) {
      applyData(map)
    } else {
      map.once('load', () => applyData(map))
    }
  }, [geolocations, activeGeoId, pathWaypoints, syncSpawns, user, nextWaypoint])

  return <div ref={containerRef} className={className} />
}
