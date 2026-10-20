import type { DayForecast, HourForecast, Spot, SpotForecast } from '../types'

const CACHE_MS = 30 * 60 * 1000
let cache: { key: string; at: number; data: SpotForecast[] } | null = null

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

/** Prévisions horaires 7 jours (Open-Meteo, meilleur modèle dispo — ICON-CH de MétéoSuisse en Suisse). */
export async function fetchForecasts(spots: Spot[]): Promise<SpotForecast[]> {
  const key = spots.map((s) => s.id).join(',')
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.data

  const params = new URLSearchParams({
    latitude: spots.map((s) => s.lat.toFixed(4)).join(','),
    longitude: spots.map((s) => s.lon.toFixed(4)).join(','),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation_probability,precipitation,weather_code',
    daily: 'sunrise,sunset',
    wind_speed_unit: 'kn',
    timezone: 'Europe/Zurich',
    forecast_days: '7',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo : HTTP ${res.status}`)
  const json = (await res.json()) as OMResponse | OMResponse[]
  const list = Array.isArray(json) ? json : [json]

  const data = list.map((r, i) => ({ spotId: spots[i].id, days: toDays(r) }))
  cache = { key, at: Date.now(), data }
  return data
}

function toDays(r: OMResponse): DayForecast[] {
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
      hours.push({
        time: t,
        hour: Number(t.slice(11, 13)),
        wind: h.wind_speed_10m[i],
        gust: h.wind_gusts_10m[i],
        dir: h.wind_direction_10m[i],
        temp: h.temperature_2m[i],
        rainProb: h.precipitation_probability[i] ?? 0,
        rain: h.precipitation[i],
        code: h.weather_code[i],
      })
    })
    return { date, sunrise, sunset, hours }
  })
}

function addMinutes(isoLocal: string, min: number): string {
  const [hh, mm] = isoLocal.slice(11, 16).split(':').map(Number)
  const tot = hh * 60 + mm + min
  const h2 = Math.floor(tot / 60).toString().padStart(2, '0')
  const m2 = (tot % 60).toString().padStart(2, '0')
  return `${isoLocal.slice(0, 11)}${h2}:${m2}`
}
