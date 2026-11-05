import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeolocationCluster, Waypoint } from './types'

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
}

function emptyFc(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [75.7, 22.6],
      zoom: 15,
      attributionControl: { compact: true },
      interactive,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
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
          'line-opacity': 0.9,
        },
      })
      map.addLayer({
        id: 'spawns-circle',
        type: 'circle',
        source: 'spawns',
        paint: {
          'circle-radius': 8,
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
          'circle-radius': 5,
          'circle-color': '#2a9d8f',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
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
          'circle-radius': 7,
          'circle-color': '#e76f51',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      const onLoad = () => updateSources()
      map?.once('load', onLoad)
      return
    }
    updateSources()

    function updateSources() {
      const m = mapRef.current
      if (!m) return

      const pathFeatures: Feature[] = []
      const wpFeatures: Feature[] = []
      const spawnFeatures: Feature[] = []

      for (const g of geolocations) {
        if (g.spawn) {
          spawnFeatures.push({
            type: 'Feature',
            properties: { name: g.name, id: g.id },
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
        for (const w of g.waypoints) {
          wpFeatures.push({
            type: 'Feature',
            properties: { id: w.id },
            geometry: { type: 'Point', coordinates: [w.lon, w.lat] },
          })
        }
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

      for (const s of syncSpawns) {
        spawnFeatures.push({
          type: 'Feature',
          properties: { name: s.name, id: s.id },
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        })
      }

      ;(m.getSource('paths') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: pathFeatures,
      })
      ;(m.getSource('waypoints') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: wpFeatures,
      })
      ;(m.getSource('spawns') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: spawnFeatures,
      })
      ;(m.getSource('user') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: user
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [user.lon, user.lat] },
              },
            ]
          : [],
      })
      ;(m.getSource('next') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: nextWaypoint
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
          : [],
      })

      const bounds = new maplibregl.LngLatBounds()
      let has = false
      const extend = (lon: number, lat: number) => {
        bounds.extend([lon, lat])
        has = true
      }
      for (const g of geolocations) {
        if (g.spawn) extend(g.spawn.lon, g.spawn.lat)
        for (const w of g.waypoints) extend(w.lon, w.lat)
      }
      if (user) extend(user.lon, user.lat)
      if (has) {
        m.fitBounds(bounds, { padding: 48, maxZoom: 18, duration: 0 })
      }
    }
  }, [geolocations, activeGeoId, pathWaypoints, syncSpawns, user, nextWaypoint])

  return <div ref={containerRef} className={className} />
}
