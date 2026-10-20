/** Classe de couleur selon la vitesse du vent (nœuds). */
export function windClass(kn: number) {
  if (kn < 8) return 'w0'
  if (kn < 12) return 'w1'
  if (kn < 16) return 'w2'
  if (kn < 20) return 'w3'
  if (kn < 25) return 'w4'
  if (kn < 30) return 'w5'
  return 'w6'
}

export function scoreClass(score: number) {
  if (score >= 4) return 's-top'
  if (score >= 3) return 's-good'
  if (score >= 2) return 's-ok'
  if (score > 0) return 's-low'
  return 's-none'
}
