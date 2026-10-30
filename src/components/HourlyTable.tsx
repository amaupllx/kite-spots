import type { DayRating, Impact } from '../types'
import { wgAt, type WgForecast } from '../services/windguru'
import { useI18n } from '../i18n'
import { dirLabel } from '../lib/geo'
import { scoreClass, windClass } from '../lib/classes'
import { WindArrow } from './ui'

export function HourlyTable({ rating, wg, showImpact = false }: { rating: DayRating; wg?: WgForecast | null; showImpact?: boolean }) {
  const { t, dir } = useI18n()
  if (rating.hours.length === 0) return <p className="muted">{t('table.none')}</p>
  return (
    <>
    <div className="table-wrap">
      <table className="hourly">
        <thead>
          <tr>
            <th>{t('table.hour')}</th>
            <th className="t-score">{t('table.score')}</th>
            <th>{t('table.wind')}</th>
            <th>{t('table.gust')}</th>
            <th>{t('table.dir')}</th>
            <th>{t('table.kite')}</th>
            <th>{t('table.air')}</th>
            <th>{t('table.rain')}</th>
            {wg && <th title={wg.modelName}>{t('wg.col')}</th>}
          </tr>
        </thead>
        <tbody>
          {rating.hours.map((r) => {
            const inWin = rating.window && r.hour.hour >= rating.window.start && r.hour.hour < rating.window.end
            const imp = (c: keyof typeof r.impacts) => (showImpact ? <ImpactTag value={r.impacts[c]} /> : null)
            const title = r.warnings.map((w) => t(`warn.${w}`, { dir: dir(dirLabel(r.hour.dir)) })).join(' · ')
            return (
              <tr key={r.hour.time} className={inWin ? 'in-window' : ''} title={title}>
                <td className="t-hour">{r.hour.hour}h</td>
                <td className="t-score">
                  <span className={`score-dot ${scoreClass(r.score)}`}>{r.rideable ? r.score.toFixed(1) : '✕'}</span>
                  {showImpact && typeof r.impacts.level === 'number' && r.impacts.level !== 0 && (
                    <span title={t('crit.level')}><ImpactTag value={r.impacts.level} /></span>
                  )}
                </td>
                <td><span className={`wpill ${windClass(r.hour.wind)}`}>{Math.round(r.hour.wind)}</span>{imp('wind')}</td>
                <td><span className={`wpill ${windClass(r.hour.gust)}`}>{Math.round(r.hour.gust)}</span>{imp('gust')}</td>
                <td className={`dir-${r.dirOk}`}><WindArrow dir={r.hour.dir} />{imp('dir')}</td>
                <td>
                  {r.rideable && r.kite.owned ? (
                    <span className={`kite-tag fit-${r.kite.fit}`}>{r.kite.owned} m²</span>
                  ) : (
                    <span className="muted small" title={t('fact.kiteIdeal', { size: r.kite.ideal.toFixed(1) })}>—</span>
                  )}
                  {imp('kite')}
                </td>
                <td>{Math.round(r.hour.temp)}°{imp('temp')}</td>
                <td className={r.hour.rainProb >= 50 ? 'rain-high' : ''}>
                  {r.hour.rainProb}%{r.hour.rain > 0.1 ? <span className="muted small"> {r.hour.rain.toFixed(1)}mm</span> : null}
                  {imp('rain')}
                </td>
                {wg && <WgCell stars={wgAt(wg, rating.date, r.hour.hour)?.stars ?? null} />}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
      <p className="legend small muted">
        {t('legend.prefix')} <span className="fit-ideal kite-tag">{t('legend.ideal')}</span>{' '}
        <span className="fit-surtoile kite-tag">{t('legend.over')}</span>{' '}
        <span className="fit-soustoile kite-tag">{t('legend.under')}</span> {t('legend.suffix')}
      </p>
      {showImpact && <p className="legend small muted">{t('legend.impact')}</p>}
    </>
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

function ImpactTag({ value }: { value: Impact | undefined }) {
  if (value === undefined) return null
  if (value === 'block') return <span className="impact block">✕</span>
  const v = Math.round(value * 10) / 10
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
  return <span className={`impact ${cls}`}>{v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0'}</span>
}
