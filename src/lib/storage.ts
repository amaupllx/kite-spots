import { useEffect, useState } from 'react'
import type { Profile } from '../types'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? ({ ...initial, ...JSON.parse(raw) } as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* stockage indisponible */
    }
  }, [key, value])
  return [value, setValue] as const
}

export function useLocalList(key: string) {
  const [value, setValue] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* stockage indisponible */
    }
  }, [key, value])
  return [value, setValue] as const
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  weight: 75,
  level: 'intermediaire',
  board: 'twintip',
  kites: [9, 12],
  maxTravelMin: 90,
  address: null,
  transport: 'car',
}
