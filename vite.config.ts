import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const UA = 'kite-spots-ch/0.1 (local dev app)'

// Les APIs de routage, géocodage et température des lacs ne renvoient pas toutes
// les en-têtes CORS : on passe par le proxy du serveur de dev.
export default defineConfig(({ command, isPreview }) => ({
  // Le build est publié sur GitHub Pages sous https://amaupllx.github.io/kite-spots/
  // (même chemin pour `vite preview`, qui sert ce build).
  base: command === 'build' || isPreview ? '/kite-spots/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/osrm/, ''),
      },
      '/api/geocode': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/geocode/, ''),
        headers: { 'User-Agent': UA },
      },
      '/api/alplakes': {
        target: 'https://alplakes-api.eawag.ch',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/alplakes/, ''),
      },
      // API interne non documentée de Windguru (usage personnel, local) : elle attend un Referer windguru.cz.
      '/api/windguru': {
        target: 'https://www.windguru.net',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/windguru/, ''),
        headers: { Referer: 'https://www.windguru.cz/' },
      },
    },
  },
}))
