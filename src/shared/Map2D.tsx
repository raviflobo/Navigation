import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HOME_SPAWN, type GeolocationCluster, type Waypoint } from './types'

export interface MapUser {
  lat: number
  lon: number
  accuracyM?: number
}

interface Props {
  geolocations: GeolocationCluster[]
  activeGeoId?: string | null
  pathWaypoints?: Waypoint[]
  syncSpawns?: { id: string; name: string; lat: number; lon: number; radiusM: number }[]
  user?: MapUser | null
  nextWaypoint?: { lat: number; lon: number } | null
  className?: string
  interactive?: boolean
  onWaypointClick?: (payload: { waypointId: string; geoId: string }) => void
  onWaypointMove?: (payload: {
    waypointId: string
    geoId: string
    lat: number
    lon: number
  }) => void
}

/** Exact 32×32 pin; iconAnchor center = GPS point. Label is CSS-absolute (does not affect anchor). */
function exactPinIcon(n: number, title: string) {
  const safe = title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return L.divIcon({
    className: 'leaflet-exact-pin',
    html: `<div class="exact-pin" title="${safe}"><span>${n}</span><div class="exact-pin-label">${safe}</div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16], // geometric center of the pin = lat/lon
  })
}

function exactSpawnIcon(name: string) {
  const safe = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return L.divIcon({
    className: 'leaflet-exact-pin',
    html: `<div class="exact-spawn" title="${safe}"><div class="exact-pin-label">${safe}</div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
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
  onWaypointMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const clickRef = useRef(onWaypointClick)
  const moveRef = useRef(onWaypointMove)
  clickRef.current = onWaypointClick
  moveRef.current = onWaypointMove

  useEffect(() => {
    const node = containerRef.current
    if (!node || mapRef.current) return

    const map = L.map(node, {
      zoomControl: true,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    }).setView([HOME_SPAWN.lat, HOME_SPAWN.lon], 17)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map)

    const group = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = group

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(node)
    setTimeout(() => map.invalidateSize(), 50)
    setTimeout(() => map.invalidateSize(), 250)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return

    group.clearLayers()
    const bounds = L.latLngBounds([])
    let has = false
    const extend = (lat: number, lon: number) => {
      bounds.extend([lat, lon])
      has = true
    }

    for (const g of geolocations) {
      if (g.spawn) {
        // Ground-truth ring at exact spawn GPS
        L.circle([g.spawn.lat, g.spawn.lon], {
          radius: g.radiusM,
          color: '#eab308',
          weight: 1,
          fillColor: '#eab308',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(group)

        // Exact spawn point (pixel circle under icon)
        L.circleMarker([g.spawn.lat, g.spawn.lon], {
          radius: 5,
          color: '#111827',
          weight: 2,
          fillColor: '#eab308',
          fillOpacity: 1,
          interactive: false,
        }).addTo(group)

        L.marker([g.spawn.lat, g.spawn.lon], {
          icon: exactSpawnIcon(g.name),
          interactive: false,
          keyboard: false,
        }).addTo(group)

        extend(g.spawn.lat, g.spawn.lon)
      }

      // Path through exact waypoint coordinates
      if (g.waypoints.length >= 2) {
        L.polyline(
          g.waypoints.map((w) => L.latLng(w.lat, w.lon)),
          {
            color: g.id === activeGeoId ? '#0d9488' : '#64748b',
            weight: g.id === activeGeoId ? 5 : 3,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
          },
        ).addTo(group)
      }

      g.waypoints.forEach((w, i) => {
        const latlng = L.latLng(w.lat, w.lon)

        // Ground-truth dot — always centered on GPS (no icon offset)
        L.circleMarker(latlng, {
          radius: 4,
          color: '#ffffff',
          weight: 2,
          fillColor: '#042f2e',
          fillOpacity: 1,
          interactive: false,
        }).addTo(group)

        const marker = L.marker(latlng, {
          icon: exactPinIcon(i + 1, w.text || `WP ${i + 1}`),
          draggable: !!moveRef.current,
          autoPan: true,
          riseOnHover: true,
        }).addTo(group)

        marker.on('click', () => {
          clickRef.current?.({ waypointId: w.id, geoId: g.id })
        })

        marker.on('drag', () => {
          // Keep polyline live while dragging by rebuilding is heavy;
          // position is updated via marker.getLatLng on dragend.
        })

        marker.on('dragend', () => {
          const ll = marker.getLatLng()
          moveRef.current?.({
            waypointId: w.id,
            geoId: g.id,
            lat: ll.lat,
            lon: ll.lng,
          })
        })

        extend(w.lat, w.lon)
      })
    }

    for (const s of syncSpawns) {
      L.circleMarker([s.lat, s.lon], {
        radius: 5,
        color: '#111827',
        weight: 2,
        fillColor: '#eab308',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group)
      L.marker([s.lat, s.lon], {
        icon: exactSpawnIcon(s.name),
        interactive: false,
      }).addTo(group)
      extend(s.lat, s.lon)
    }

    if (pathWaypoints && pathWaypoints.length >= 2) {
      L.polyline(
        pathWaypoints.map((w) => L.latLng(w.lat, w.lon)),
        { color: '#ea580c', weight: 5 },
      ).addTo(group)
    }

    if (user) {
      L.circleMarker([user.lat, user.lon], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 1,
      }).addTo(group)
      extend(user.lat, user.lon)
    }

    if (nextWaypoint) {
      L.circleMarker([nextWaypoint.lat, nextWaypoint.lon], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#f97316',
        fillOpacity: 1,
      }).addTo(group)
    }

    map.invalidateSize()
    if (has && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 18 })
    }
  }, [geolocations, activeGeoId, pathWaypoints, syncSpawns, user, nextWaypoint])

  const wpCount = geolocations.reduce((n, g) => n + g.waypoints.length, 0)

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} className={className} />
      <div className="map-count-badge">
        {wpCount} waypoint{wpCount === 1 ? '' : 's'} · GPS-accurate
        {onWaypointMove ? ' · drag to adjust' : ''}
      </div>
    </div>
  )
}
