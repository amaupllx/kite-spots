import type { Board, Criteria, Criterion, DayForecast, DayRating, HourForecast, HourRating, KitePick, Level, Profile, Spot, Warning } from '../types'
import { angleToRange } from './geo'

// Coefficient de la règle empirique : taille (m²) ≈ poids (kg) × k / vent (nœuds).
const BOARD_K: Record<Board, number> = { twintip: 2.4, surf: 2.6, foil: 1.5 }
const MIN_WIND: Record<Board, number> = { twintip: 11, surf: 12, foil: 7 }
const MAX_WIND: Record<Level, number> = { debutant: 22, intermediaire: 30, avance: 40 }
const LEVEL_RANK: Record<Level, number> = { debutant: 0, intermediaire: 1, avance: 2 }

const STORM_CODES = new Set([95, 96, 99])
const MIN_HOUR_SCORE = 2

/** Vent « effectif » pour le choix de l'aile : la moyenne, tirée un peu vers les rafales. */
function effectiveWind(h: Pick<HourForecast, 'wind' | 'gust'>) {
  return h.wind + 0.25 * Math.max(0, h.gust - h.wind)
}

export function pickKite(profile: Profile, h: Pick<HourForecast, 'wind' | 'gust'>): KitePick {
  const we = Math.max(effectiveWind(h), 1)
  const ideal = (profile.weight * BOARD_K[profile.board]) / we
  if (profile.kites.length === 0) return { ideal, owned: null, fit: 'aucune' }

  const best = profile.kites.reduce((a, b) => (Math.abs(Math.log(b / ideal)) < Math.abs(Math.log(a / ideal)) ? b : a))
  const ratio = best / ideal
  const fit =
    ratio >= 0.82 && ratio <= 1.2 ? 'ideal'
    : ratio > 1.2 && ratio <= 1.45 ? 'surtoile'
    : ratio < 0.82 && ratio >= 0.65 ? 'soustoile'
    : 'aucune'
  return { ideal, owned: fit === 'aucune' ? null : best, fit }
}

export const CRITERIA: Criterion[] = ['kite', 'wind', 'gust', 'dir', 'rain', 'temp', 'level']
export const ALL_CRITERIA: Criteria = { kite: true, wind: true, gust: true, dir: true, rain: true, temp: true, level: true }

/**
 * Note d'une heure. Les critères désactivés n'influencent ni la note ni la navigabilité ;
 * le vent minimum et l'orage s'appliquent toujours.
 */
export function rateHour(spot: Spot, profile: Profile, h: HourForecast, criteria: Criteria = ALL_CRITERIA): HourRating {
  const warnings: Warning[] = []
  const impacts: HourRating['impacts'] = {}
  const kite = pickKite(profile, h)

  const dist = Math.min(...spot.directions.map((r) => angleToRange(h.dir, r)))
  const dirOk: HourRating['dirOk'] = dist === 0 ? 'bon' : dist <= 25 ? 'limite' : 'mauvais'

  let rideable = true
  if (h.wind < MIN_WIND[profile.board]) {
    rideable = false
    impacts.wind = 'block'
  }
  if (criteria.kite && kite.fit === 'aucune') {
    rideable = false
    impacts.kite = 'block'
  }
  if (criteria.dir && dirOk === 'mauvais') {
    rideable = false
    impacts.dir = 'block'
    warnings.push('dir')
  }
  if (criteria.wind && (h.gust > MAX_WIND[profile.level] + 5 || h.wind > MAX_WIND[profile.level])) {
    rideable = false
    impacts.wind = 'block'
    warnings.push('tooStrong')
  }
  if (STORM_CODES.has(h.code)) {
    rideable = false
    warnings.push('storm')
  }

  let score = 0
  if (rideable) {
    // Base 4 (aile idéale) ; les impacts sont exprimés par rapport à cette base.
    score = 4
    const add = (c: Criterion, x: number) => {
      score += x
      impacts[c] = x
    }
    if (criteria.kite) add('kite', kite.fit === 'ideal' ? 0 : -1.5)
    if (criteria.gust) {
      const gf = h.gust / Math.max(h.wind, 1)
      if (gf <= 1.25) add('gust', 1)
      else if (gf <= 1.4) add('gust', 0.5)
      else if (gf > 1.8) {
        add('gust', -2)
        warnings.push('veryGusty')
      } else if (gf > 1.6) {
        add('gust', -1)
        warnings.push('gusty')
      } else add('gust', 0)
    }
    if (criteria.dir) add('dir', dirOk === 'limite' ? score * -0.35 : 0)
    if (criteria.rain) add('rain', h.rainProb >= 70 ? -1 : h.rainProb >= 40 ? -0.5 : 0)
    if (criteria.temp) add('temp', h.temp < 5 ? -0.5 : 0)
    if (criteria.level) {
      const hard = LEVEL_RANK[spot.level] > LEVEL_RANK[profile.level]
      add('level', hard ? -1 : 0)
      if (hard) warnings.push('hardSpot')
    }
  }
  return { hour: h, score: clamp(score, 0, 5), dirOk, kite, rideable, warnings, impacts }
}

