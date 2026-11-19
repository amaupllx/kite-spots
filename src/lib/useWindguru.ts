import { useEffect, useState } from 'react'
import type { Spot } from '../types'
import { HAS_PROXY } from '../config'
import { getWindguruLimits, windguruIdOf, type WgLimits } from '../services/windguru'

/** Seuils d'étoiles Windguru du spot, chargés à la demande et mis en cache. */
export function useWindguru(spot: Spot) {
  const id = windguruIdOf(spot)
  const [state, setState] = useState<{ id: number; limits?: WgLimits; error?: string } | null>(null)

  useEffect(() => {
    // Étoiles Windguru uniquement en local : l'API interne exige le relais de Vite.
    if (!id || !HAS_PROXY) return
    let alive = true
    getWindguruLimits(id)
      .then((limits) => alive && setState({ id, limits }))
      .catch((e: Error) => alive && setState({ id, error: e.message }))
    return () => {
      alive = false
    }
  }, [id])

  const cur = state && state.id === id ? state : null
  return { id, limits: cur?.limits ?? null, error: cur?.error ?? null }
}
