import type { Spot } from '../types'
import { HAS_PROXY } from '../config'

export interface WaterTemp {
  value: number
  source: 'alplakes' | 'estimation'
  note?: 'today' | 'estimate'
}

// Températures de surface moyennes approximatives par mois (jan → déc), utilisées en secours.
const CLIMATE: Record<Spot['waterClimate'], number[]> = {
  plaine: [5, 5, 6, 10, 15, 20, 23, 23, 19, 14, 9, 6],
  'grand-lac': [6, 6, 6, 9, 13, 18, 21, 22, 19, 15, 11, 8],
  altitude: [1, 1, 2, 3, 6, 10, 13, 14, 11, 7, 4, 2],
}

const cache = new Map<string, Promise<WaterTemp>>()

function fmt(d: Date) {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}00`
}

async function alplakes(spot: Spot, day: Date): Promise<number> {
  const ref = spot.alplakes!
  const start = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 6))
  const end = new Date(start.getTime() + 15 * 3600 * 1000)
  const url = `/api/alplakes/simulations/point/${ref.model}/${ref.lake}/${fmt(start)}/${fmt(end)}/0.5/${spot.lat}/${spot.lon}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Alplakes HTTP ${res.status}`)
  const json = (await res.json()) as { variables?: { temperature?: { data: (number | null)[] } } }
  const vals = (json.variables?.temperature?.data ?? []).filter((v): v is number => typeof v === 'number')
  if (vals.length === 0) throw new Error('Alplakes : pas de données')
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/**
 * Température de l'eau en surface : simulation Alplakes (Eawag) pour le jour demandé,
 * sinon la dernière valeur disponible (aujourd'hui), sinon une estimation climatologique.
 */
export function getWaterTemp(spot: Spot, date: string): Promise<WaterTemp> {
  // Une requête par lac et par jour : la température de surface varie peu le long d'un même lac.
  const key = spot.alplakes ? `${spot.alplakes.lake}|${date}` : `${spot.id}|${date}`
  const hit = cache.get(key)
  if (hit) return hit

  const p = (async (): Promise<WaterTemp> => {
    const day = new Date(`${date}T12:00:00`)
    // Alplakes n'accepte pas les appels directs : sans relais (version en ligne), estimation seule.
    if (spot.alplakes && HAS_PROXY) {
      try {
        return { value: await alplakes(spot, day), source: 'alplakes' }
      } catch {
        try {
          const v = await alplakes(spot, new Date())
          return { value: v, source: 'alplakes', note: 'today' }
        } catch {
          /* on passe à l'estimation */
        }
      }
    }
    return { value: CLIMATE[spot.waterClimate][day.getMonth()], source: 'estimation', note: 'estimate' }
  })()
  cache.set(key, p)
  return p
}
