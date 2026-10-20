import type { DayRating } from '../types'
import { scoreClass, windClass } from '../lib/classes'
import { WindArrow } from './ui'

export function HourlyTable({ rating }: { rating: DayRating }) {
  if (rating.hours.length === 0) return <p className="muted">Pas de prévisions horaires.</p>
  return (
    <div className="table-wrap">
      <table className="hourly">
        <thead>
          <tr>
            <th>Heure</th>
            <th>Vent</th>
            <th>Rafales</th>
            <th>Dir.</th>
            <th>Aile</th>
            <th>Air</th>
            <th>Pluie</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rating.hours.map((r) => {
            const inWin = rating.window && r.hour.hour >= rating.window.start && r.hour.hour < rating.window.end
            return (
              <tr key={r.hour.time} className={inWin ? 'in-window' : ''} title={r.warnings.join(' · ')}>
                <td className="t-hour">{r.hour.hour}h</td>
                <td><span className={`wpill ${windClass(r.hour.wind)}`}>{Math.round(r.hour.wind)}</span></td>
                <td><span className={`wpill ${windClass(r.hour.gust)}`}>{Math.round(r.hour.gust)}</span></td>
                <td className={`dir-${r.dirOk}`}><WindArrow dir={r.hour.dir} /></td>
                <td>
                  {r.rideable && r.kite.owned ? (
                    <span className={`kite-tag fit-${r.kite.fit}`}>{r.kite.owned} m²</span>
                  ) : (
                    <span className="muted small" title={`Idéal ≈ ${r.kite.ideal.toFixed(1)} m²`}>—</span>
                  )}
                </td>
                <td>{Math.round(r.hour.temp)}°</td>
                <td className={r.hour.rainProb >= 50 ? 'rain-high' : ''}>
                  {r.hour.rainProb}%{r.hour.rain > 0.1 ? <span className="muted small"> {r.hour.rain.toFixed(1)}mm</span> : null}
                </td>
                <td><span className={`score-dot ${scoreClass(r.score)}`}>{r.rideable ? r.score.toFixed(1) : '✕'}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="legend small muted">
        Vent en nœuds · aile choisie parmi les tiennes · <span className="fit-ideal kite-tag">idéale</span>{' '}
        <span className="fit-surtoile kite-tag">surtoilé</span> <span className="fit-soustoile kite-tag">sous-toilé</span> · lignes
        surlignées = meilleure fenêtre
      </p>
    </div>
  )
}
