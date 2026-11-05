import { useEffect, useMemo, useRef, useState } from 'react'
import { useDataset } from '../shared/DatasetContext'
import { useCompass } from '../shared/useCompass'
import { useGeolocation } from '../shared/useGeolocation'
import {
  arrowAngle,
  bearingDeg,
  distanceToIndexM,
  haversineM,
  interpolateAlongPath,
  nearestWaypointIndex,
  pathLengthM,
} from '../shared/geo'
import { Map2D } from '../shared/Map2D'
import { Arrow3D } from './Arrow3D'
import {
  resolveDirectionPath,
  waypointLabel,
  type Direction,
  type GeolocationCluster,
  type Waypoint,
} from '../shared/types'

type Step = 'start' | 'destination' | 'navigate' | 'arrived'

interface Props {
  onExit: () => void
}

const ARRIVE_M = 12

export function PreviewFlow({ onExit }: Props) {
  const { dataset } = useDataset()
  const [step, setStep] = useState<Step>('start')
  const [directionId, setDirectionId] = useState('')
  const [startFrom, setStartFrom] = useState<string>('authored')
  const [wpIndex, setWpIndex] = useState(0)
  const [simulate, setSimulate] = useState(false)
  const [simDist, setSimDist] = useState(0)
  const [syncedGeoId, setSyncedGeoId] = useState<string | null>(null)
  const compass = useCompass(step === 'navigate' || step === 'start')
  const gps = useGeolocation(step === 'destination' || (step === 'navigate' && !simulate))

  const direction: Direction | undefined = dataset?.directions.find(
    (d) => d.id === directionId,
  )

  const { pathGeo, path }: { pathGeo: GeolocationCluster | null; path: Waypoint[] } =
    useMemo(() => {
      if (!dataset || !direction) return { pathGeo: null, path: [] }
      return resolveDirectionPath(dataset, direction)
    }, [dataset, direction])

  const endWp = path.length > 0 ? path[path.length - 1] : null

  const syncSpawns = useMemo(() => {
    if (!dataset || !direction) return []
    return direction.geolocationIds
      .filter((id) => id !== pathGeo?.id)
      .map((id) => dataset.geolocations.find((g) => g.id === id))
      .filter((g): g is GeolocationCluster => !!g && !!g.spawn)
      .map((g) => ({
        id: g.id,
        name: g.name,
        lat: g.spawn!.lat,
        lon: g.spawn!.lon,
        radiusM: g.radiusM,
      }))
  }, [dataset, direction, pathGeo])

  const resolveStartIndex = (): number => {
    if (path.length === 0) return 0
    if (startFrom === 'authored') return 0
    if (startFrom === 'nearest') {
      if (gps.position) {
        return nearestWaypointIndex(path, gps.position.lat, gps.position.lon)
      }
      return 0
    }
    const n = Number(startFrom)
    if (!Number.isFinite(n)) return 0
    return Math.min(Math.max(0, n), path.length - 1)
  }

  const userPos = useMemo(() => {
    if (simulate && path.length) {
      const p = interpolateAlongPath(path, simDist)
      return { lat: p.lat, lon: p.lon, accuracyM: 5 }
    }
    if (gps.position) {
      return {
        lat: gps.position.lat,
        lon: gps.position.lon,
        accuracyM: gps.position.accuracyM,
      }
    }
    return null
  }, [simulate, path, simDist, gps.position])

  useEffect(() => {
    if (!dataset || !direction || !userPos) return
    let best: { id: string; dist: number; radius: number } | null = null
    for (const id of direction.geolocationIds) {
      const g = dataset.geolocations.find((x) => x.id === id)
      if (!g?.spawn) continue
      const dist = haversineM(userPos.lat, userPos.lon, g.spawn.lat, g.spawn.lon)
      if (!best || dist < best.dist) {
        best = { id: g.id, dist, radius: g.radiusM }
      }
    }
    if (!best) return
    setSyncedGeoId((prev) => {
      if (prev === best!.id) return prev
      if (best!.dist <= best!.radius) return best!.id
      if (prev) {
        const cur = dataset.geolocations.find((g) => g.id === prev)
        if (cur?.spawn) {
          const d = haversineM(userPos.lat, userPos.lon, cur.spawn.lat, cur.spawn.lon)
          if (d <= cur.radiusM * 1.25) return prev
        }
      }
      return best!.dist <= best!.radius * 1.5 ? best!.id : prev
    })
  }, [dataset, direction, userPos])

  const nextWp = path[wpIndex] ?? null
  const bearing =
    userPos && nextWp
      ? bearingDeg(userPos.lat, userPos.lon, nextWp.lat, nextWp.lon)
      : 0
  const heading = compass.heading ?? 0
  const angle = arrowAngle(bearing, heading)
  const distToNext =
    userPos && nextWp
      ? haversineM(userPos.lat, userPos.lon, nextWp.lat, nextWp.lon)
      : null

  useEffect(() => {
    if (simulate || step !== 'navigate' || !nextWp || distToNext == null) return
    if (distToNext <= ARRIVE_M) {
      if (wpIndex >= path.length - 1) {
        setStep('arrived')
      } else {
        setWpIndex((i) => i + 1)
      }
    }
  }, [simulate, step, nextWp, distToNext, wpIndex, path.length])

  const raf = useRef<number>(0)
  useEffect(() => {
    if (!simulate || step !== 'navigate' || path.length < 2) return
    const total = pathLengthM(path)
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setSimDist((d) => {
        const next = d + 1.4 * dt
        if (next >= total) {
          setStep('arrived')
          return total
        }
        let target = path.length - 1
        for (let i = 0; i < path.length; i++) {
          if (distanceToIndexM(path, i) > next + 0.5) {
            target = i
            break
          }
        }
        setWpIndex(target)
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [simulate, step, path])

  if (!dataset) return null

  const nearestHint =
    path.length > 0 && gps.position
      ? nearestWaypointIndex(path, gps.position.lat, gps.position.lon) + 1
      : null

  const endLabel =
    endWp && pathGeo
      ? waypointLabel(
          endWp,
          pathGeo.waypoints.findIndex((w) => w.id === endWp.id),
        )
      : 'end'

  return (
    <div className="preview-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">VECV</div>
          <div>
            <h1>Walk</h1>
            <p className="header-sub">User preview · draft data</p>
          </div>
        </div>
        <button className="ghost" onClick={onExit}>
          Exit
        </button>
      </header>

      <div className="app-main" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        {step === 'start' && (
          <div className="stack">
            <div className="preview-hero">
              <p className="pill" style={{ alignSelf: 'flex-start', marginBottom: '0.75rem' }}>
                Preview mode
              </p>
              <h2 className="preview-hero-brand">VECV</h2>
              <p>Follow authored routes on site with compass and GPS — or simulate the walk.</p>
              <button
                className="primary big-btn"
                onClick={async () => {
                  await compass.requestPermissionAndStart()
                  setStep('destination')
                }}
              >
                Start walking
              </button>
            </div>
          </div>
        )}

        {step === 'destination' && (
          <div className="stack">
            <div className="card">
              <h2>Choose a route</h2>
              {dataset.directions.length === 0 ? (
                <p className="empty">
                  No routes yet. Exit → <strong>Routes</strong> → pick start &amp; end
                  waypoints.
                </p>
              ) : (
                <>
                  <div className="field">
                    <label>Route</label>
                    <select
                      value={directionId}
                      onChange={(e) => {
                        setDirectionId(e.target.value)
                        setStartFrom('authored')
                      }}
                    >
                      <option value="">Select…</option>
                      {dataset.directions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {pathGeo && path.length > 0 && (
                    <>
                      <p className="muted">
                        On <strong>{pathGeo.name}</strong> · {path.length} points →{' '}
                        <strong>{endLabel}</strong>
                      </p>
                      <div className="field">
                        <label>I am at</label>
                        <select
                          value={startFrom}
                          onChange={(e) => setStartFrom(e.target.value)}
                        >
                          <option value="authored">Route start</option>
                          <option value="nearest">
                            Nearest GPS
                            {nearestHint != null ? ` (~#${nearestHint})` : ''}
                          </option>
                          {path.map((w, i) =>
                            i === 0 ? null : (
                              <option key={w.id} value={String(i)}>
                                Point #{i + 1}
                                {w.text ? ` — ${w.text}` : ''}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </>
                  )}

                  <button
                    className="primary big-btn"
                    disabled={!directionId || path.length === 0}
                    onClick={() => {
                      const startIdx = resolveStartIndex()
                      setWpIndex(startIdx)
                      setSimDist(distanceToIndexM(path, startIdx))
                      setStep('navigate')
                    }}
                  >
                    Navigate
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'navigate' && pathGeo && (
          <div className="preview-nav">
            <Map2D
              className="map-wrap tall"
              geolocations={[pathGeo]}
              pathWaypoints={path}
              syncSpawns={syncSpawns}
              user={userPos}
              nextWaypoint={nextWp}
            />
            <div className="nav-hud">
              <Arrow3D angleDeg={angle} />
              <div className="nav-distance">
                {distToNext != null
                  ? `${distToNext.toFixed(0)} m`
                  : 'Acquiring GPS…'}
              </div>
              <div className="nav-meta">
                Point {wpIndex + 1}/{path.length}
                {nextWp?.text ? ` · ${nextWp.text}` : ''} → {endLabel}
              </div>
              <div className="nav-meta">
                {compass.source ?? 'no compass'}
                {syncedGeoId
                  ? ` · ${dataset.geolocations.find((g) => g.id === syncedGeoId)?.name}`
                  : ''}
              </div>
              {nextWp?.photos?.[0] && (
                <img src={nextWp.photos[0]} alt="" className="photo-thumb" />
              )}
              <div className="nav-actions">
                <label>
                  <input
                    type="checkbox"
                    checked={simulate}
                    onChange={(e) => {
                      const on = e.target.checked
                      setSimulate(on)
                      if (on) setSimDist(distanceToIndexM(path, wpIndex))
                    }}
                    style={{ width: 'auto', minHeight: 0 }}
                  />
                  Simulate
                </label>
                <button
                  className="ghost"
                  onClick={() => void compass.requestPermissionAndStart()}
                >
                  Re-align
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'arrived' && (
          <div className="stack">
            <div className="preview-hero" style={{ minHeight: '36vh' }}>
              <h2 className="preview-hero-brand" style={{ fontSize: '2.2rem' }}>
                Arrived
              </h2>
              <p>You reached {endLabel}.</p>
              <div className="row" style={{ width: '100%' }}>
                <button
                  className="primary big-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setStep('destination')
                    setSimulate(false)
                    setSimDist(0)
                    setWpIndex(0)
                  }}
                >
                  Another route
                </button>
                <button className="ghost big-btn" style={{ flex: 1 }} onClick={onExit}>
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
