import type { Board, DayForecast, DayRating, HourForecast, HourRating, KitePick, Level, Profile, Spot } from '../types'
import { angleToRange, dirLabel } from './geo'

// Coefficient de la règle empirique : taille (m²) ≈ poids (kg) × k / vent (nœuds).
const BOARD_K: Record<Board, number> = { twintip: 2.4, surf: 2.6, foil: 1.5 }
const MIN_WIND: Record<Board, number> = { twintip: 11, surf: 12, foil: 7 }
const MAX_WIND: Record<Level, number> = { debutant: 22, intermediaire: 30, avance: 40 }
const LEVEL_RANK: Record<Level, number> = { debutant: 0, intermediaire: 1, avance: 2 }

export const LEVEL_LABEL: Record<Level, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}
export const BOARD_LABEL: Record<Board, string> = { twintip: 'Twintip', surf: 'Surf / directionnelle', foil: 'Foil' }

const STORM_CODES = new Set([95, 96, 99])

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

export function rateHour(spot: Spot, profile: Profile, h: HourForecast): HourRating {
  const warnings: string[] = []
  const kite = pickKite(profile, h)

  const dist = Math.min(...spot.directions.map((r) => angleToRange(h.dir, r)))
  const dirOk: HourRating['dirOk'] = dist === 0 ? 'bon' : dist <= 25 ? 'limite' : 'mauvais'

  let rideable = true
  if (h.wind < MIN_WIND[profile.board]) rideable = false
  if (kite.fit === 'aucune') rideable = false
  if (dirOk === 'mauvais') {
    rideable = false
    warnings.push(`Direction ${dirLabel(h.dir)} défavorable`)
  }
  if (h.gust > MAX_WIND[profile.level] + 5 || h.wind > MAX_WIND[profile.level]) {
    rideable = false
    warnings.push('Trop fort pour ton niveau')
  }
  if (STORM_CODES.has(h.code)) {
    rideable = false
    warnings.push('Risque d\'orage')
  }

  let score = 0
  if (rideable) {
    score = kite.fit === 'ideal' ? 4 : 2.5
    const gf = h.gust / Math.max(h.wind, 1)
    if (gf <= 1.25) score += 1
    else if (gf <= 1.4) score += 0.5
    else if (gf > 1.8) {
      score -= 2
      warnings.push('Très rafaleux')
    } else if (gf > 1.6) {
      score -= 1
      warnings.push('Rafaleux')
    }
    if (dirOk === 'limite') score *= 0.65
    if (h.rainProb >= 70) score -= 1
    else if (h.rainProb >= 40) score -= 0.5
    if (h.temp < 5) score -= 0.5
    if (LEVEL_RANK[spot.level] > LEVEL_RANK[profile.level]) {
      score -= 1
      warnings.push('Spot exigeant pour ton niveau')
    }
  }
  return { hour: h, score: clamp(score, 0, 5), dirOk, kite, rideable, warnings }
}

export function rateDay(spot: Spot, profile: Profile, day: DayForecast): DayRating {
  const hours = day.hours.map((h) => rateHour(spot, profile, h))

  // Meilleure fenêtre : suite d'heures navigables (note ≥ 2) dont la somme des notes est maximale.
  let best: { start: number; end: number; sum: number } | null = null
  let i = 0
  while (i < hours.length) {
    if (!(hours[i].rideable && hours[i].score >= 2)) {
      i++
      continue
    }
    let j = i
    let sum = 0
    while (j < hours.length && hours[j].rideable && hours[j].score >= 2) sum += hours[j++].score
    if (!best || sum > best.sum) best = { start: i, end: j, sum }
    i = j
  }

  if (!best) {
    const maxWind = Math.max(0, ...day.hours.map((h) => h.wind))
    return {
      score: 0,
      hours,
      window: null,
      kite: null,
      summary: day.hours.length === 0 ? 'Pas de données' : maxWind < MIN_WIND[profile.board] ? `Pas assez de vent (max ${Math.round(maxWind)} nds)` : 'Conditions non praticables',
    }
  }

  const win = hours.slice(best.start, best.end)
  const len = win.length
  const avg = best.sum / len
  const lenFactor = len >= 3 ? 1 : len === 2 ? 0.85 : 0.65
  const counts = new Map<number, number>()
  win.forEach((r) => r.kite.owned && counts.set(r.kite.owned, (counts.get(r.kite.owned) ?? 0) + 1))
  const ownedMain = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const mid = win[Math.floor(len / 2)]
  const kite: KitePick = { ...mid.kite, owned: ownedMain ?? mid.kite.owned }

  const wMin = Math.round(Math.min(...win.map((r) => r.hour.wind)))
  const wMax = Math.round(Math.max(...win.map((r) => r.hour.wind)))
  const window = { start: win[0].hour.hour, end: win[len - 1].hour.hour + 1 }
  return {
    score: Math.round(avg * lenFactor * 10) / 10,
    hours,
    window,
    kite,
    summary: `${window.start}h–${window.end}h · ${wMin === wMax ? wMin : `${wMin}–${wMax}`} nds ${dirLabel(mid.hour.dir)}`,
  }
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
