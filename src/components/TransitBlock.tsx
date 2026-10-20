import { useEffect, useState } from 'react'
import type { Place, Spot } from '../types'
import { useI18n } from '../i18n'
import { formatDuration } from '../lib/geo'
import { findTransit, type TransitResult, type TransitTrip } from '../services/transit'

interface Props {
  home: Place | null
  spot: Spot
  date: string
  startHour: number | null
}

export function TransitBlock({ home, spot, date, startHour }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState<{ key: string; result?: TransitResult; error?: string } | null>(null)
  const key = `${spot.id}|${date}|${startHour}`

  useEffect(() => {
    if (!home || startHour === null) return
    let alive = true
    findTransit(home, spot, date, startHour)
      .then((result) => alive && setState({ key, result }))
      .catch((e: Error) => alive && setState({ key, error: e.message }))
    return () => {
      alive = false
    }
  }, [home, spot, date, startHour, key])

  const cur = state?.key === key ? state : null

  return (
    <section className="transit">
      <h4>🚆 {t('transit.title')}</h4>
      {!home ? (
        <p className="muted small">{t('transit.noHome')}</p>
      ) : startHour === null ? (
        <p className="muted small">{t('transit.noSession')}</p>
      ) : !cur ? (
        <p className="muted small">{t('transit.loading')}</p>
      ) : cur.error ? (
        <p className="error small">{t('transit.error', { msg: cur.error })}</p>
      ) : (
        <>
          <p className="muted small">
            {t('transit.target', { from: cur.result!.windowFrom, to: cur.result!.windowTo, start: startHour })}
          </p>
          {cur.result!.options.map((trip, i) => (
            <Trip key={i} trip={trip} startHour={startHour} primary={i === 0} />
          ))}
          {cur.result!.options.length === 0 && (
            <>
              <p className="warn small">{t('transit.none')}</p>
              {cur.result!.fallback && (
                <>
                  <p className="muted small">{t('transit.fallback')}</p>
                  <Trip trip={cur.result!.fallback} startHour={startHour} primary={false} />
                </>
              )}
            </>
          )}
          <p className="muted tiny">{t('transit.source')}</p>
        </>
      )}
    </section>
  )
}

function Trip({ trip, startHour, primary }: { trip: TransitTrip; startHour: number; primary: boolean }) {
  const { t } = useI18n()
  const early = startHour * 60 - trip.arrMin
  return (
    <div className={`trip ${primary ? 'primary' : ''}`}>
      <div className="trip-head">
        <strong>{trip.dep} → {trip.arr}</strong>
        <span>{formatDuration(trip.durationMin)}</span>
        <span className="muted">{trip.transfers === 0 ? t('transit.direct') : t('transit.transfers', { n: trip.transfers })}</span>
        {early > 0 && <span className="early">{t('transit.early', { min: early })}</span>}
      </div>
      <ol className="legs">
        {trip.legs.map((l, i) => (
          <li key={i} className={l.kind}>
            <span className="leg-line">{l.kind === 'walk' ? `🚶 ${t('transit.walk')}` : l.line}</span>
            <span className="leg-detail">
              {l.dep} {l.from} → {l.arr} {l.to}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
