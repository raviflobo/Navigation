const EARTH_R = 6371000

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Initial bearing from point 1 to point 2, degrees 0–360 (clockwise from north). */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lon2 - lon1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Local ENU meters relative to an origin lat/lon. */
export function toEnuMeters(
  originLat: number,
  originLon: number,
  lat: number,
  lon: number,
): { x: number; y: number; z: number } {
  const dLat = toRad(lat - originLat)
  const dLon = toRad(lon - originLon)
  const x = dLon * Math.cos(toRad(originLat)) * EARTH_R
  const z = -dLat * EARTH_R
  return { x, y: 0, z }
}

export function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function arrowAngle(bearing: number, heading: number): number {
  return normalizeHeading(bearing - heading)
}

export function isAccuracyOk(accuracyM: number | null | undefined, maxM = 30): boolean {
  if (accuracyM == null || Number.isNaN(accuracyM)) return false
  return accuracyM <= maxM
}

export interface PositionSample {
  lat: number
  lon: number
  accuracyM: number
  heading?: number | null
  speed?: number | null
  timestamp: number
}

/** Move a fraction along a polyline of lat/lon points. Returns position and next index. */
export function interpolateAlongPath(
  points: { lat: number; lon: number }[],
  distanceAlongM: number,
): { lat: number; lon: number; segmentIndex: number; done: boolean } {
  if (points.length === 0) {
    return { lat: 0, lon: 0, segmentIndex: 0, done: true }
  }
  if (points.length === 1) {
    return { lat: points[0].lat, lon: points[0].lon, segmentIndex: 0, done: true }
  }

  let remaining = distanceAlongM
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const seg = haversineM(a.lat, a.lon, b.lat, b.lon)
    if (remaining <= seg || i === points.length - 2) {
      const t = seg > 0 ? Math.min(1, remaining / seg) : 1
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        segmentIndex: i,
        done: i === points.length - 2 && t >= 1,
      }
    }
    remaining -= seg
  }
  const last = points[points.length - 1]
  return { lat: last.lat, lon: last.lon, segmentIndex: points.length - 2, done: true }
}

export function pathLengthM(points: { lat: number; lon: number }[]): number {
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineM(points[i].lat, points[i].lon, points[i + 1].lat, points[i + 1].lon)
  }
  return total
}
