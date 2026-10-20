import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Place, Spot } from '../types'
import { useI18n } from '../i18n'
import { formatDuration } from '../lib/geo'
import { fetchRoute, type Route } from '../services/routing'

interface MapSpot {
  spot: Spot
  score: number
  rideable: boolean
}

const COLORS = { top: '#0e9f6e', good: '#38b26b', ok: '#e3a008', low: '#f98a4b', none: '#9aa5b1' }
const SELECTED = '#e02424'
const HOME = '#1c64f2'

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

interface Props {
  spots: MapSpot[]
  home: Place | null
  radiusKm: number
  selectedId: string | null
  onSelect: (id: string) => void
}

export function SpotMap({ spots, home, radiusKm, selectedId, onSelect }: Props) {
  const { t } = useI18n()
  const selected = spots.find((m) => m.spot.id === selectedId) ?? null
  const [route, setRoute] = useState<{ id: string; route: Route | null } | null>(null)

  useEffect(() => {
    if (!home || !selected) return
    let alive = true
    const id = selected.spot.id
    fetchRoute(home, selected.spot)
      .then((r) => alive && setRoute({ id, route: r }))
      .catch(() => alive && setRoute({ id, route: null }))
    return () => {
      alive = false
    }
  }, [home, selected?.spot])

  const current = route && selected && route.id === selected.spot.id ? route : null
  // Tracé réel si dispo, sinon ligne droite en pointillés pendant le chargement ou en cas d'échec.
  const line: [number, number][] | null =
    home && selected ? (current?.route?.coords ?? [[home.lat, home.lon], [selected.spot.lat, selected.spot.lon]]) : null

  // Carte recadrée sur le trajet quand un spot est sélectionné, sinon sur tous les spots.
  let points: [number, number][]
  if (selected) points = line ?? [[selected.spot.lat, selected.spot.lon]]
  else {
    points = spots.map((m) => [m.spot.lat, m.spot.lon])
    if (home) points.push([home.lat, home.lon])
  }
  // Ne recadre qu'une fois le tracé final connu, pour éviter deux zooms successifs.
  const fitPoints = selected && home && !current ? [] : points

  return (
    <MapContainer center={[46.8, 8.2]} zoom={7} className="map" scrollWheelZoom={window.matchMedia('(min-width: 1001px)').matches}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={fitPoints} />
      {radiusKm > 0 && home && (
        <Circle center={[home.lat, home.lon]} radius={radiusKm * 1000} pathOptions={{ color: HOME, weight: 1, fillOpacity: 0.04 }} />
      )}
      {line && (
        <>
          <Polyline positions={line} pathOptions={{ color: '#fff', weight: 8, opacity: 0.9 }} />
          <Polyline
            positions={line}
            pathOptions={{ color: SELECTED, weight: 4, opacity: 0.9, dashArray: current?.route ? undefined : '6 8' }}
          />
        </>
      )}
      {spots
        .filter((m) => m.spot.id !== selectedId)
        .map((m) => (
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
      {home && (
        <CircleMarker center={[home.lat, home.lon]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: HOME, fillOpacity: 1 }}>
          <Tooltip>{t('map.start')}</Tooltip>
        </CircleMarker>
      )}
      {selected && (
        // La clé change avec la sélection pour que le tooltip permanent se replace correctement.
        <CircleMarker
          key={`sel-${selected.spot.id}-${current?.route ? 'r' : 'n'}`}
          center={[selected.spot.lat, selected.spot.lon]}
          radius={12}
          pathOptions={{ color: '#fff', weight: 3, fillColor: SELECTED, fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelect(selected.spot.id) }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]} className="sel-tooltip">
            <strong>{selected.spot.name}</strong>
            {current?.route && ` · 🚗 ${formatDuration(current.route.durationMin)} · ${Math.round(current.route.distanceKm)} km`}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
