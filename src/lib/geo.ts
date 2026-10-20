const R = 6371

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']

export function dirLabel(deg: number): string {
  return POINTS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]
}

/** Distance angulaire minimale entre une direction et une plage [from, to] (sens horaire). 0 si dedans. */
export function angleToRange(deg: number, [from, to]: [number, number]): number {
  const norm = (x: number) => ((x % 360) + 360) % 360
  const d = norm(deg)
  const span = norm(to - from)
  if (norm(d - from) <= span) return 0
  const diff = (a: number, b: number) => {
    const x = Math.abs(norm(a) - norm(b))
    return Math.min(x, 360 - x)
  }
  return Math.min(diff(d, from), diff(d, to))
}

export function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h} h ${m.toString().padStart(2, '0')}`
}
