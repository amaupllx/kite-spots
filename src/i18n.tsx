import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'fr' | 'en'

const fr = {
  'app.tagline': 'Où rider cette semaine ?',
  'tab.spots': 'Spots',
  'tab.profile': 'Profil',

  'day.today': "Aujourd'hui",
  'day.tomorrow': 'Demain',
  'day.week': 'Semaine',
  'day.range': 'Période',
  'range.from': 'Du',
  'range.to': 'au',

  'filters.radius': 'Rayon',
  'filters.unlimited': 'illimité',
  'filters.maxTravel': 'Trajet max',
  'filters.favOnly': 'Favoris uniquement',
  'filters.showAll': 'Afficher les spots non praticables',
  'filters.kites': 'ailes',
  'filters.none': 'aucune',

  'notice.noAddress': 'Configure ton adresse de départ dans le {link} pour calculer les temps de trajet.',
  'notice.profileLink': 'profil',
  'error.weather': 'Impossible de charger la météo : {msg}',
  'error.routing': 'Routage indisponible ({msg}) — temps de trajet estimés.',
  'loading': 'Chargement des prévisions…',

  'count.day': '{n} spot(s) praticable(s) sur {total} à portée · {date}',
  'count.range': '{n} meilleures sessions de 3 h · {spots} spot(s) sur {total} · {from} → {to}',
  'empty.day': 'Aucun spot praticable ce jour-là dans ta zone.',
  'empty.range': 'Aucune session de 3 h praticable sur cette période dans ta zone.',
  'empty.hint': 'Essaie un autre jour, élargis le trajet max ou coche « Afficher les spots non praticables ».',
  'empty.hintRange': 'Élargis la période ou le trajet max.',
  'more': 'Afficher plus de sessions',
  'footer':
    'Météo : Open-Meteo (modèles MétéoSuisse ICON-CH) · Eau : Alplakes / Eawag · Trajets : OSRM · Cartes : © OpenStreetMap. Les notes sont indicatives : vérifie toujours les conditions et la réglementation locale sur place.',

  'summary.nodata': 'Pas de données',
  'summary.nowind': 'Pas assez de vent (max {max} nds)',
  'summary.notrideable': 'Conditions non praticables',
  'summary.ok': '{start}h–{end}h · {wind} nds {dir}',
  'unit.kn': 'nds',

  'travel.road': 'Trajet en voiture (OSRM)',
  'travel.estimated': "Estimation à vol d'oiseau (routage indisponible)",
  'fact.air': 'Air',
  'fact.water': 'Eau',
  'fact.rainMax': 'Pluie max',
  'fact.daylight': 'Jour',
  'fact.level': 'Niveau spot',
  'fact.kite': 'Aile conseillée',
  'fact.kiteNone': 'aucune adaptée',
  'fact.kiteIdeal': 'Taille théorique ≈ {size} m²',
  'water.alplakes': 'Alplakes (Eawag)',
  'water.today': "valeur d'aujourd'hui (simulation non dispo pour ce jour)",
  'water.estimate': 'Estimation – moyenne saisonnière',
  'link.route': 'Itinéraire ↗',

  'table.hour': 'Heure',
  'table.wind': 'Vent',
  'table.gust': 'Rafales',
  'table.dir': 'Dir.',
  'table.kite': 'Aile',
  'table.air': 'Air',
  'table.rain': 'Pluie',
  'table.score': 'Note',
  'table.none': 'Pas de prévisions horaires.',
  'legend.prefix': 'Vent en nœuds · aile choisie parmi les tiennes ·',
  'legend.ideal': 'idéale',
  'legend.over': 'surtoilé',
  'legend.under': 'sous-toilé',
  'legend.suffix': '· lignes surlignées = meilleure fenêtre',

  'warn.dir': 'Direction {dir} défavorable',
  'warn.tooStrong': 'Trop fort pour ton niveau',
  'warn.storm': "Risque d'orage",
  'warn.veryGusty': 'Très rafaleux',
  'warn.gusty': 'Rafaleux',
  'warn.hardSpot': 'Spot exigeant pour ton niveau',

  'fav.add': 'Ajouter aux favoris',
  'fav.remove': 'Retirer des favoris',
  'map.start': 'Départ',
  'map.notRideable': 'non praticable',
  'stars': 'Note {score} sur 5',
  'wind.from': 'Vent de {dir}',

  'level.debutant': 'Débutant',
  'level.intermediaire': 'Intermédiaire',
  'level.avance': 'Avancé',
  'board.twintip': 'Twintip',
  'board.surf': 'Surf / directionnelle',
  'board.foil': 'Foil',

  'profile.title': 'Mon profil',
  'profile.name': 'Prénom',
  'profile.optional': 'optionnel',
  'profile.weight': 'Poids (kg)',
  'profile.level': 'Niveau',
  'profile.board': 'Planche',
  'profile.maxTravel': 'Temps de trajet max',
  'profile.address': 'Adresse de départ',
  'profile.addressPh': 'Rue, NPA, localité…',
  'profile.search': 'Rechercher',
  'profile.searching': 'Recherche…',
  'profile.noResult': 'Aucune adresse trouvée.',
  'profile.kites': 'Mes ailes',
  'profile.kitesHint': 'Seules ces tailles sont proposées dans les recommandations.',
  'profile.kitePh': 'Autre taille, ex. 10.5',
  'profile.add': 'Ajouter',
  'profile.needKite': 'Ajoute au moins une aile.',
  'profile.favorites': 'Spots favoris',
  'profile.done': 'Voir les spots →',
  'filters.mode': 'Trajet',
  'mode.car': '🚗 Voiture',
  'mode.transit': '🚆 Transports publics',
  'filters.carBased': 'Le filtre « trajet max » se base sur le temps en voiture.',
  'transit.title': 'Transports publics',
  'transit.target': 'Arrivée visée entre {from} et {to} (session à {start}h)',
  'transit.loading': 'Recherche des correspondances…',
  'transit.none': "Aucune correspondance n'arrive dans ce créneau.",
  'transit.fallback': 'Alternative la plus proche :',
  'transit.noSession': "Pas de session ce jour-là : pas de recherche d'horaire.",
  'transit.noHome': 'Renseigne ton adresse dans le profil pour chercher les horaires.',
  'transit.error': 'Horaires indisponibles ({msg}).',
  'transit.transfers': '{n} correspondance(s)',
  'transit.direct': 'direct',
  'transit.walk': 'Marche',
  'transit.early': "{min} min d'avance",
  'transit.source': 'Horaires : transport.opendata.ch',
}

