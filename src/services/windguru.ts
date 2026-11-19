import type { Spot } from '../types'

// Étoiles façon Windguru : seuils du spot (limit1 / limit2 / limit3, en nœuds) lus via l'API
// interne du site (non documentée, usage personnel en local), appliqués au vent moyen de notre
// cascade de modèles (ICON-CH1 → ICON-CH2 → ECMWF, voir weather.ts) au lieu de GFS.

const CACHE_KEY = 'kite.windguru.v2'
const CACHE_MS = 24 * 3600 * 1000 // les seuils d'un spot ne changent quasiment jamais
const OVERRIDES_KEY = 'kite.windguruIds'

export type WgLimits = [number, number, number]

/** Identifiants Windguru personnalisés éventuellement enregistrés par une version précédente. */
export function readWindguruOverrides(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function windguruIdOf(spot: Spot): number | null {
  return readWindguruOverrides()[spot.id] ?? spot.windguru ?? null
}

export function starsFor(wind: number, [l1, l2, l3]: WgLimits): number {
  return wind >= l3 ? 3 : wind >= l2 ? 2 : wind >= l1 ? 1 : 0
}

interface Tab {
  id_model: number
  options: { limit1: number; limit2: number; limit3: number }
}

function readCache(): Record<string, { at: number; data: WgLimits }> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// Requêtes en file d'attente, une à la fois, pour rester discret vis-à-vis de Windguru.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = queue.then(fn, fn)
  queue = p.catch(() => undefined).then(() => new Promise((r) => setTimeout(r, 300)))
  return p
}

async function api<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/windguru/int/iapi.php?${new URLSearchParams(params)}`)
  if (!res.ok) throw new Error(`Windguru HTTP ${res.status}`)
  const json = (await res.json()) as T & { return?: string; message?: string }
  if (json.return === 'error') throw new Error(json.message ?? 'Windguru : erreur')
  return json
}

async function load(id: number): Promise<WgLimits> {
  const spot = await api<{ tabs: Tab[] }>({ q: 'forecast_spot', id_spot: String(id) })
  // Seuils de l'onglet GFS (celui utilisé jusqu'ici), sinon du premier onglet qui en a.
  const o = (spot.tabs.find((t) => t.id_model === 3) ?? spot.tabs.find((t) => t.options?.limit1 != null))?.options
  if (!o) throw new Error('Windguru : seuils indisponibles pour ce spot')
  return [o.limit1, o.limit2, o.limit3]
}

const inflight = new Map<number, Promise<WgLimits>>()

/** Seuils d'étoiles du spot Windguru, mis en cache 24 h. */
export function getWindguruLimits(id: number): Promise<WgLimits> {
  const hit = readCache()[id]
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.data)
  const running = inflight.get(id)
  if (running) return running

  const p = enqueue(() => load(id)).then((data) => {
    const all = readCache()
    // On ne garde que les entrées récentes pour ne pas faire grossir le stockage.
    for (const k of Object.keys(all)) if (Date.now() - all[k].at > CACHE_MS) delete all[k]
    all[id] = { at: Date.now(), data }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(all))
    } catch {
      /* quota : on garde juste en mémoire */
    }
    return data
  })
  inflight.set(id, p)
  p.finally(() => inflight.delete(id)).catch(() => undefined)
  return p
}
