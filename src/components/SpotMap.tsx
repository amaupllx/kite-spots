import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Place, Spot } from '../types'
import { useI18n } from '../i18n'

interface MapSpot {
  spot: Spot
  score: number
  rideable: boolean
}

const COLORS = { top: '#0e9f6e', good: '#38b26b', ok: '#e3a008', low: '#f98a4b', none: '#9aa5b1' }

function color(m: MapSpot) {
  if (!m.rideable) return COLORS.none
  if (m.score >= 4) return COLORS.top
  if (m.score >= 3) return COLORS.good
  if (m.score >= 2) return COLORS.ok
  return COLORS.low
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 0) return
    map.fitBounds(points, { padding: [30, 30], maxZoom: 10 })
  }, [key])
  return null
}

export function SpotMap({ spots, home, radiusKm, onSelect }: { spots: MapSpot[]; home: Place | null; radiusKm: number; onSelect: (id: string) => void }) {
  const { t } = useI18n()
  const points: [number, number][] = spots.map((m) => [m.spot.lat, m.spot.lon])
  if (home) points.push([home.lat, home.lon])
  return (
    <MapContainer center={[46.8, 8.2]} zoom={7} className="map" scrollWheelZoom={window.matchMedia('(min-width: 1001px)').matches}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {home && (
        <>
          <CircleMarker center={[home.lat, home.lon]} radius={7} pathOptions={{ color: '#1c64f2', fillColor: '#1c64f2', fillOpacity: 1 }}>
            <Tooltip>{t('map.start')}</Tooltip>
          </CircleMarker>
          {radiusKm > 0 && <Circle center={[home.lat, home.lon]} radius={radiusKm * 1000} pathOptions={{ color: '#1c64f2', weight: 1, fillOpacity: 0.04 }} />}
        </>
      )}
      {spots.map((m) => (
        <CircleMarker
          key={m.spot.id}
          center={[m.spot.lat, m.spot.lon]}
          radius={m.rideable ? 9 : 6}
          pathOptions={{ color: '#fff', weight: 2, fillColor: color(m), fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect(m.spot.id) }}
        >
          <Tooltip>
            {m.spot.name} {m.rideable ? `· ${m.score.toFixed(1)}/5` : `· ${t('map.notRideable')}`}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
