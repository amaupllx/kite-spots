import { useEffect, useRef, useState } from 'react'
import type { Spot } from '../types'
import { useI18n } from '../i18n'

const STORAGE_KEY = 'kite.windguruIds'

function readOverrides(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function writeOverride(spotId: string, id: number | null) {
  const all = readOverrides()
  if (id === null) delete all[spotId]
  else all[spotId] = id
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* stockage indisponible */
  }
}

interface Props {
  spot: Spot
  /** Jour affiché (YYYY-MM-DD) : le widget s'arrête à la fin de ce jour. */
  date: string
  /** Heures de jour [début, fin) pour limiter les colonnes affichées. */
  fromHour: number
  toHour: number
}

/** Nombre d'heures de prévision entre maintenant et la fin du jour `date` (heure locale). */
function hoursUntilEndOf(date: string) {
  const end = new Date(`${date}T23:59:59`).getTime()
  return Math.max(1, Math.ceil((end - Date.now()) / 3600_000))
}

/**
 * Widget officiel Windguru (« Add to your website ») : le script widget.php insère une iframe
 * juste après l'élément dont l'id vaut `uid`. On le monte à la main dans un conteneur que
 * React ne gère pas, et on vide ce conteneur quand le spot, le jour ou la langue changent.
 * Windguru ne permet pas de choisir le jour de départ : on coupe à la fin du jour choisi
 * (fhours) et on ne garde que les heures de jour (odh / doh).
 */
export function WindguruWidget({ spot, date, fromHour, toHour }: Props) {
  const { t, lang } = useI18n()
  const [override, setOverride] = useState<number | null>(() => readOverrides()[spot.id] ?? null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const id = override ?? spot.windguru ?? null

  useEffect(() => {
    const el = ref.current
    if (!el || !id) return
    el.replaceChildren()
    const uid = `wg_fwdg_${id}_100_${Date.now()}`
    const anchor = document.createElement('span')
    anchor.id = uid
    el.appendChild(anchor)
    const args = [
      `s=${id}`,
      'm=100',
      `uid=${uid}`,
      'wj=knots',
      'tj=c',
      'waj=m',
      'tij=cm',
      `odh=${fromHour}`,
      `doh=${toHour}`,
      `fhours=${hoursUntilEndOf(date)}`,
      'hrsm=1',
      'vt=forecasts',
      `lng=${lang}`,
      'idbs=1',
      'p=WINDSPD,GUST,SMER,TMP,APCP1s,RATING',
    ]
    const script = document.createElement('script')
    script.src = `https://www.windguru.cz/js/widget.php?${args.join('&')}`
    script.async = true
    el.appendChild(script)
    return () => el.replaceChildren()
  }, [id, lang, date, fromHour, toHour])

  function save(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(draft.trim().replace(/\D/g, ''))
    if (n > 0) {
      writeOverride(spot.id, n)
      setOverride(n)
    }
    setEditing(false)
  }

  function reset() {
    writeOverride(spot.id, null)
    setOverride(null)
    setEditing(false)
  }

  return (
    <section className="wg">
      <div className="wg-head">
        <h4>{t('wg.title')}</h4>
        {id && (
          <a href={`https://www.windguru.cz/${id}`} target="_blank" rel="noreferrer" className="small">
            {t('wg.open', { id })}
          </a>
        )}
        <button type="button" className="link small" onClick={() => (setDraft(id ? String(id) : ''), setEditing((v) => !v))}>
          {t('wg.edit')}
        </button>
      </div>

      {override !== null ? (
        <p className="muted small">{t('wg.custom')}</p>
      ) : spot.windguruApprox ? (
        <p className="warn small">{t('wg.approx', { name: spot.windguruApprox })}</p>
      ) : null}

      {editing && (
        <form className="row wg-form" onSubmit={save}>
          <input inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('wg.idLabel')} aria-label={t('wg.idLabel')} />
          <button className="btn primary">{t('wg.save')}</button>
          {override !== null && (
            <button type="button" className="btn" onClick={reset}>
              {t('wg.reset')}
            </button>
          )}
        </form>
      )}

      {id ? <div ref={ref} className="wg-frame" /> : <p className="muted small">{t('wg.none')}</p>}
    </section>
  )
}
