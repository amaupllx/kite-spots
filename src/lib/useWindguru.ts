import { useEffect, useState } from 'react'
import type { Spot } from '../types'
import { getWindguru, windguruIdOf, type WgForecast } from '../services/windguru'

/** Prévision Windguru (étoiles) du spot, chargée à la demande et mise en cache. */
export function useWindguru(spot: Spot) {
  const id = windguruIdOf(spot)
  const [state, setState] = useState<{ id: number; fc?: WgForecast; error?: string } | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    getWindguru(id)
      .then((fc) => alive && setState({ id, fc }))
      .catch((e: Error) => alive && setState({ id, error: e.message }))
    return () => {
      alive = false
    }
  }, [id])

  const cur = state && state.id === id ? state : null
  return { id, fc: cur?.fc ?? null, error: cur?.error ?? null }
}
