import { useEffect, useMemo, useState } from 'react'
import { SPOTS, SPOTS_BY_ID } from './data/spots'
import { haversineKm } from './lib/geo'
import { rateDay } from './lib/rating'
import { DEFAULT_PROFILE, useLocalList, useLocalStorage } from './lib/storage'
import { fetchTravelTimes } from './services/routing'
import { fetchForecasts } from './services/weather'
import type { Profile, SpotForecast, Travel } from './types'
import { ProfilePage } from './components/ProfilePage'
import { SpotCard } from './components/SpotCard'
import { SpotMap } from './components/SpotMap'

type Tab = 'spots' | 'profil'

const dayFmt = new Intl.DateTimeFormat('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' })

export default function App() {
  const [profile, setProfile] = useLocalStorage<Profile>('kite.profile', DEFAULT_PROFILE)
  const [favorites, setFavorites] = useLocalList('kite.favorites')
  const [tab, setTab] = useState<Tab>(profile.address ? 'spots' : 'profil')

  const [forecasts, setForecasts] = useState<SpotForecast[] | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [travel, setTravel] = useState<Record<string, Travel>>({})
  const [travelError, setTravelError] = useState<string | null>(null)

  const [dayIdx, setDayIdx] = useState(0)
  const [radiusKm, setRadiusKm] = useState(0)
  const [favOnly, setFavOnly] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  useEffect(() => {
    fetchForecasts(SPOTS)
      .then(setForecasts)
      .catch((e: Error) => setForecastError(e.message))
  }, [])

  const home = profile.address
  useEffect(() => {
    if (!home) return
    setTravelError(null)
    fetchTravelTimes(home, SPOTS)
      .then(setTravel)
      .catch((e: Error) => setTravelError(e.message))
  }, [home])

  const days = forecasts?.[0]?.days.map((d) => d.date) ?? []
  const date = days[dayIdx] ?? ''

  const rows = useMemo(() => {
    if (!forecasts) return []
    return forecasts.map((f) => {
      const spot = SPOTS_BY_ID[f.spotId]
      const day = f.days[dayIdx]
      const rating = rateDay(spot, profile, day)
      const crowKm = home ? haversineKm(home.lat, home.lon, spot.lat, spot.lon) : 0
      const real = travel[spot.id]
      // Secours si OSRM indisponible : distance à vol d'oiseau × 1.35 à ~65 km/h.
      const t: Travel | undefined = real ?? (home ? { distanceKm: crowKm * 1.35, durationMin: ((crowKm * 1.35) / 65) * 60 } : undefined)
      return { spot, rating, travel: t, estimated: !real, crowKm }
    })
  }, [forecasts, dayIdx, profile, travel, home])

  const inRange = rows.filter(
    (r) =>
      (!r.travel || r.travel.durationMin <= profile.maxTravelMin) &&
      (radiusKm === 0 || r.crowKm <= radiusKm) &&
      (!favOnly || favorites.includes(r.spot.id)),
  )
  const visible = inRange
    .filter((r) => showAll || r.rating.window)
    .sort((a, b) => b.rating.score - a.rating.score || (a.travel?.durationMin ?? 0) - (b.travel?.durationMin ?? 0))
  const rideableCount = inRange.filter((r) => r.rating.window).length

  const toggleFav = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  function selectFromMap(id: string) {
    setShowAll(true)
    setExpanded(id)
    setHighlight(id)
    setTimeout(() => document.getElementById(`spot-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setHighlight(null), 1800)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🪁</span>
          <div>
            <h1>KiteSpots CH</h1>
            <span className="muted small">Où rider cette semaine ?</span>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'spots' ? 'active' : ''} onClick={() => setTab('spots')}>Spots</button>
          <button className={tab === 'profil' ? 'active' : ''} onClick={() => setTab('profil')}>
            Profil{profile.name ? ` · ${profile.name}` : ''}
          </button>
        </nav>
      </header>

      {tab === 'profil' ? (
        <main className="container">
          <ProfilePage
            profile={profile}
            onChange={setProfile}
            favorites={favorites}
            onToggleFavorite={toggleFav}
            onDone={() => setTab('spots')}
          />
        </main>
      ) : (
        <main className="container layout">
          <section className="list-col">
            {!home && (
              <div className="card notice">
                Configure ton adresse de départ dans le <button className="link" onClick={() => setTab('profil')}>profil</button> pour
                calculer les temps de trajet.
              </div>
            )}

            <div className="day-tabs" role="tablist">
              {days.map((d, i) => (
                <button key={d} role="tab" aria-selected={i === dayIdx} className={i === dayIdx ? 'active' : ''} onClick={(e) => {
                  setDayIdx(i)
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                }}>
                  {i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : dayFmt.format(new Date(`${d}T12:00:00`))}
                </button>
              ))}
            </div>

            <div className="card filters">
              <label className="field inline">
                <span>Rayon {radiusKm === 0 ? <strong>illimité</strong> : <strong>{radiusKm} km</strong>}</span>
                <input type="range" min={0} max={250} step={10} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} />
              </label>
              <label className="field inline">
                <span>Trajet max <strong>{profile.maxTravelMin} min</strong></span>
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={15}
                  value={profile.maxTravelMin}
                  onChange={(e) => setProfile({ ...profile, maxTravelMin: Number(e.target.value) })}
                />
              </label>
              <div className="toggles">
                <label className="check"><input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> Favoris uniquement</label>
                <label className="check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Afficher les spots non praticables</label>
              </div>
              <div className="profile-recap muted small">
                {profile.weight} kg · ailes {profile.kites.length ? profile.kites.map((k) => `${k}`).join(' / ') + ' m²' : 'aucune'}
              </div>
            </div>

            {forecastError && <div className="card error">Impossible de charger la météo : {forecastError}</div>}
            {travelError && <div className="card warn small">Routage indisponible ({travelError}) — temps de trajet estimés.</div>}
            {!forecasts && !forecastError && <div className="card loading">Chargement des prévisions…</div>}

            {forecasts && (
              <p className="result-count">
                <strong>{rideableCount}</strong> spot{rideableCount > 1 ? 's' : ''} praticable{rideableCount > 1 ? 's' : ''} sur {inRange.length} à portée
                {date && <> · {dayFmt.format(new Date(`${date}T12:00:00`))}</>}
              </p>
            )}

            {forecasts && visible.length === 0 && (
              <div className="card empty">
                <p>Aucun spot praticable ce jour-là dans ta zone.</p>
                <p className="muted small">Essaie un autre jour, élargis le trajet max ou coche « Afficher les spots non praticables ».</p>
              </div>
            )}

            {visible.map((r) => (
              <SpotCard
                key={r.spot.id}
                spot={r.spot}
                rating={r.rating}
                date={date}
                travel={r.travel}
                travelEstimated={r.estimated}
                favorite={favorites.includes(r.spot.id)}
                onToggleFavorite={() => toggleFav(r.spot.id)}
                expanded={expanded === r.spot.id}
                onToggle={() => setExpanded((e) => (e === r.spot.id ? null : r.spot.id))}
                highlighted={highlight === r.spot.id}
              />
            ))}

            <footer className="foot muted small">
              Météo : Open-Meteo (modèles MétéoSuisse ICON-CH) · Eau : Alplakes / Eawag · Trajets : OSRM · Cartes : © OpenStreetMap.
              Les notes sont indicatives : vérifie toujours les conditions et la réglementation locale sur place.
            </footer>
          </section>

          <aside className="map-col">
            <SpotMap
              spots={inRange.map((r) => ({ spot: r.spot, score: r.rating.score, rideable: !!r.rating.window }))}
              home={home}
              radiusKm={radiusKm}
              onSelect={selectFromMap}
            />
          </aside>
        </main>
      )}
    </div>
  )
}
