import { useCallback, useEffect, useRef, useState } from 'react'
import type { PositionSample } from './geo'

export interface GeoState {
  position: PositionSample | null
  error: string | null
  watching: boolean
  permissionHint: string | null
}

export function useGeolocation(enabled: boolean) {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    watching: false,
    permissionHint: null,
  })
  const watchId = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setState((s) => ({ ...s, watching: false }))
  }, [])

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: 'Geolocation is not supported in this browser.',
        permissionHint: null,
      }))
      return
    }
    stop()
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          },
          error: null,
          watching: true,
          permissionHint: null,
        })
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: err.message || 'Location error',
          watching: false,
          permissionHint:
            err.code === err.PERMISSION_DENIED
              ? 'Allow location in browser settings, and use HTTPS (e.g. GitHub Pages).'
              : null,
        }))
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )
    setState((s) => ({ ...s, watching: true }))
  }, [stop])

  useEffect(() => {
    if (enabled) start()
    else stop()
    return stop
  }, [enabled, start, stop])

  return { ...state, start, stop }
}
