import { useEffect, useState } from 'react'
import type { Spot } from '../types'
import { WG_ID_EVENT, getWindguru, windguruIdOf, type WgForecast } from '../services/windguru'

/** Prévision Windguru (étoiles) du spot, chargée à la demande et mise en cache. */
export function useWindguru(spot: Spot) {
  const [id, setId] = useState(() => windguruIdOf(spot))
  const [state, setState] = useState<{ id: number; fc?: WgForecast; error?: string } | null>(null)

  useEffect(() => {
    const onChange = () => setId(windguruIdOf(spot))
    onChange()
    window.addEventListener(WG_ID_EVENT, onChange)
    return () => window.removeEventListener(WG_ID_EVENT, onChange)
  }, [spot])

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
