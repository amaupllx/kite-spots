export type Level = 'debutant' | 'intermediaire' | 'avance'
export type Board = 'twintip' | 'surf' | 'foil'
export type TransportMode = 'car' | 'transit'

export interface Place {
  label: string
  lat: number
  lon: number
}

export interface Profile {
  name: string
  weight: number // kg
  level: Level
  board: Board
  kites: number[] // tailles d'ailes possédées (m²)
  maxTravelMin: number
  address: Place | null
  transport: TransportMode
}

/** Plage de directions favorables, en degrés "d'où vient le vent" (from → to, sens horaire). */
export type DirRange = [number, number]

export interface AlplakesRef {
  model: 'delft3d-flow' | 'mitgcm'
  lake: string
}

export interface Spot {
  id: string
  name: string
  lake: string
  region: string // canton ou pays
  lat: number
  lon: number
  directions: DirRange[]
  level: Level
  notes: string
  notesEn: string
  /** Identifiant du spot sur windguru.cz (widget officiel). */
  windguru?: number
  /** Nom du spot Windguru voisin, quand il n'existe pas de spot identique. */
  windguruApprox?: string
  alplakes?: AlplakesRef
  /** Profil thermique du plan d'eau pour l'estimation de secours (°C moyens par mois). */
  waterClimate: 'plaine' | 'grand-lac' | 'altitude'
}

export interface HourForecast {
  time: string // ISO local "2026-10-21T13:00"
  hour: number
  wind: number // nœuds
  gust: number // nœuds
  dir: number // degrés
  temp: number // °C
  rainProb: number // %
  rain: number // mm
  code: number // code météo WMO
}

export interface DayForecast {
  date: string // YYYY-MM-DD
  sunrise: string
  sunset: string
  hours: HourForecast[] // heures de jour uniquement
}

export interface SpotForecast {
  spotId: string
  days: DayForecast[]
}

export interface Travel {
  durationMin: number
  distanceKm: number
}

export type KiteFit = 'ideal' | 'surtoile' | 'soustoile' | 'aucune'

export interface KitePick {
  ideal: number // taille théorique (m²)
  owned: number | null // aile possédée recommandée
  fit: KiteFit
}

/** Critères de notation activables depuis la page des spots. */
export type Criterion = 'kite' | 'wind' | 'gust' | 'dir' | 'rain' | 'temp' | 'level'
export type Criteria = Record<Criterion, boolean>

/** Effet d'un critère sur la note d'une heure : points ajoutés/retirés, ou heure rendue non navigable. */
export type Impact = number | 'block'

export type Warning = 'dir' | 'tooStrong' | 'storm' | 'veryGusty' | 'gusty' | 'hardSpot'

export interface HourRating {
  hour: HourForecast
  score: number // 0..5
  dirOk: 'bon' | 'limite' | 'mauvais'
  kite: KitePick
  rideable: boolean
  warnings: Warning[]
  impacts: Partial<Record<Criterion, Impact>>
}

export interface DayRating {
  date: string
  score: number // 0..5
  hours: HourRating[]
  window: { start: number; end: number } | null // heures (end exclusive)
  kite: KitePick | null // aile dominante sur la meilleure fenêtre
  status: 'ok' | 'nodata' | 'nowind' | 'notrideable'
  maxWind: number
  stats: { windMin: number; windMax: number; gustMax: number; dir: number } | null
}
