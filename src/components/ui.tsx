import { dirLabel } from '../lib/geo'

export function Stars({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const pct = (Math.max(0, Math.min(5, score)) / 5) * 100
  return (
    <span className={`stars stars-${size}`} title={`${score.toFixed(1)} / 5`} aria-label={`Note ${score.toFixed(1)} sur 5`}>
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  )
}

/** Flèche dans le sens où le vent souffle (direction météo + 180°). */
export function WindArrow({ dir }: { dir: number }) {
  return (
    <span className="wind-arrow" title={`Vent de ${dirLabel(dir)} (${Math.round(dir)}°)`}>
      <svg viewBox="0 0 24 24" width="16" height="16" style={{ transform: `rotate(${dir + 180}deg)` }} aria-hidden>
        <path d="M12 3 L18 15 L12 12 L6 15 Z" fill="currentColor" />
      </svg>
      <span>{dirLabel(dir)}</span>
    </span>
  )
}

export function HeartButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`icon-btn fav ${active ? 'active' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-pressed={active}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  )
}