export type Key = keyof typeof fr

const en: Record<Key, string> = {
  'app.tagline': 'Where to ride this week?',
  'tab.spots': 'Spots',
  'tab.profile': 'Profile',

  'day.today': 'Today',
  'day.tomorrow': 'Tomorrow',
  'day.week': 'Week',
  'day.range': 'Date range',
  'range.from': 'From',
  'range.to': 'to',

  'filters.radius': 'Radius',
  'filters.unlimited': 'unlimited',
  'filters.maxTravel': 'Max drive',
  'filters.favOnly': 'Favourites only',
  'filters.showAll': 'Show non-rideable spots',
  'filters.kites': 'kites',
  'filters.none': 'none',

  'notice.noAddress': 'Set your home address in your {link} to compute travel times.',
  'notice.profileLink': 'profile',
  'error.weather': 'Could not load the forecast: {msg}',
  'error.routing': 'Routing unavailable ({msg}) — travel times are estimates.',
  'loading': 'Loading forecasts…',

  'count.day': '{n} rideable spot(s) out of {total} in range · {date}',
  'count.range': '{n} best 3-hour sessions · {spots} spot(s) out of {total} · {from} → {to}',
  'empty.day': 'No rideable spot in your area that day.',
  'empty.range': 'No rideable 3-hour session in your area over this period.',
  'empty.hint': 'Try another day, increase the max drive or tick "Show non-rideable spots".',
  'empty.hintRange': 'Widen the period or increase the max drive.',
  'more': 'Show more sessions',
  'footer':
    'Weather: Open-Meteo (MeteoSwiss ICON-CH models) · Water: Alplakes / Eawag · Routing: OSRM · Maps: © OpenStreetMap. Ratings are indicative: always check conditions and local regulations on site.',

  'summary.nodata': 'No data',
  'summary.nowind': 'Not enough wind (max {max} kn)',
  'summary.notrideable': 'Not rideable',
  'summary.ok': '{start}:00–{end}:00 · {wind} kn {dir}',
  'unit.kn': 'kn',

  'travel.road': 'Driving time (OSRM)',
  'travel.estimated': 'Straight-line estimate (routing unavailable)',
  'fact.air': 'Air',
  'fact.water': 'Water',
  'fact.rainMax': 'Max rain',
  'fact.daylight': 'Daylight',
  'fact.level': 'Spot level',
  'fact.kite': 'Suggested kite',
  'fact.kiteNone': 'none suitable',
  'fact.kiteIdeal': 'Theoretical size ≈ {size} m²',
  'water.alplakes': 'Alplakes (Eawag)',
  'water.today': "today's value (no simulation for that day)",
  'water.estimate': 'Estimate – seasonal average',
  'link.route': 'Directions ↗',

  'table.hour': 'Time',
  'table.wind': 'Wind',
  'table.gust': 'Gusts',
  'table.dir': 'Dir.',
  'table.kite': 'Kite',
  'table.air': 'Air',
  'table.rain': 'Rain',
  'table.score': 'Score',
  'table.none': 'No hourly forecast.',
  'legend.prefix': 'Wind in knots · kite picked from your quiver ·',
  'legend.ideal': 'ideal',
  'legend.over': 'overpowered',
  'legend.under': 'underpowered',
  'legend.suffix': '· highlighted rows = best window',

  'warn.dir': 'Unfavourable {dir} direction',
  'warn.tooStrong': 'Too strong for your level',
  'warn.storm': 'Thunderstorm risk',
  'warn.veryGusty': 'Very gusty',
  'warn.gusty': 'Gusty',
  'warn.hardSpot': 'Demanding spot for your level',

  'fav.add': 'Add to favourites',
  'fav.remove': 'Remove from favourites',
  'map.start': 'Home',
  'map.notRideable': 'not rideable',
  'stars': 'Rated {score} out of 5',
  'wind.from': 'Wind from {dir}',

  'level.debutant': 'Beginner',
  'level.intermediaire': 'Intermediate',
  'level.avance': 'Advanced',
  'board.twintip': 'Twin-tip',
  'board.surf': 'Surfboard / directional',
  'board.foil': 'Foil',

  'profile.title': 'My profile',
  'profile.name': 'First name',
  'profile.optional': 'optional',
  'profile.weight': 'Weight (kg)',
  'profile.level': 'Level',
  'profile.board': 'Board',
  'profile.maxTravel': 'Max driving time',
  'profile.address': 'Home address',
  'profile.addressPh': 'Street, postcode, town…',
  'profile.search': 'Search',
  'profile.searching': 'Searching…',
  'profile.noResult': 'No address found.',
  'profile.kites': 'My kites',
  'profile.kitesHint': 'Only these sizes are used in recommendations.',
  'profile.kitePh': 'Other size, e.g. 10.5',
  'profile.add': 'Add',
  'profile.needKite': 'Add at least one kite.',
  'profile.favorites': 'Favourite spots',
  'profile.done': 'See spots →',
  'filters.mode': 'Travel',
  'mode.car': '🚗 Car',
  'mode.transit': '🚆 Public transport',
  'filters.carBased': 'The max-drive filter is based on driving time.',
  'transit.title': 'Public transport',
  'transit.target': 'Target arrival between {from} and {to} (session at {start}:00)',
  'transit.loading': 'Looking up connections…',
  'transit.none': 'No connection arrives in that time slot.',
  'transit.fallback': 'Closest alternative:',
  'transit.noSession': 'No session that day: no timetable lookup.',
  'transit.noHome': 'Set your address in your profile to look up timetables.',
  'transit.error': 'Timetable unavailable ({msg}).',
  'transit.transfers': '{n} transfer(s)',
  'transit.direct': 'direct',
  'transit.walk': 'Walk',
  'transit.early': '{min} min early',
  'transit.source': 'Timetables: transport.opendata.ch',
}

