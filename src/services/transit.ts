import type { Place, Spot } from '../types'

// Horaires des transports publics suisses (transport.opendata.ch, gratuit, CORS ouvert).
// Les coordonnées sont acceptées directement comme départ / arrivée : l'API ajoute
// elle-même la marche jusqu'à l'arrêt et depuis l'arrêt final.

export const EARLY_MIN = 30 // arrivée au plus tard 30 min avant la session
export const EARLY_MAX = 90 // et au plus tôt 1 h 30 avant

export interface TransitLeg {
  kind: 'walk' | 'ride'
  line: string // « IC 5 », « S 30 »… (vide pour la marche)
  from: string
  to: string
  dep: string // HH:MM
  arr: string
  coords: [number, number][] // [lat, lon]
}

export interface TransitTrip {
  dep: string // HH:MM
  arr: string
  arrMin: number // minutes depuis minuit
  durationMin: number
  transfers: number
  legs: TransitLeg[]
}

export interface TransitResult {
  /** Correspondances arrivant dans le créneau voulu, la meilleure en premier. */
  options: TransitTrip[]
  /** Si aucune ne tombe dans le créneau : la plus proche arrivant avant. */
  fallback: TransitTrip | null
  windowFrom: string
  windowTo: string
}

interface ApiStop {
  station: { name: string | null; coordinate: { x: number | null; y: number | null } }
  departure?: string | null
  arrival?: string | null
}
interface ApiSection {
  journey: { category: string; number: string | null; passList: ApiStop[] } | null
  walk: { duration: number } | null
  departure: ApiStop
  arrival: ApiStop
}
interface ApiConnection {
  from: ApiStop
  to: ApiStop
  duration: string
  transfers: number
  sections: ApiSection[]
}

const cache = new Map<string, Promise<TransitResult>>()

const hhmm = (min: number) => `${Math.floor(min / 60).toString().padStart(2, '0')}:${(min % 60).toString().padStart(2, '0')}`
const timeOf = (iso?: string | null) => (iso ? iso.slice(11, 16) : '')
const minutesOf = (iso?: string | null) => (iso ? Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) : 0)

function coordOf(s: ApiStop): [number, number] | null {
  const { x, y } = s.station.coordinate
  return x != null && y != null ? [x, y] : null
}

function parseDuration(d: string) {
  // « 00d01:57:00 »
  const m = /(\d+)d(\d+):(\d+)/.exec(d)
  return m ? Number(m[1]) * 1440 + Number(m[2]) * 60 + Number(m[3]) : 0
}

function toTrip(c: ApiConnection): TransitTrip {
  const legs: TransitLeg[] = c.sections.map((s) => {
    const stops = s.journey?.passList?.length ? s.journey.passList : [s.departure, s.arrival]
    return {
      kind: s.journey ? 'ride' : 'walk',
      line: s.journey ? `${s.journey.category} ${s.journey.number ?? ''}`.trim() : '',
      from: s.departure.station.name ?? '',
      to: s.arrival.station.name ?? '',
      dep: timeOf(s.departure.departure),
      arr: timeOf(s.arrival.arrival),
      coords: stops.map(coordOf).filter((p): p is [number, number] => p !== null),
    }
  })
  return {
    dep: timeOf(c.from.departure),
    arr: timeOf(c.to.arrival),
    arrMin: minutesOf(c.to.arrival),
    durationMin: parseDuration(c.duration),
    transfers: c.transfers,
    legs,
  }
}

/** Correspondances depuis l'adresse vers le spot, arrivée 30 min à 1 h 30 avant `startHour`. */
export function findTransit(home: Place, spot: Spot, date: string, startHour: number): Promise<TransitResult> {
  const key = `${home.lat.toFixed(4)},${home.lon.toFixed(4)}|${spot.id}|${date}|${startHour}`
  const hit = cache.get(key)
  if (hit) return hit

  const p = (async (): Promise<TransitResult> => {
    const latest = startHour * 60 - EARLY_MIN
    const earliest = startHour * 60 - EARLY_MAX
    const params = new URLSearchParams({
      from: `${home.lat.toFixed(5)},${home.lon.toFixed(5)}`,
      to: `${spot.lat.toFixed(5)},${spot.lon.toFixed(5)}`,
      date,
      time: hhmm(latest),
      isArrivalTime: '1',
      limit: '6',
    })
    const res = await fetch(`https://transport.opendata.ch/v1/connections?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { connections?: ApiConnection[] }
    const trips = (json.connections ?? []).filter((c) => c.to.arrival?.startsWith(date)).map(toTrip)

    // Dans le créneau : la plus rapide d'abord, puis celle qui arrive le plus tard (moins d'attente).
    const options = trips
      .filter((t) => t.arrMin >= earliest && t.arrMin <= latest)
      .sort((a, b) => a.durationMin - b.durationMin || b.arrMin - a.arrMin)
    const before = trips.filter((t) => t.arrMin < earliest).sort((a, b) => b.arrMin - a.arrMin)
    const after = trips.filter((t) => t.arrMin > latest).sort((a, b) => a.arrMin - b.arrMin)
    return {
      options: options.slice(0, 3),
      fallback: options.length ? null : (before[0] ?? after[0] ?? null),
      windowFrom: hhmm(earliest),
      windowTo: hhmm(latest),
    }
  })()
  cache.set(key, p)
  p.catch(() => cache.delete(key))
  return p
}
