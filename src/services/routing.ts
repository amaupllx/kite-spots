import type { Place, Spot, Travel } from '../types'
import { OSRM_URL } from '../config'

const STORAGE_KEY = 'kite.travelCache.v1'

type TravelCache = Record<string, Record<string, Travel>>

function originKey(p: Place) {
  return `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`
}

function readCache(): TravelCache {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as TravelCache
  } catch {
    return {}
  }
}

/** Temps de trajet en voiture depuis l'adresse vers chaque spot (OSRM, une seule requête « table »). */
export async function fetchTravelTimes(origin: Place, spots: Spot[]): Promise<Record<string, Travel>> {
  const all = readCache()
  const ok = originKey(origin)
  const known = all[ok] ?? {}
  const missing = spots.filter((s) => !known[s.id])
  if (missing.length === 0) return known

  const coords = [origin, ...missing].map((p) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const res = await fetch(`${OSRM_URL}/table/v1/driving/${coords}?sources=0&annotations=duration,distance`)
  if (!res.ok) throw new Error(`OSRM : HTTP ${res.status}`)
  const json = (await res.json()) as { code: string; durations: (number | null)[][]; distances: (number | null)[][] }
  if (json.code !== 'Ok') throw new Error(`OSRM : ${json.code}`)

  missing.forEach((s, i) => {
    const dur = json.durations[0][i + 1]
    const dist = json.distances[0][i + 1]
    if (dur != null && dist != null) known[s.id] = { durationMin: dur / 60, distanceKm: dist / 1000 }
  })
  all[ok] = known
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota : on garde juste en mémoire */
  }
  return known
}

export interface Route {
  coords: [number, number][] // [lat, lon]
  durationMin: number
  distanceKm: number
}

const routeCache = new Map<string, Promise<Route>>()

/** Tracé routier complet adresse → spot (OSRM « route », géométrie GeoJSON). */
export function fetchRoute(origin: Place, spot: Spot): Promise<Route> {
  const key = `${originKey(origin)}|${spot.id}`
  const hit = routeCache.get(key)
  if (hit) return hit
  const p = (async () => {
    const coords = `${origin.lon.toFixed(5)},${origin.lat.toFixed(5)};${spot.lon.toFixed(5)},${spot.lat.toFixed(5)}`
    const res = await fetch(`${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`)
    if (!res.ok) throw new Error(`OSRM : HTTP ${res.status}`)
    const json = (await res.json()) as {
      code: string
      routes: { duration: number; distance: number; geometry: { coordinates: [number, number][] } }[]
    }
    if (json.code !== 'Ok' || !json.routes[0]) throw new Error(`OSRM : ${json.code}`)
    const r = json.routes[0]
    return {
      coords: r.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
      durationMin: r.duration / 60,
      distanceKm: r.distance / 1000,
    }
  })()
  routeCache.set(key, p)
  p.catch(() => routeCache.delete(key))
  return p
}
