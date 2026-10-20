import type { Spot } from '../types'

// Étoiles Windguru via l'API interne du site (non documentée, usage personnel en local).
// La réponse ne contient pas les étoiles : le site les calcule à partir du vent moyen et
// des seuils renvoyés par « forecast_spot » (limit1 / limit2 / limit3, en nœuds).
// On utilise le modèle GFS 13 km (id 3), disponible gratuitement et sur 7 jours et plus.

const MODEL = 3
const CACHE_KEY = 'kite.windguru.v1'
const CACHE_MS = 3 * 3600 * 1000
const OVERRIDES_KEY = 'kite.windguruIds'

export interface WgHour {
  wind: number // nœuds
  gust: number
  stars: number // 0..3
}

export interface WgForecast {
  modelName: string
  limits: [number, number, number]
  /** Clé « YYYY-MM-DDTHH » en heure suisse. */
  hours: Record<string, WgHour>
}

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

export function starsFor(wind: number, [l1, l2, l3]: [number, number, number]) {
  return wind >= l3 ? 3 : wind >= l2 ? 2 : wind >= l1 ? 1 : 0
}

interface Tab {
  id_model: number
  id_model_arr: { id_model: number; initstr: string; rundef: string; cachefix: string }[]
  options: { limit1: number; limit2: number; limit3: number }
}

interface Fcst {
  fcst: { initstamp: number; hours: number[]; WINDSPD: number[]; GUST: number[]; model_name: string }
}

const localKey = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

function readCache(): Record<string, { at: number; data: WgForecast }> {
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

async function load(id: number): Promise<WgForecast> {
  const spot = await api<{ tabs: Tab[] }>({ q: 'forecast_spot', id_spot: String(id) })
  const tab = spot.tabs.find((t) => t.id_model === MODEL)
  const run = tab?.id_model_arr[0]
  if (!tab || !run) throw new Error('Windguru : modèle GFS indisponible pour ce spot')
  const limits: [number, number, number] = [tab.options.limit1, tab.options.limit2, tab.options.limit3]

  const data = await api<Fcst>({
    q: 'forecast',
    id_model: String(MODEL),
    rundef: run.rundef,
    initstr: run.initstr,
    id_spot: String(id),
    WGCACHEABLE: '21600',
    cachefix: run.cachefix,
  })
  const f = data.fcst
  const hours: Record<string, WgHour> = {}
  f.hours.forEach((h, i) => {
    const wind = f.WINDSPD[i]
    if (wind == null) return
    const key = localKey.format(new Date((f.initstamp + h * 3600) * 1000)).replace(' ', 'T')
    hours[key] = { wind, gust: f.GUST[i], stars: starsFor(wind, limits) }
  })
  return { modelName: f.model_name, limits, hours }
}

const inflight = new Map<number, Promise<WgForecast>>()

export function getWindguru(id: number): Promise<WgForecast> {
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

/**
 * Étoiles d'une heure locale « YYYY-MM-DDTHH ». Au-delà de 78 h, GFS est au pas de 3 h :
 * on prend alors l'échéance voisine (± 1 h).
 */
export function wgAt(fc: WgForecast, date: string, hour: number): WgHour | null {
  for (const d of [0, -1, 1]) {
    const h = hour + d
    if (h < 0 || h > 23) continue
    const v = fc.hours[`${date}T${h.toString().padStart(2, '0')}`]
    if (v) return v
  }
  return null
}
