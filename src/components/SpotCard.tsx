import { useEffect, useState } from 'react'
import type { DayRating, Spot, Travel } from '../types'
import { formatDuration } from '../lib/geo'
import { LEVEL_LABEL } from '../lib/rating'
import { getWaterTemp, type WaterTemp } from '../services/water'
import { HourlyTable } from './HourlyTable'
import { scoreClass } from '../lib/classes'
import { HeartButton, Stars } from './ui'

interface Props {
  spot: Spot
  rating: DayRating
  date: string
  travel?: Travel
  travelEstimated: boolean
  favorite: boolean
  onToggleFavorite: () => void
  expanded: boolean
  onToggle: () => void
  highlighted: boolean
}

export function SpotCard(p: Props) {
  const { spot, rating, travel } = p
  const [water, setWater] = useState<WaterTemp | null>(null)

  const rideable = rating.window !== null

  useEffect(() => {
    if (!p.expanded) return
    let alive = true
    setWater(null)
    getWaterTemp(spot, p.date).then((w) => alive && setWater(w))
    return () => {
      alive = false
    }
  }, [spot, p.date, p.expanded])

  const airTemps = rating.hours.map((h) => h.hour.temp)
  const maxRain = Math.max(0, ...rating.hours.map((h) => h.hour.rainProb))

  return (
    <article id={`spot-${spot.id}`} className={`card spot-card ${rideable ? '' : 'not-rideable'} ${p.highlighted ? 'highlight' : ''}`}>
      <header className="spot-head" onClick={p.onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && p.onToggle()}>
        <div className={`score-badge ${scoreClass(rating.score)}`}>{rideable ? rating.score.toFixed(1) : '–'}</div>
        <div className="spot-main">
          <div className="spot-title">
            <h3>{spot.name}</h3>
            <span className="muted small">{spot.lake} · {spot.region}</span>
          </div>
          <div className="spot-sub">
            <Stars score={rating.score} size="sm" />
            <span className={rideable ? 'summary ok' : 'summary'}>{rating.summary}</span>
          </div>
        </div>
        <div className="spot-side">
          {travel && (
            <span className="travel" title={p.travelEstimated ? 'Estimation à vol d\'oiseau (routage indisponible)' : 'Trajet en voiture (OSRM)'}>
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
            <Fact label="Air" value={airTemps.length ? `${Math.round(Math.min(...airTemps))}–${Math.round(Math.max(...airTemps))} °C` : '–'} />
            <Fact
              label="Eau"
              value={water ? `${water.value.toFixed(1)} °C` : '…'}
              hint={water ? (water.source === 'alplakes' ? `Alplakes (Eawag)${water.note ? ` – ${water.note}` : ''}` : `Estimation – ${water.note}`) : undefined}
            />
            <Fact label="Pluie max" value={`${maxRain}%`} />
            <Fact label="Jour" value={`${p.date && rating.hours[0] ? `${rating.hours[0].hour.hour}h–${rating.hours[rating.hours.length - 1].hour.hour + 1}h` : '–'}`} />
            <Fact label="Niveau spot" value={LEVEL_LABEL[spot.level]} />
            {rating.kite && (
              <Fact
                label="Aile conseillée"
                value={rating.kite.owned ? `${rating.kite.owned} m²` : 'aucune adaptée'}
                hint={`Taille théorique ≈ ${rating.kite.ideal.toFixed(1)} m²`}
              />
            )}
          </div>
          <p className="notes">{spot.notes}</p>
          <HourlyTable rating={rating} />
          <div className="links">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`} target="_blank" rel="noreferrer">Itinéraire ↗</a>
            <a href={`https://www.windy.com/${spot.lat}/${spot.lon}?wind,${spot.lat},${spot.lon},11`} target="_blank" rel="noreferrer">Windy ↗</a>
            <a href={`https://www.meteoswiss.admin.ch/`} target="_blank" rel="noreferrer">MétéoSuisse ↗</a>
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
