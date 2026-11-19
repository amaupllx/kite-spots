import type { Confidence, DayForecast, HourForecast, Spot, SpotForecast, WindModel, WindValue } from '../types'

const CACHE_MS = 30 * 60 * 1000
let cache: { key: string; at: number; data: SpotForecast[] } | null = null

const BASE = 'https://api.open-meteo.com/v1/forecast'

/**
 * Cascade du vent, du plus fin au plus large : pour chaque heure on prend le premier modèle
 * qui a une valeur (chacun s'arrête à sa propre échéance, au-delà Open-Meteo renvoie null).
 *  - ICON-CH1 (MétéoSuisse, ~1 km) ≈ 0–33 h
 *  - ICON-CH2 (MétéoSuisse, ~2 km) ≈ 33–120 h
 *  - ECMWF IFS (~9 km)             ≈ 120 h et au-delà
 * Second avis pour l'indicateur de confiance : AROME France HD (1,3 km, ≈ 0–48 h), puis ECMWF
 * tant que le modèle principal est ICON-CH. Chaque modèle est demandé séparément : si l'un
 * est indisponible (ou hors domaine), on retombe sur le suivant, et en dernier recours sur le
 * choix automatique d'Open-Meteo (« best_match »).
 */
const API_MODEL: Record<Exclude<WindModel, 'auto'>, string> = {
  icon_ch1: 'meteoswiss_icon_ch1',
  icon_ch2: 'meteoswiss_icon_ch2',
  arome: 'meteofrance_arome_france_hd',
  ecmwf: 'ecmwf_ifs',
}
const CASCADE: WindModel[] = ['icon_ch1', 'icon_ch2', 'ecmwf']

export const MODEL_INFO: Record<WindModel, { name: string; res: string }> = {
  icon_ch1: { name: 'ICON-CH1', res: '1 km' },
  icon_ch2: { name: 'ICON-CH2', res: '2 km' },
  arome: { name: 'AROME HD', res: '1,3 km' },
  ecmwf: { name: 'ECMWF IFS', res: '9 km' },
  auto: { name: 'Open-Meteo auto', res: '' },
}

interface OMResponse {
  hourly: {
    time: string[]
    wind_speed_10m: number[]
    wind_gusts_10m: number[]
    wind_direction_10m: number[]
    temperature_2m: number[]
    precipitation_probability: (number | null)[]
    precipitation: number[]
    weather_code: number[]
  }
  daily: { time: string[]; sunrise: string[]; sunset: string[] }
}

interface OMWind {
  hourly: {
    time: string[]
    wind_speed_10m: (number | null)[]
    wind_gusts_10m?: (number | null)[]
    wind_direction_10m?: (number | null)[]
  }
}

/** Vent d'un modèle pour un spot, indexé par heure locale « YYYY-MM-DDTHH:MM ». */
type WindSeries = Map<string, { wind: number; gust: number | null; dir: number | null }>

function commonParams(spots: Spot[]) {
  return {
    latitude: spots.map((s) => s.lat.toFixed(4)).join(','),
    longitude: spots.map((s) => s.lon.toFixed(4)).join(','),
    wind_speed_unit: 'kn',
    timezone: 'Europe/Zurich',
    forecast_days: '7',
  }
}

async function fetchJson<T>(params: Record<string, string>): Promise<T[]> {
  const res = await fetch(`${BASE}?${new URLSearchParams(params)}`)
  if (!res.ok) throw new Error(`Open-Meteo : HTTP ${res.status}`)
  const json = (await res.json()) as T | T[]
  return Array.isArray(json) ? json : [json]
}

/** Série de vent d'un modèle pour chaque spot ; null si le modèle n'a pas pu être chargé. */
async function fetchModel(spots: Spot[], model: string): Promise<WindSeries[] | null> {
  try {
    const list = await fetchJson<OMWind>({
      ...commonParams(spots),
      hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
      models: model,
    })
    if (list.length !== spots.length) return null
    return list.map((r) => {
      const m: WindSeries = new Map()
      r.hourly.time.forEach((t, i) => {
        const wind = r.hourly.wind_speed_10m[i]
        if (wind === null || wind === undefined) return
        m.set(t, { wind, gust: r.hourly.wind_gusts_10m?.[i] ?? null, dir: r.hourly.wind_direction_10m?.[i] ?? null })
      })
      return m
    })
  } catch {
    return null
  }
}

