import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Place, Spot, TransportMode } from '../types'
import { useI18n } from '../i18n'
import { formatDuration } from '../lib/geo'
import { fetchRoute } from '../services/routing'
import { findTransit } from '../services/transit'

interface MapSpot {
  spot: Spot
  score: number
  rideable: boolean
}

interface Segment {
  coords: [number, number][]
  walk: boolean
}

interface Path {
  key: string
  segments: Segment[] // vide si aucun itinéraire trouvé
  label: string
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
    map.fitBounds(points, { padding: [30, 30], maxZoom: 11 })
  }, [key])
  return null
}

interface Props {
  spots: MapSpot[]
  home: Place | null
  radiusKm: number
  selectedId: string | null
  session: { date: string; startHour: number | null } | null
  transport: TransportMode
  onSelect: (id: string) => void
}

export function SpotMap({ spots, home, radiusKm, selectedId, session, transport, onSelect }: Props) {
  const { t } = useI18n()
  const selected = spots.find((m) => m.spot.id === selectedId) ?? null
  const [path, setPath] = useState<Path | null>(null)

  const pathKey = selected && home ? `${transport}|${selected.spot.id}|${session?.date}|${session?.startHour}` : null

  useEffect(() => {
    if (!pathKey || !home || !selected) return
    let alive = true
    const done = (p: Omit<Path, 'key'>) => alive && setPath({ key: pathKey, ...p })
    const none = () => done({ segments: [], label: '' })

    if (transport === 'car') {
      fetchRoute(home, selected.spot)
        .then((r) =>
          done({
            segments: [{ coords: r.coords, walk: false }],
            label: `🚗 ${formatDuration(r.durationMin)} · ${Math.round(r.distanceKm)} km`,
          }),
        )
        .catch(none)
    } else if (session && session.startHour !== null) {
      findTransit(home, selected.spot, session.date, session.startHour)
        .then((res) => {
          const trip = res.options[0] ?? res.fallback
          if (!trip) return none()
          done({
            segments: trip.legs.filter((l) => l.coords.length > 1).map((l) => ({ coords: l.coords, walk: l.kind === 'walk' })),
            label: `🚆 ${trip.dep} → ${trip.arr} · ${formatDuration(trip.durationMin)}`,
          })
        })
        .catch(none)
    } else none()
    return () => {
      alive = false
    }
  }, [pathKey])

  // On n'affiche le tracé qu'une fois reçu (pas de ligne provisoire pendant le chargement).
  const current = path && path.key === pathKey ? path : null
  const segments = current?.segments ?? []

  let fitPoints: [number, number][]
  if (selected) {
    // Recadrage seulement quand la réponse est arrivée, pour éviter deux zooms successifs.
    if (home && !current) fitPoints = []
    else if (segments.length) fitPoints = segments.flatMap((s) => s.coords)
    else fitPoints = home ? [[home.lat, home.lon], [selected.spot.lat, selected.spot.lon]] : [[selected.spot.lat, selected.spot.lon]]
  } else {
    fitPoints = spots.map((m) => [m.spot.lat, m.spot.lon])
    if (home) fitPoints.push([home.lat, home.lon])
  }

  // Arrêts de correspondance (début de chaque tronçon en train / bus).
  const stops = transport === 'transit' ? segments.filter((s) => !s.walk).flatMap((s) => [s.coords[0], s.coords[s.coords.length - 1]]) : []

  return (
    <MapContainer center={[46.8, 8.2]} zoom={7} className="map" scrollWheelZoom={window.matchMedia('(min-width: 1001px)').matches}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={fitPoints} />
      {radiusKm > 0 && home && (
        <Circle center={[home.lat, home.lon]} radius={radiusKm * 1000} pathOptions={{ color: HOME, weight: 1, fillOpacity: 0.04 }} />
      )}
      {segments.map((s, i) => (
        <Polyline key={`c${i}`} positions={s.coords} pathOptions={{ color: '#fff', weight: s.walk ? 6 : 8, opacity: 0.9 }} />
      ))}
      {segments.map((s, i) => (
        <Polyline key={`l${i}`} positions={s.coords} pathOptions={{ color: SELECTED, weight: s.walk ? 3 : 4, opacity: s.walk ? 0.55 : 0.9 }} />
      ))}
      {stops.map((p, i) => (
        <CircleMarker key={`s${i}`} center={p} radius={4} pathOptions={{ color: SELECTED, weight: 2, fillColor: '#fff', fillOpacity: 1 }} />
      ))}
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
        // La clé change avec le libellé pour que le tooltip permanent se replace correctement.
        <CircleMarker
          key={`sel-${selected.spot.id}-${current?.label ?? ''}`}
          center={[selected.spot.lat, selected.spot.lon]}
          radius={12}
          pathOptions={{ color: '#fff', weight: 3, fillColor: SELECTED, fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelect(selected.spot.id) }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]} className="sel-tooltip">
            <strong>{selected.spot.name}</strong>
            {current?.label && ` · ${current.label}`}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
