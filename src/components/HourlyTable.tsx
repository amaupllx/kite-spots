import type { DayRating } from '../types'
import { wgAt, type WgForecast } from '../services/windguru'
import { useI18n } from '../i18n'
import { dirLabel } from '../lib/geo'
import { scoreClass, windClass } from '../lib/classes'
import { WindArrow } from './ui'

export function HourlyTable({ rating, wg }: { rating: DayRating; wg?: WgForecast | null }) {
  const { t, dir } = useI18n()
  if (rating.hours.length === 0) return <p className="muted">{t('table.none')}</p>
  return (
    <div className="table-wrap">
      <table className="hourly">
        <thead>
          <tr>
            <th>{t('table.hour')}</th>
            <th>{t('table.wind')}</th>
            <th>{t('table.gust')}</th>
            <th>{t('table.dir')}</th>
            <th>{t('table.kite')}</th>
            <th>{t('table.air')}</th>
            <th>{t('table.rain')}</th>
            <th>{t('table.score')}</th>
            {wg && <th title={wg.modelName}>{t('wg.col')}</th>}
          </tr>
        </thead>
        <tbody>
          {rating.hours.map((r) => {
            const inWin = rating.window && r.hour.hour >= rating.window.start && r.hour.hour < rating.window.end
            const title = r.warnings.map((w) => t(`warn.${w}`, { dir: dir(dirLabel(r.hour.dir)) })).join(' · ')
            return (
              <tr key={r.hour.time} className={inWin ? 'in-window' : ''} title={title}>
                <td className="t-hour">{r.hour.hour}h</td>
                <td><span className={`wpill ${windClass(r.hour.wind)}`}>{Math.round(r.hour.wind)}</span></td>
                <td><span className={`wpill ${windClass(r.hour.gust)}`}>{Math.round(r.hour.gust)}</span></td>
                <td className={`dir-${r.dirOk}`}><WindArrow dir={r.hour.dir} /></td>
                <td>
                  {r.rideable && r.kite.owned ? (
                    <span className={`kite-tag fit-${r.kite.fit}`}>{r.kite.owned} m²</span>
                  ) : (
                    <span className="muted small" title={t('fact.kiteIdeal', { size: r.kite.ideal.toFixed(1) })}>—</span>
                  )}
                </td>
                <td>{Math.round(r.hour.temp)}°</td>
                <td className={r.hour.rainProb >= 50 ? 'rain-high' : ''}>
                  {r.hour.rainProb}%{r.hour.rain > 0.1 ? <span className="muted small"> {r.hour.rain.toFixed(1)}mm</span> : null}
                </td>
                <td><span className={`score-dot ${scoreClass(r.score)}`}>{r.rideable ? r.score.toFixed(1) : '✕'}</span></td>
                {wg && <WgCell stars={wgAt(wg, rating.date, r.hour.hour)?.stars ?? null} />}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="legend small muted">
        {t('legend.prefix')} <span className="fit-ideal kite-tag">{t('legend.ideal')}</span>{' '}
        <span className="fit-surtoile kite-tag">{t('legend.over')}</span>{' '}
        <span className="fit-soustoile kite-tag">{t('legend.under')}</span> {t('legend.suffix')}
      </p>
    </div>
  )
}

function WgCell({ stars }: { stars: number | null }) {
  if (stars === null) return <td className="muted">–</td>
  return (
    <td className="wg-cell" title={`${stars} / 3`}>
      <span className="wg-on">{'★'.repeat(stars)}</span>
      <span className="wg-off">{'★'.repeat(3 - stars)}</span>
    </td>
  )
}
