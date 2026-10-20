import { useEffect, useState } from 'react'
import type { DayRating, Place, Spot, TransportMode, Travel } from '../types'
import { useI18n } from '../i18n'
import { dirLabel, formatDuration } from '../lib/geo'
import { getWaterTemp, type WaterTemp } from '../services/water'
import { HourlyTable } from './HourlyTable'
import { TransitBlock } from './TransitBlock'
import { scoreClass } from '../lib/classes'
import { HeartButton, Stars, WgStars } from './ui'
import { useWindguru } from '../lib/useWindguru'
import { wgAt } from '../services/windguru'

interface Props {
  spot: Spot
  rating: DayRating
  /** Affiché en tête de carte (mode semaine / période). */
  dateLabel?: string
  travel?: Travel
  home: Place | null
  transport: TransportMode
  travelEstimated: boolean
  favorite: boolean
  onToggleFavorite: () => void
  expanded: boolean
  onToggle: () => void
  highlighted: boolean
}

export function SpotCard(p: Props) {
  const { spot, rating, travel } = p
  const { t, lang, dir } = useI18n()
  const [water, setWater] = useState<WaterTemp | null>(null)

  const rideable = rating.window !== null
  const wg = useWindguru(spot)

  // Étoiles Windguru moyennes sur la session (ou sur la journée s'il n'y en a pas).
  const wgHours = rating.hours.filter((r) => !rating.window || (r.hour.hour >= rating.window.start && r.hour.hour < rating.window.end))
  const wgVals = wg.fc ? wgHours.map((r) => wgAt(wg.fc!, rating.date, r.hour.hour)).filter((v) => v !== null) : []
  const wgAvg = wgVals.length ? wgVals.reduce((a, v) => a + v.stars, 0) / wgVals.length : null
  const wgRange = rating.window ? `${rating.window.start}h–${rating.window.end}h` : t('fact.daylight').toLowerCase()

  useEffect(() => {
    if (!p.expanded) return
    let alive = true
    setWater(null)
    getWaterTemp(spot, rating.date).then((w) => alive && setWater(w))
    return () => {
      alive = false
    }
  }, [spot, rating.date, p.expanded])

  const airTemps = rating.hours.map((h) => h.hour.temp)
  const maxRain = Math.max(0, ...rating.hours.map((h) => h.hour.rainProb))

  let summary: string
  if (rating.status === 'ok' && rating.window && rating.stats) {
    const lo = Math.round(rating.stats.windMin)
    const hi = Math.round(rating.stats.windMax)
    summary = t('summary.ok', {
      start: rating.window.start,
      end: rating.window.end,
      wind: lo === hi ? lo : `${lo}–${hi}`,
      dir: dir(dirLabel(rating.stats.dir)),
    })
  } else if (rating.status === 'nowind') summary = t('summary.nowind', { max: Math.round(rating.maxWind) })
  else summary = t(`summary.${rating.status}`)

  const waterHint = water
    ? water.source === 'alplakes'
      ? `${t('water.alplakes')}${water.note === 'today' ? ` – ${t('water.today')}` : ''}`
      : t('water.estimate')
    : undefined

  return (
    <article id={`spot-${spot.id}`} className={`card spot-card ${rideable ? '' : 'not-rideable'} ${p.highlighted ? 'highlight' : ''}`}>
      <header className="spot-head" onClick={p.onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && p.onToggle()}>
        <div className={`score-badge ${scoreClass(rating.score)}`}>{rideable ? rating.score.toFixed(1) : '–'}</div>
        <div className="spot-main">
          <div className="spot-title">
            {p.dateLabel && <span className="date-badge">{p.dateLabel}</span>}
            <h3>{spot.name}</h3>
            <span className="muted small">{spot.lake} · {spot.region}</span>
          </div>
          <div className="spot-sub">
            <Stars score={rating.score} size="sm" />
            {wgAvg !== null && (
              <WgStars value={wgAvg} title={t('wg.stars', { model: wg.fc!.modelName, avg: wgAvg.toFixed(1), range: wgRange })} />
            )}
            <span className={rideable ? 'summary ok' : 'summary'}>{summary}</span>
          </div>
        </div>
        <div className="spot-side">
          {travel && (
            <span className="travel" title={p.travelEstimated ? t('travel.estimated') : t('travel.road')}>
              🚗 {p.travelEstimated && '≈'}{formatDuration(travel.durationMin)}
              <span className="muted small"> · {Math.round(travel.distanceKm)} km</span>
            </span>
          )}
          {rating.kite?.owned && <span className={`kite-tag big fit-${rating.kite.fit}`}>🪁 {rating.kite.owned} m²</span>}
          <HeartButton active={p.favorite} onClick={p.onToggleFavorite} />
        </div>
      </header>

      {p.expanded && (
        <div className="spot-body">
          <div className="facts">
            <Fact label={t('fact.air')} value={airTemps.length ? `${Math.round(Math.min(...airTemps))}–${Math.round(Math.max(...airTemps))} °C` : '–'} />
            <Fact label={t('fact.water')} value={water ? `${water.value.toFixed(1)} °C` : '…'} hint={waterHint} />
            <Fact label={t('fact.rainMax')} value={`${maxRain}%`} />
            <Fact
              label={t('fact.daylight')}
              value={rating.hours[0] ? `${rating.hours[0].hour.hour}h–${rating.hours[rating.hours.length - 1].hour.hour + 1}h` : '–'}
            />
            <Fact label={t('fact.level')} value={t(`level.${spot.level}`)} />
            {rating.kite && (
              <Fact
                label={t('fact.kite')}
                value={rating.kite.owned ? `${rating.kite.owned} m²` : t('fact.kiteNone')}
                hint={t('fact.kiteIdeal', { size: rating.kite.ideal.toFixed(1) })}
              />
            )}
          </div>
          <p className="notes">{lang === 'en' ? spot.notesEn : spot.notes}</p>
          {p.transport === 'transit' && (
            <TransitBlock home={p.home} spot={spot} date={rating.date} startHour={rating.window?.start ?? null} />
          )}
          <HourlyTable rating={rating} wg={wg.fc} />
          <div className="links">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`} target="_blank" rel="noreferrer">{t('link.route')}</a>
            <a href={`https://www.windy.com/${spot.lat}/${spot.lon}?wind,${spot.lat},${spot.lon},11`} target="_blank" rel="noreferrer">Windy ↗</a>
            {wg.id && (
              <a href={`https://www.windguru.cz/${wg.id}`} target="_blank" rel="noreferrer">
                Windguru ↗
              </a>
            )}
            <a href={lang === 'en' ? 'https://www.meteoswiss.admin.ch/' : 'https://www.meteosuisse.admin.ch/'} target="_blank" rel="noreferrer">
              {lang === 'en' ? 'MeteoSwiss ↗' : 'MétéoSuisse ↗'}
            </a>
          </div>
        </div>
      )}
    </article>
  )
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="fact" title={hint}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
      {hint && <span className="fact-hint">{hint}</span>}
    </div>
  )
}
