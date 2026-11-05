import { useCallback, useState } from 'react'
import type { GeolocationCluster, Waypoint } from './types'

export type HotspotSelection = {
  geoId: string
  geoName: string
  index: number
  waypoint: Waypoint
}

export function useWaypointHotspot(geolocations: GeolocationCluster[]) {
  const [hotspot, setHotspot] = useState<HotspotSelection | null>(null)

  const openHotspot = useCallback(
    (geoId: string, waypointId: string) => {
      const geo = geolocations.find((g) => g.id === geoId)
      if (!geo) return
      const index = geo.waypoints.findIndex((w) => w.id === waypointId)
      if (index < 0) return
      setHotspot({
        geoId,
        geoName: geo.name,
        index: index + 1,
        waypoint: geo.waypoints[index],
      })
    },
    [geolocations],
  )

  const closeHotspot = useCallback(() => setHotspot(null), [])

  return { hotspot, openHotspot, closeHotspot, setHotspot }
}
