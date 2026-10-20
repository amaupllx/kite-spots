# KiteSpots CH 🪁

Application web locale (React + TypeScript + Vite) pour savoir, depuis ton adresse en Suisse,
quels spots de kite sont praticables pour chaque jour des 7 prochains jours.

## Fonctionnalités

- **Profil utilisateur** (stocké dans le navigateur) : poids, niveau, type de planche, liste des
  ailes possédées, temps de trajet max, adresse de départ (géocodée).
- **Sélection du jour** (aujourd'hui → J+6) et **rayon** optionnel autour de l'adresse.
- **Temps de trajet** en voiture vers chaque spot (OSRM), filtrés par le trajet max.
- **Note /5** par spot et par heure : force du vent, direction vs orientation du spot,
  rafales, pluie, orage, niveau requis.
- **Taille d'aile conseillée** choisie **uniquement parmi tes ailes** (règle poids × k / vent,
  k selon la planche), avec indication idéale / surtoilé / sous-toilé.
- **Détail horaire (heures de jour uniquement)** : vent moyen, rafales, direction, aile,
  température de l'air, probabilité et cumul de pluie.
- **Température de l'eau** : simulations Alplakes (Eawag) pour les lacs couverts,
  sinon estimation saisonnière.
- **Spots favoris** et carte interactive (Leaflet / OpenStreetMap).

## Lancer en local

Prérequis : Node.js ≥ 20.

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:5173.

> Le serveur de dev Vite sert aussi de proxy pour OSRM, Nominatim et Alplakes
> (ces APIs ne renvoient pas toutes les en-têtes CORS). `npm run build` produit un
> build statique, mais il faudra alors un proxy équivalent devant.

## Sources de données (gratuites, sans clé)

| Donnée | Source |
| --- | --- |
| Vent, rafales, température, pluie, lever/coucher du soleil | [Open-Meteo](https://open-meteo.com) (modèles MétéoSuisse ICON-CH en Suisse) |
| Température de l'eau | [Alplakes](https://www.alplakes.eawag.ch) – Eawag |
| Temps de trajet | [OSRM](https://project-osrm.org) (serveur de démo public) |
| Géocodage d'adresse | [Nominatim](https://nominatim.org) – OpenStreetMap |

## Structure

```
src/
  data/spots.ts          liste des spots (coordonnées, directions favorables, niveau)
  lib/rating.ts          notation horaire/journalière + choix de l'aile
  lib/geo.ts             distances, directions, formatage
  services/              appels API (météo, trajets, géocodage, eau)
  components/            UI (cartes de spot, tableau horaire, profil, carte)
```

Pour ajouter un spot, complète `src/data/spots.ts` : `directions` contient les plages de
directions d'où le vent doit venir (en degrés, sens horaire).

⚠️ Les notes sont indicatives. Vérifie toujours les conditions sur place et la
réglementation locale (zones autorisées, distance au rivage, réserves naturelles).
