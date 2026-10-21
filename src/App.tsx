import { useEffect, useMemo, useState } from 'react'
import { SPOTS } from './data/spots'
import { useI18n } from './i18n'
import { HAS_PROXY } from './config'
import { haversineKm } from './lib/geo'
import { bestSession, rateDay } from './lib/rating'
import { DEFAULT_PROFILE, useLocalList, useLocalStorage } from './lib/storage'
import { fetchTravelTimes } from './services/routing'
import { fetchForecasts } from './services/weather'
import type { DayRating, Profile, Spot, SpotForecast, Travel } from './types'
import { ProfilePage } from './components/ProfilePage'
import { SpotCard } from './components/SpotCard'
import { SpotMap } from './components/SpotMap'

type Tab = 'spots' | 'profil'
type Selection = { kind: 'day'; idx: number } | { kind: 'range'; preset: 'week' | 'custom'; from: number; to: number }

interface Row {
  spot: Spot
  rating: DayRating
  travel?: Travel
  estimated: boolean
}

const PAGE = 15

export default function App() {
  const { t, lang, setLang, locale } = useI18n()
  const [profile, setProfile] = useLocalStorage<Profile>('kite.profile', DEFAULT_PROFILE)
  const [favorites, setFavorites] = useLocalList('kite.favorites')
  const [tab, setTab] = useState<Tab>(profile.address ? 'spots' : 'profil')

  const [forecasts, setForecasts] = useState<SpotForecast[] | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [travel, setTravel] = useState<Record<string, Travel>>({})
  const [travelError, setTravelError] = useState<string | null>(null)

  const [sel, setSel] = useState<Selection>({ kind: 'day', idx: 0 })
  const [radiusKm, setRadiusKm] = useState(0)
  const [favOnly, setFavOnly] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [limit, setLimit] = useState(PAGE)
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
  const shortFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }), [locale])
  const fmtDate = (d: string) => shortFmt.format(new Date(`${d}T12:00:00`))
  const dayLabel = (i: number) => (i === 0 ? t('day.today') : i === 1 ? t('day.tomorrow') : fmtDate(days[i]))

  // Spots à portée (trajet max, rayon, favoris), indépendamment du jour.
  const reachable = useMemo(() => {
    return SPOTS.map((spot) => {
      const crowKm = home ? haversineKm(home.lat, home.lon, spot.lat, spot.lon) : 0
      const real = travel[spot.id]
      // Secours si OSRM indisponible : distance à vol d'oiseau × 1.35 à ~65 km/h.
      const tr: Travel | undefined = real ?? (home ? { distanceKm: crowKm * 1.35, durationMin: ((crowKm * 1.35) / 65) * 60 } : undefined)
      return { spot, travel: tr, estimated: !real, crowKm }
    }).filter(
      (r) =>
        (!r.travel || r.travel.durationMin <= profile.maxTravelMin) &&
        (radiusKm === 0 || r.crowKm <= radiusKm) &&
        (!favOnly || favorites.includes(r.spot.id)),
    )
  }, [home, travel, profile.maxTravelMin, radiusKm, favOnly, favorites])

  const byTravel = (a: Row, b: Row) => (a.travel?.durationMin ?? 0) - (b.travel?.durationMin ?? 0)

  // Mode jour : une ligne par spot.
  const dayRows: Row[] = useMemo(() => {
    if (!forecasts || sel.kind !== 'day') return []
    const fc = new Map(forecasts.map((f) => [f.spotId, f]))
    return reachable.map((r) => ({ ...r, rating: rateDay(r.spot, profile, fc.get(r.spot.id)!.days[sel.idx]) }))
  }, [forecasts, sel, reachable, profile])

  // Mode semaine / période : meilleure session de 3 h par spot et par jour, tous spots confondus.
  const sessions: Row[] = useMemo(() => {
    if (!forecasts || sel.kind !== 'range') return []
    const fc = new Map(forecasts.map((f) => [f.spotId, f]))
    const out: Row[] = []
    for (const r of reachable) {
      const f = fc.get(r.spot.id)!
      for (let i = sel.from; i <= sel.to; i++) {
        const s = bestSession(r.spot, profile, f.days[i])
        if (s) out.push({ ...r, rating: s })
      }
    }
    return out.sort((a, b) => b.rating.score - a.rating.score || byTravel(a, b))
  }, [forecasts, sel, reachable, profile])

  const isRange = sel.kind === 'range'
  const visible: Row[] = isRange
    ? sessions.slice(0, limit)
    : dayRows.filter((r) => showAll || r.rating.window).sort((a, b) => b.rating.score - a.rating.score || byTravel(a, b))
  const rideableCount = dayRows.filter((r) => r.rating.window).length

  const mapSpots = isRange
    ? reachable.map((r) => {
        const best = sessions.find((s) => s.spot.id === r.spot.id)
        return { spot: r.spot, score: best?.rating.score ?? 0, rideable: !!best }
      })
    : dayRows.map((r) => ({ spot: r.spot, score: r.rating.score, rideable: !!r.rating.window }))

  const toggleFav = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const rowKey = (r: Row) => (isRange ? `${r.spot.id}|${r.rating.date}` : r.spot.id)
  const selectedRow = expanded ? visible.find((r) => rowKey(r) === expanded) ?? null : null

  function select(s: Selection) {
    setSel(s)
    setLimit(PAGE)
    setExpanded(null)
  }

  function selectFromMap(id: string) {
    let key = id
    if (isRange) {
      const idx = sessions.findIndex((s) => s.spot.id === id)
      if (idx < 0) return
      if (idx >= limit) setLimit(idx + 1)
      key = rowKey(sessions[idx])
    } else setShowAll(true)
    setExpanded(key)
    setHighlight(key)
    setTimeout(() => document.getElementById(`card-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setHighlight(null), 1800)
  }

  const last = Math.max(0, days.length - 1)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🪁</span>
          <div>
            <h1>KiteSpots CH</h1>
            <span className="muted small">{t('app.tagline')}</span>
          </div>
        </div>
        <div className="top-actions">
          <nav className="tabs">
            <button className={tab === 'spots' ? 'active' : ''} onClick={() => setTab('spots')}>{t('tab.spots')}</button>
            <button className={tab === 'profil' ? 'active' : ''} onClick={() => setTab('profil')}>
              {t('tab.profile')}{profile.name ? ` · ${profile.name}` : ''}
            </button>
          </nav>
          <div className="lang" role="group" aria-label="Language">
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
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
                {t('notice.noAddress', { link: '\u0000' }).split('\u0000')[0]}
                <button className="link" onClick={() => setTab('profil')}>{t('notice.profileLink')}</button>
                {t('notice.noAddress', { link: '\u0000' }).split('\u0000')[1]}
              </div>
            )}

            <div className="day-tabs" role="tablist">
              {days.map((d, i) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={sel.kind === 'day' && sel.idx === i}
                  className={sel.kind === 'day' && sel.idx === i ? 'active' : ''}
                  onClick={() => select({ kind: 'day', idx: i })}
                >
                  {dayLabel(i)}
                </button>
              ))}
              {days.length > 0 && (
                <>
                  <button
                    role="tab"
                    aria-selected={isRange && sel.preset === 'week'}
                    className={`range-tab ${isRange && sel.preset === 'week' ? 'active' : ''}`}
                    onClick={() => select({ kind: 'range', preset: 'week', from: 0, to: last })}
                  >
                    📅 {t('day.week')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={isRange && sel.preset === 'custom'}
                    className={`range-tab ${isRange && sel.preset === 'custom' ? 'active' : ''}`}
                    onClick={() =>
                      select({
                        kind: 'range',
                        preset: 'custom',
                        from: sel.kind === 'range' ? sel.from : sel.idx,
                        to: sel.kind === 'range' ? sel.to : Math.min(last, sel.idx + 2),
                      })
                    }
                  >
                    ↔ {t('day.range')}
                  </button>
                </>
              )}
            </div>

            {sel.kind === 'range' && sel.preset === 'custom' && (
              <div className="card range-picker">
                <label>
                  <span>{t('range.from')}</span>
                  <select
                    value={sel.from}
                    onChange={(e) => {
                      const from = Number(e.target.value)
                      select({ ...sel, from, to: Math.max(from, sel.to) })
                    }}
                  >
                    {days.map((_, i) => <option key={i} value={i}>{dayLabel(i)}</option>)}
                  </select>
                </label>
                <label>
                  <span>{t('range.to')}</span>
                  <select
                    value={sel.to}
                    onChange={(e) => {
                      const to = Number(e.target.value)
                      select({ ...sel, to, from: Math.min(sel.from, to) })
                    }}
                  >
                    {days.map((_, i) => <option key={i} value={i} disabled={i < sel.from}>{dayLabel(i)}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div className="card filters">
              <label className="field inline">
                <span>{t('filters.radius')} {radiusKm === 0 ? <strong>{t('filters.unlimited')}</strong> : <strong>{radiusKm} km</strong>}</span>
                <input type="range" min={0} max={250} step={10} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} />
              </label>
              <label className="field inline">
                <span>{t('filters.maxTravel')} <strong>{profile.maxTravelMin} min</strong></span>
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={15}
                  value={profile.maxTravelMin}
                  onChange={(e) => setProfile({ ...profile, maxTravelMin: Number(e.target.value) })}
                />
              </label>
              <div className="mode-toggle" role="group" aria-label={t('filters.mode')}>
                {(['car', 'transit'] as const).map((m) => (
                  <button
                    key={m}
                    className={profile.transport === m ? 'active' : ''}
                    aria-pressed={profile.transport === m}
                    onClick={() => setProfile({ ...profile, transport: m })}
                  >
                    {t(`mode.${m}`)}
                  </button>
                ))}
              </div>
              <div className="toggles">
                <label className="check"><input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> {t('filters.favOnly')}</label>
                {!isRange && (
                  <label className="check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> {t('filters.showAll')}</label>
                )}
              </div>
              <div className="profile-recap muted small">
                {profile.transport === 'transit' && <>{t('filters.carBased')} </>}
                {profile.weight} kg · {t('filters.kites')} {profile.kites.length ? profile.kites.join(' / ') + ' m²' : t('filters.none')}
              </div>
            </div>

            {forecastError && <div className="card error">{t('error.weather', { msg: forecastError })}</div>}
            {travelError && <div className="card warn small">{t('error.routing', { msg: travelError })}</div>}
            {!forecasts && !forecastError && <div className="card loading">{t('loading')}</div>}

            {forecasts && (
              <p className="result-count">
                {sel.kind === 'day'
                  ? t('count.day', { n: rideableCount, total: reachable.length, date: fmtDate(days[sel.idx]) })
                  : t('count.range', {
                      n: sessions.length,
                      spots: new Set(sessions.map((s) => s.spot.id)).size,
                      total: reachable.length,
                      from: fmtDate(days[sel.from]),
                      to: fmtDate(days[sel.to]),
                    })}
              </p>
            )}

            {forecasts && visible.length === 0 && (
              <div className="card empty">
                <p>{isRange ? t('empty.range') : t('empty.day')}</p>
                <p className="muted small">{isRange ? t('empty.hintRange') : t('empty.hint')}</p>
              </div>
            )}

            {visible.map((r) => {
              const key = rowKey(r)
              return (
                <div key={key} id={`card-${key}`}>
                  <SpotCard
                    spot={r.spot}
                    rating={r.rating}
                    dateLabel={isRange ? fmtDate(r.rating.date) : undefined}
                    travel={r.travel}
                    home={home}
                    transport={profile.transport}
                    travelEstimated={r.estimated}
                    favorite={favorites.includes(r.spot.id)}
                    onToggleFavorite={() => toggleFav(r.spot.id)}
                    expanded={expanded === key}
                    onToggle={() => setExpanded((e) => (e === key ? null : key))}
                    highlighted={highlight === key}
                  />
                </div>
              )
            })}

            {isRange && sessions.length > limit && (
              <button className="btn more" onClick={() => setLimit((l) => l + PAGE)}>
                {t('more')} ({sessions.length - limit})
              </button>
            )}

            <footer className="foot muted small">
              {!HAS_PROXY && <p className="static-note">{t('footer.static')}</p>}
              {t('footer')}
            </footer>
          </section>

          <aside className="map-col">
            <SpotMap
              spots={mapSpots}
              home={home}
              radiusKm={radiusKm}
              selectedId={expanded ? expanded.split('|')[0] : null}
              session={selectedRow ? { date: selectedRow.rating.date, startHour: selectedRow.rating.window?.start ?? null } : null}
              transport={profile.transport}
              onSelect={selectFromMap}
            />
          </aside>
        </main>
      )}
    </div>
  )
}