/** Prévisions horaires 7 jours : cascade de modèles fins → larges + second avis (voir plus haut). */
export async function fetchForecasts(spots: Spot[]): Promise<SpotForecast[]> {
  const key = spots.map((s) => s.id).join(',')
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.data

  const ids = Object.keys(API_MODEL) as Exclude<WindModel, 'auto'>[]
  const [base, ...series] = await Promise.all([
    // Appel de base (choix automatique) : température, pluie, temps, soleil, et vent de secours.
    fetchJson<OMResponse>({
      ...commonParams(spots),
      hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation_probability,precipitation,weather_code',
      daily: 'sunrise,sunset',
    }),
    ...ids.map((id) => fetchModel(spots, API_MODEL[id])),
  ])
  const byModel = Object.fromEntries(ids.map((id, i) => [id, series[i]])) as Record<Exclude<WindModel, 'auto'>, WindSeries[] | null>

  const data = base.map((r, i) => ({
    spotId: spots[i].id,
    days: toDays(r, (id) => byModel[id]?.[i]),
  }))
  cache = { key, at: Date.now(), data }
  return data
}

function toDays(r: OMResponse, model: (id: Exclude<WindModel, 'auto'>) => WindSeries | undefined): DayForecast[] {
  const h = r.hourly
  return r.daily.time.map((date, d) => {
    const sunrise = r.daily.sunrise[d]
    const sunset = r.daily.sunset[d]
    const hours: HourForecast[] = []
    h.time.forEach((t, i) => {
      if (!t.startsWith(date)) return
      // Heures de jour : le créneau [t, t+1h) doit chevaucher au moins à moitié la période éclairée.
      const mid = addMinutes(t, 30)
      if (mid < sunrise || mid > sunset) return
      const auto: WindValue = { model: 'auto', wind: h.wind_speed_10m[i], gust: h.wind_gusts_10m[i], dir: h.wind_direction_10m[i] }
      const pick = (id: Exclude<WindModel, 'auto'>): WindValue | null => {
        const v = model(id)?.get(t)
        // Rafales ou direction absentes d'un modèle : on complète avec le choix automatique.
        return v ? { model: id, wind: v.wind, gust: Math.max(v.gust ?? auto.gust, v.wind), dir: v.dir ?? auto.dir } : null
      }
      const main = (CASCADE as Exclude<WindModel, 'auto'>[]).map(pick).find((v) => v !== null) ?? auto
      const alt =
        main.model === 'icon_ch1' || main.model === 'icon_ch2' ? (pick('arome') ?? pick('ecmwf')) : main.model === 'auto' ? pick('arome') : null
      hours.push({
        time: t,
        hour: Number(t.slice(11, 13)),
        wind: main.wind,
        gust: main.gust,
        dir: main.dir,
        temp: h.temperature_2m[i],
        rainProb: h.precipitation_probability[i] ?? 0,
        rain: h.precipitation[i],
        code: h.weather_code[i],
        model: main.model,
        alt,
        confidence: alt ? confidence(main, alt) : null,
      })
    })
    return { date, sunrise, sunset, hours }
  })
}

/**
 * Accord entre deux modèles sur une heure.
 * Vent : écart toléré = max(3 nds, 20 % du vent moyen) pour « haute », ×2 pour « moyenne ».
 * Direction : comptée seulement si l'un des deux dépasse 8 nds (en dessous elle est peu fiable
 * et peu utile) ; ≤ 30° haute, ≤ 60° moyenne.
 */
export function confidence(a: WindValue, b: WindValue): Confidence {
  const tol = Math.max(3, 0.2 * ((a.wind + b.wind) / 2))
  const dw = Math.abs(a.wind - b.wind)
  const dd = Math.max(a.wind, b.wind) >= 8 ? angleDiff(a.dir, b.dir) : 0
  if (dw <= tol && dd <= 30) return 'high'
  if (dw <= 2 * tol && dd <= 60) return 'medium'
  return 'low'
}

function angleDiff(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function addMinutes(isoLocal: string, min: number): string {
  const [hh, mm] = isoLocal.slice(11, 16).split(':').map(Number)
  const tot = hh * 60 + mm + min
  const h2 = Math.floor(tot / 60).toString().padStart(2, '0')
  const m2 = (tot % 60).toString().padStart(2, '0')
  return `${isoLocal.slice(0, 11)}${h2}:${m2}`
}