const DICTS: Record<Lang, Record<Key, string>> = { fr, en }

// Points cardinaux : seuls ceux contenant « O » (ouest) changent en anglais.
const DIR_EN: Record<string, string> = { SSO: 'SSW', SO: 'SW', OSO: 'WSW', O: 'W', ONO: 'WNW', NO: 'NW', NNO: 'NNW' }

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  locale: string
  t: (key: Key, params?: Record<string, string | number>) => string
  dir: (label: string) => string
}

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('kite.lang')
      if (saved === 'fr' || saved === 'en') return saved
    } catch {
      /* stockage indisponible */
    }
    return navigator.language.startsWith('fr') ? 'fr' : 'en'
  })

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('kite.lang', lang)
    } catch {
      /* stockage indisponible */
    }
  }, [lang])

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang]
    return {
      lang,
      setLang,
      locale: lang === 'fr' ? 'fr-CH' : 'en-GB',
      t: (key, params) => {
        let s = dict[key]
        if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
        // Pluriels simples « spot(s) » selon {n}.
        const n = params && typeof params.n === 'number' ? params.n : null
        return s.replace(/\(s\)/g, n === null || n > 1 ? 's' : '')
      },
      dir: (label) => (lang === 'en' ? (DIR_EN[label] ?? label) : label),
    }
  }, [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n hors de I18nProvider')
  return v
}
