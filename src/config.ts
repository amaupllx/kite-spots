// En local (`npm run dev`), le serveur Vite relaie les APIs qui refusent les appels
// depuis le navigateur (voir vite.config.ts). La version statique (GitHub Pages) n'a pas
// ce relais : appels directs quand l'API l'accepte, sinon la fonction est désactivée.
export const HAS_PROXY = import.meta.env.DEV

export const OSRM_URL = HAS_PROXY ? '/api/osrm' : 'https://router.project-osrm.org'
export const NOMINATIM_URL = HAS_PROXY ? '/api/geocode' : 'https://nominatim.openstreetmap.org'
