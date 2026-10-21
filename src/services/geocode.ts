import type { Place } from '../types'
import { NOMINATIM_URL } from '../config'

/** Recherche d'adresse (Nominatim / OpenStreetMap). À appeler sur action explicite, pas à chaque frappe. */
export async function searchAddress(q: string, lang = 'fr'): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'ch,fr,de,it,at,li',
    'accept-language': lang,
  })
  const res = await fetch(`${NOMINATIM_URL}/search?${params}`)
  if (!res.ok) throw new Error(`Géocodage : HTTP ${res.status}`)
  const json = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  return json.map((r) => ({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }))
}