const isGood = (r: HourRating) => r.rideable && r.score >= MIN_HOUR_SCORE

/** Note journalière : meilleure suite d'heures navigables (somme des notes maximale). */
export function rateDay(spot: Spot, profile: Profile, day: DayForecast, criteria: Criteria = ALL_CRITERIA): DayRating {
  const hours = day.hours.map((h) => rateHour(spot, profile, h, criteria))

  let best: { start: number; end: number; sum: number } | null = null
  let i = 0
  while (i < hours.length) {
    if (!isGood(hours[i])) {
      i++
      continue
    }
    let j = i
    let sum = 0
    while (j < hours.length && isGood(hours[j])) sum += hours[j++].score
    if (!best || sum > best.sum) best = { start: i, end: j, sum }
    i = j
  }

  if (!best) {
    const maxWind = Math.max(0, ...day.hours.map((h) => h.wind))
    return {
      date: day.date,
      score: 0,
      hours,
      window: null,
      kite: null,
      status: day.hours.length === 0 ? 'nodata' : maxWind < MIN_WIND[profile.board] ? 'nowind' : 'notrideable',
      maxWind,
      stats: null,
    }
  }
  const len = best.end - best.start
  const lenFactor = len >= 3 ? 1 : len === 2 ? 0.85 : 0.65
  return withWindow(day.date, hours, best.start, best.end, (best.sum / len) * lenFactor)
}

/**
 * Meilleure session de `len` heures consécutives d'une journée (toutes navigables).
 * Renvoie null si la journée n'en contient aucune.
 */
export function bestSession(spot: Spot, profile: Profile, day: DayForecast, criteria: Criteria = ALL_CRITERIA, len = 3): DayRating | null {
  const hours = day.hours.map((h) => rateHour(spot, profile, h, criteria))
  let best: { start: number; sum: number } | null = null
  for (let i = 0; i + len <= hours.length; i++) {
    const slice = hours.slice(i, i + len)
    if (!slice.every(isGood)) continue
    const sum = slice.reduce((a, r) => a + r.score, 0)
    if (!best || sum > best.sum) best = { start: i, sum }
  }
  if (!best) return null
  return withWindow(day.date, hours, best.start, best.start + len, best.sum / len)
}

function withWindow(date: string, hours: HourRating[], start: number, end: number, score: number): DayRating {
  const win = hours.slice(start, end)
  const counts = new Map<number, number>()
  win.forEach((r) => r.kite.owned && counts.set(r.kite.owned, (counts.get(r.kite.owned) ?? 0) + 1))
  const ownedMain = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const mid = win[Math.floor(win.length / 2)]
  return {
    date,
    score: Math.round(score * 10) / 10,
    hours,
    window: { start: win[0].hour.hour, end: win[win.length - 1].hour.hour + 1 },
    kite: { ...mid.kite, owned: ownedMain ?? mid.kite.owned },
    status: 'ok',
    maxWind: Math.max(...hours.map((r) => r.hour.wind)),
    stats: {
      windMin: Math.min(...win.map((r) => r.hour.wind)),
      windMax: Math.max(...win.map((r) => r.hour.wind)),
      gustMax: Math.max(...win.map((r) => r.hour.gust)),
      dir: mid.hour.dir,
    },
  }
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
