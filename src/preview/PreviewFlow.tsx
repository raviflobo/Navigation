import { useMemo, useState } from 'react'
import { useDataset } from '../shared/DatasetContext'
import { useCompass } from '../shared/useCompass'
import { useGeolocation } from '../shared/useGeolocation'
import {
  arrowAngle,
  bearingDeg,
  haversineM,
  interpolateAlongPath,
  pathLengthM,
} from '../shared/geo'
import { Map2D } from '../shared/Map2D'
import { Arrow3D } from './Arrow3D'
import type { Direction, GeolocationCluster, Waypoint } from '../shared/types'
import { useEffect, useRef } from 'react'

type Step = 'start' | 'destination' | 'navigate' | 'arrived'

interface Props {
  onExit: () => void
}

const ARRIVE_M = 12

export function PreviewFlow({ onExit }: Props) {
  const { dataset } = useDataset()
  const [step, setStep] = useState<Step>('start')
  const [directionId, setDirectionId] = useState('')
  const [wpIndex, setWpIndex] = useState(0)
  const [simulate, setSimulate] = useState(false)
  const [simDist, setSimDist] = useState(0)
  const [syncedGeoId, setSyncedGeoId] = useState<string | null>(null)
  const compass = useCompass(step === 'navigate' || step === 'start')
  const gps = useGeolocation(step === 'navigate' && !simulate)

  const direction: Direction | undefined = dataset?.directions.find(
    (d) => d.id === directionId,
  )

  const destination: GeolocationCluster | undefined = useMemo(() => {
    if (!dataset || !direction || direction.geolocationIds.length === 0) return undefined
    const lastId = direction.geolocationIds[direction.geolocationIds.length - 1]
    return dataset.geolocations.find((g) => g.id === lastId)
  }, [dataset, direction])

  const path: Waypoint[] = destination?.waypoints ?? []

  const syncSpawns = useMemo(() => {
    if (!dataset || !direction) return []
    return direction.geolocationIds
      .slice(0, -1)
      .map((id) => dataset.geolocations.find((g) => g.id === id))
      .filter((g): g is GeolocationCluster => !!g && !!g.spawn)
      .map((g) => ({
        id: g.id,
        name: g.name,
        lat: g.spawn!.lat,
        lon: g.spawn!.lon,
        radiusM: g.radiusM,
      }))
  }, [dataset, direction])

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

  // Sync to nearest spawn on direction
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
  const bearing = userPos && nextWp
    ? bearingDeg(userPos.lat, userPos.lon, nextWp.lat, nextWp.lon)
    : 0
  const heading = compass.heading ?? 0
  const angle = arrowAngle(bearing, heading)
  const distToNext =
    userPos && nextWp
      ? haversineM(userPos.lat, userPos.lon, nextWp.lat, nextWp.lon)
      : null

  // Advance waypoint
  useEffect(() => {
    if (step !== 'navigate' || !nextWp || distToNext == null) return
    if (distToNext <= ARRIVE_M) {
      if (wpIndex >= path.length - 1) {
        setStep('arrived')
      } else {
        setWpIndex((i) => i + 1)
      }
    }
  }, [step, nextWp, distToNext, wpIndex, path.length])

  // Simulate walk
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
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [simulate, step, path])

  if (!dataset) return null

  return (
    <div className="preview-shell">
      <div className="app-header">
        <div>
          <h1>User Preview</h1>
        </div>
        <button className="ghost" onClick={onExit}>
          Exit preview
        </button>
      </div>
      <div className="banner">Preview — not the live user app. Draft data from this device.</div>

      <div className="app-main" style={{ paddingBottom: '1rem' }}>
        {step === 'start' && (
          <div className="stack">
            <div className="card">
              <h2>Start navigation preview</h2>
              <p className="muted">
                On iPhone, the Start button requests compass/motion permission. Location
                is used when you navigate (unless Simulate is on).
              </p>
              <button
                className="primary big-btn"
                onClick={async () => {
                  await compass.requestPermissionAndStart()
                  setStep('destination')
                }}
              >
                Start
              </button>
            </div>
          </div>
        )}

        {step === 'destination' && (
          <div className="stack">
            <div className="card">
              <h2>Choose destination</h2>
              {dataset.directions.length === 0 ? (
                <p className="empty">
                  No directions yet. Exit and create one under Directions (destination
                  last).
                </p>
              ) : (
                <>
                  <div className="field">
                    <label>Direction</label>
                    <select
                      value={directionId}
                      onChange={(e) => setDirectionId(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {dataset.directions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {destination && (
                    <p className="muted">
                      Path uses <strong>{destination.name}</strong> waypoints only (
                      {destination.waypoints.length}). Other geolocations are sync
                      anchors.
                    </p>
                  )}
                  <button
                    className="primary big-btn"
                    disabled={
                      !directionId || !destination || destination.waypoints.length === 0
                    }
                    onClick={() => {
                      setWpIndex(0)
                      setSimDist(0)
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

        {step === 'navigate' && destination && (
          <div className="preview-nav stack">
            <Map2D
              className="map-wrap tall"
              geolocations={[destination]}
              pathWaypoints={path}
              syncSpawns={syncSpawns}
              user={userPos}
              nextWaypoint={nextWp}
            />
            <div className="arrow-panel card">
              <Arrow3D angleDeg={angle} />
              <div>
                {distToNext != null
                  ? `${distToNext.toFixed(0)} m to next waypoint`
                  : 'Waiting for position…'}
              </div>
              <div className="muted">
                Heading source: {compass.source ?? '—'} · synced:{' '}
                {syncedGeoId
                  ? dataset.geolocations.find((g) => g.id === syncedGeoId)?.name
                  : '—'}
              </div>
              {nextWp?.text && <p>{nextWp.text}</p>}
              {nextWp?.photos?.[0] && (
                <img src={nextWp.photos[0]} alt="" className="photo-thumb" />
              )}
              <div className="row">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={simulate}
                    onChange={(e) => {
                      setSimulate(e.target.checked)
                      setSimDist(0)
                      setWpIndex(0)
                    }}
                    style={{ width: 'auto', minHeight: 0 }}
                  />
                  Simulate walk
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
          <div className="card">
            <h2>Arrived</h2>
            <p className="muted">You reached the end of the destination waypoint path.</p>
            <div className="row">
              <button
                className="primary"
                onClick={() => {
                  setStep('destination')
                  setSimulate(false)
                  setSimDist(0)
                  setWpIndex(0)
                }}
              >
                Another route
              </button>
              <button className="ghost" onClick={onExit}>
                Exit preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
