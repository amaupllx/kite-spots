import { useState } from 'react'
import type { Board, Level, Place, Profile } from '../types'
import { useI18n } from '../i18n'
import { searchAddress } from '../services/geocode'
import { SPOTS } from '../data/spots'
import { HeartButton } from './ui'

interface Props {
  profile: Profile
  onChange: (p: Profile) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onDone: () => void
}

const LEVELS: Level[] = ['debutant', 'intermediaire', 'avance']
const BOARDS: Board[] = ['twintip', 'surf', 'foil']
const COMMON_SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]

export function ProfilePage({ profile, onChange, favorites, onToggleFavorite, onDone }: Props) {
  const { t, lang } = useI18n()
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v })
  const [query, setQuery] = useState(profile.address?.label ?? '')
  const [results, setResults] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKite, setNewKite] = useState('')

  async function doSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const r = await searchAddress(query.trim(), lang)
      setResults(r)
      if (r.length === 0) setError(t('profile.noResult'))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  function toggleKite(size: number) {
    const has = profile.kites.includes(size)
    set('kites', has ? profile.kites.filter((k) => k !== size) : [...profile.kites, size].sort((a, b) => a - b))
  }

  function addKite(e: React.FormEvent) {
    e.preventDefault()
    const v = Math.round(Number(newKite.replace(',', '.')) * 10) / 10
    if (v >= 2 && v <= 25 && !profile.kites.includes(v)) set('kites', [...profile.kites, v].sort((a, b) => a - b))
    setNewKite('')
  }

  const sizes = [...new Set([...COMMON_SIZES, ...profile.kites])].sort((a, b) => a - b)

  return (
    <div className="profile">
      <section className="card form-card">
        <h2>{t('profile.title')}</h2>
        <div className="grid2">
          <label className="field">
            <span>{t('profile.name')}</span>
            <input value={profile.name} onChange={(e) => set('name', e.target.value)} placeholder={t('profile.optional')} />
          </label>
          <label className="field">
            <span>{t('profile.weight')}</span>
            <input type="number" min={30} max={150} value={profile.weight} onChange={(e) => set('weight', Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span>{t('profile.level')}</span>
            <select value={profile.level} onChange={(e) => set('level', e.target.value as Level)}>
              {LEVELS.map((k) => <option key={k} value={k}>{t(`level.${k}`)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('profile.board')}</span>
            <select value={profile.board} onChange={(e) => set('board', e.target.value as Board)}>
              {BOARDS.map((k) => <option key={k} value={k}>{t(`board.${k}`)}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>{t('profile.maxTravel')} : <strong>{profile.maxTravelMin} min</strong></span>
          <input type="range" min={15} max={300} step={15} value={profile.maxTravelMin} onChange={(e) => set('maxTravelMin', Number(e.target.value))} />
        </label>
      </section>

      <section className="card form-card">
        <h2>{t('profile.address')}</h2>
        <form className="row" onSubmit={doSearch}>
          <input className="grow" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('profile.addressPh')} />
          <button className="btn primary" disabled={searching}>{searching ? t('profile.searching') : t('profile.search')}</button>
        </form>
        {error && <p className="error small">{error}</p>}
        {results && results.length > 0 && (
          <ul className="results">
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => {
                    set('address', r)
                    setQuery(r.label)
                    setResults(null)
                  }}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {profile.address && (
          <p className="current-address">📍 {profile.address.label}</p>
        )}
      </section>

      <section className="card form-card">
        <h2>{t('profile.kites')}</h2>
        <p className="muted small">{t('profile.kitesHint')}</p>
        <div className="chips">
          {sizes.map((s) => (
            <button key={s} type="button" className={`chip ${profile.kites.includes(s) ? 'on' : ''}`} onClick={() => toggleKite(s)}>
              {s} m²
            </button>
          ))}
        </div>
        <form className="row" onSubmit={addKite}>
          <input inputMode="decimal" value={newKite} onChange={(e) => setNewKite(e.target.value)} placeholder={t('profile.kitePh')} />
          <button className="btn">{t('profile.add')}</button>
        </form>
        {profile.kites.length === 0 && <p className="error small">{t('profile.needKite')}</p>}
      </section>

      <section className="card form-card">
        <h2>{t('profile.favorites')}</h2>
        <ul className="fav-list">
          {SPOTS.map((s) => (
            <li key={s.id}>
              <HeartButton active={favorites.includes(s.id)} onClick={() => onToggleFavorite(s.id)} />
              <span>{s.name}</span>
              <span className="muted small">{s.lake}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="profile-actions">
        <button className="btn primary big" onClick={onDone} disabled={!profile.address || profile.kites.length === 0}>
          {t('profile.done')}
        </button>
      </div>
    </div>
  )
}
