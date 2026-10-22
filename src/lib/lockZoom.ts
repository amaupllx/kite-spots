/**
 * Bloque le zoom de la page par pincement sur téléphone.
 * Safari iOS ignore `user-scalable=no` du viewport : il faut annuler les gestes en JS
 * (le double tap est déjà neutralisé par `touch-action` dans index.css).
 * Le pincement reste possible sur la carte Leaflet, qui gère son propre zoom.
 */
export function lockPageZoom() {
  const inMap = (e: Event) => e.target instanceof Element && e.target.closest('.leaflet-container') !== null

  // Événements propriétaires de Safari pour le pincement.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => { if (!inMap(e)) e.preventDefault() }, { passive: false })
  }
  // Pincement à deux doigts (autres navigateurs).
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 && !inMap(e)) e.preventDefault()
  }, { passive: false })
}
