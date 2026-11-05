import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeHeading } from './geo'

type Doe = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  absolute?: boolean
}

export interface CompassState {
  heading: number | null
  source: 'webkit' | 'absolute' | 'orientation' | null
  error: string | null
  permission: 'unknown' | 'granted' | 'denied' | 'unsupported'
}

export function useCompass(enabled: boolean) {
  const [state, setState] = useState<CompassState>({
    heading: null,
    source: null,
    error: null,
    permission: 'unknown',
  })
  const listening = useRef(false)

  const onOrientation = useCallback((ev: Event) => {
    const e = ev as Doe
    let heading: number | null = null
    let source: CompassState['source'] = null

    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      heading = normalizeHeading(e.webkitCompassHeading)
      source = 'webkit'
    } else if (typeof e.alpha === 'number' && e.alpha != null) {
      // alpha is degrees from north when absolute; otherwise relative
      heading = normalizeHeading(360 - e.alpha)
      source = e.absolute ? 'absolute' : 'orientation'
    }

    if (heading == null) return
    setState((s) => ({ ...s, heading, source, error: null }))
  }, [])

  const stop = useCallback(() => {
    if (!listening.current) return
    window.removeEventListener('deviceorientationabsolute', onOrientation)
    window.removeEventListener('deviceorientation', onOrientation)
    listening.current = false
  }, [onOrientation])

  const startListening = useCallback(() => {
    stop()
    window.addEventListener('deviceorientationabsolute', onOrientation, true)
    window.addEventListener('deviceorientation', onOrientation, true)
    listening.current = true
  }, [onOrientation, stop])

  /** Must be called from a user tap on iOS. */
  const requestPermissionAndStart = useCallback(async () => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    try {
      if (typeof DOE.requestPermission === 'function') {
        const result = await DOE.requestPermission()
        if (result !== 'granted') {
          setState((s) => ({
            ...s,
            permission: 'denied',
            error: 'Motion/compass permission denied.',
          }))
          return false
        }
        setState((s) => ({ ...s, permission: 'granted', error: null }))
      } else {
        setState((s) => ({ ...s, permission: 'granted', error: null }))
      }
      startListening()
      return true
    } catch {
      setState((s) => ({
        ...s,
        permission: 'unsupported',
        error: 'Compass not available.',
      }))
      return false
    }
  }, [startListening])

  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }
    // Android can start without explicit permission API
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DOE.requestPermission !== 'function') {
      startListening()
      setState((s) => ({ ...s, permission: 'granted' }))
    }
    return stop
  }, [enabled, startListening, stop])

  return { ...state, requestPermissionAndStart, stop }
}
