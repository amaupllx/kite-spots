import type { Spot } from '../types'

// Directions : d'où vient le vent, en degrés (0 = N, 90 = E, 180 = S, 270 = O).
// Bise ≈ NE (30–80°), Vent (Joran / sud-ouest) ≈ SO (200–260°), Föhn ≈ S (150–210°).
// Les coordonnées pointent la zone de mise à l'eau. Vérifie toujours les règles
// locales (zones autorisées, distance au rivage, saisons de nidification).
export const SPOTS: Spot[] = [
  // --- Lac de Neuchâtel ---
  {
    id: 'yvonand', name: 'Yvonand', lake: 'Lac de Neuchâtel', region: 'VD',
    lat: 46.8016, lon: 6.7423, directions: [[20, 80], [200, 260]], level: 'debutant',
    notes: 'Grande plage, eau peu profonde au bord. Bise et vent du sud-ouest side-shore.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  {
    id: 'cheyres', name: 'Cheyres', lake: 'Lac de Neuchâtel', region: 'FR',
    lat: 46.8146, lon: 6.7835, directions: [[20, 80], [200, 260]], level: 'debutant',
    notes: 'Spot très fréquenté, zone kite balisée. Bonne bise.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  {
    id: 'estavayer', name: 'Estavayer-le-Lac', lake: 'Lac de Neuchâtel', region: 'FR',
    lat: 46.8540, lon: 6.8520, directions: [[20, 80], [210, 260]], level: 'intermediaire',
    notes: 'Mise à l\'eau près du port, roseaux à éviter.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  {
    id: 'portalban', name: 'Portalban', lake: 'Lac de Neuchâtel', region: 'FR',
    lat: 46.9205, lon: 6.9560, directions: [[200, 280], [20, 70]], level: 'intermediaire',
    notes: 'Bon par vent d\'ouest / sud-ouest.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  {
    id: 'yverdon', name: 'Yverdon-les-Bains', lake: 'Lac de Neuchâtel', region: 'VD',
    lat: 46.7860, lon: 6.6510, directions: [[15, 75]], level: 'debutant',
    notes: 'Bise onshore / side-on, plage de sable. Offshore par vent du SO.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  {
    id: 'colombier', name: 'Colombier', lake: 'Lac de Neuchâtel', region: 'NE',
    lat: 46.9600, lon: 6.8700, directions: [[200, 270]], level: 'intermediaire',
    notes: 'Vent du sud-ouest side-on, plage des Allées.',
    alplakes: { model: 'mitgcm', lake: 'neuchatel' }, waterClimate: 'grand-lac',
  },
  // --- Lac de Morat / Bienne ---
  {
    id: 'faoug', name: 'Faoug', lake: 'Lac de Morat', region: 'VD',
    lat: 46.9050, lon: 7.0780, directions: [[20, 70], [200, 250]], level: 'debutant',
    notes: 'Petit lac, eau chaude en été. Axe du lac NE–SO.',
    alplakes: { model: 'delft3d-flow', lake: 'murten' }, waterClimate: 'plaine',
  },
  {
    id: 'luscherz', name: 'Lüscherz', lake: 'Lac de Bienne', region: 'BE',
    lat: 47.0460, lon: 7.1530, directions: [[220, 280], [30, 80]], level: 'intermediaire',
    notes: 'Vent d\'ouest et bise le long du lac.',
    alplakes: { model: 'delft3d-flow', lake: 'biel' }, waterClimate: 'plaine',
  },
  // --- Léman ---
  {
    id: 'preverenges', name: 'Préverenges', lake: 'Léman', region: 'VD',
    lat: 46.5125, lon: 6.5235, directions: [[200, 260]], level: 'intermediaire',
    notes: 'Spot de référence pour le vent du sud-ouest. Bise offshore : à éviter.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  {
    id: 'saint-prex', name: 'Saint-Prex', lake: 'Léman', region: 'VD',
    lat: 46.4790, lon: 6.4570, directions: [[200, 260], [40, 80]], level: 'intermediaire',
    notes: 'Plage du Coulet. Vent du SO side-shore.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  {
    id: 'villeneuve', name: 'Villeneuve / Grangettes', lake: 'Léman', region: 'VD',
    lat: 46.3950, lon: 6.9000, directions: [[200, 290]], level: 'intermediaire',
    notes: 'Bout du lac, vent d\'ouest onshore et brise thermique l\'après-midi. Réserve naturelle à respecter.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  {
    id: 'bouveret', name: 'Le Bouveret', lake: 'Léman', region: 'VS',
    lat: 46.3870, lon: 6.8560, directions: [[230, 320]], level: 'intermediaire',
    notes: 'Vent d\'ouest / nord-ouest onshore.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  {
    id: 'geneve', name: 'Genève – Baby-Plage', lake: 'Léman', region: 'GE',
    lat: 46.2080, lon: 6.1630, directions: [[20, 70]], level: 'avance',
    notes: 'Bise forte et rafaleuse, zone fréquentée. Pour riders confirmés.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  {
    id: 'excenevex', name: 'Excenevex (FR)', lake: 'Léman', region: 'Haute-Savoie',
    lat: 46.3500, lon: 6.3560, directions: [[10, 70]], level: 'debutant',
    notes: 'Grande plage de sable, bise onshore. En France.',
    alplakes: { model: 'delft3d-flow', lake: 'geneva' }, waterClimate: 'grand-lac',
  },
  // --- Jura ---
  {
    id: 'joux', name: 'Lac de Joux – Le Rocheray', lake: 'Lac de Joux', region: 'VD',
    lat: 46.6470, lon: 6.2980, directions: [[200, 250], [20, 70]], level: 'intermediaire',
    notes: 'Lac d\'altitude (1000 m), eau froide. Axe SO–NE.',
    alplakes: { model: 'delft3d-flow', lake: 'joux' }, waterClimate: 'altitude',
  },
  // --- Suisse centrale ---
  {
    id: 'fluelen', name: 'Flüelen', lake: 'Urnersee', region: 'UR',
    lat: 46.9050, lon: 8.6230, directions: [[150, 210]], level: 'avance',
    notes: 'Spot de Föhn mythique : vent fort et très rafaleux. Experts uniquement.',
    alplakes: { model: 'mitgcm', lake: 'lucerne' }, waterClimate: 'grand-lac',
  },
  {
    id: 'isleten', name: 'Isleten', lake: 'Urnersee', region: 'UR',
    lat: 46.9190, lon: 8.5940, directions: [[150, 210], [330, 30]], level: 'avance',
    notes: 'Föhn et thermique du nord. Place restreinte.',
    alplakes: { model: 'mitgcm', lake: 'lucerne' }, waterClimate: 'grand-lac',
  },
  {
    id: 'sihlsee', name: 'Sihlsee – Euthal', lake: 'Sihlsee', region: 'SZ',
    lat: 47.0960, lon: 8.7700, directions: [[330, 30], [160, 220]], level: 'intermediaire',
    notes: 'Lac de barrage à 890 m. Vent du nord ou du sud dans l\'axe du lac.',
    waterClimate: 'altitude',
  },
  {
    id: 'walensee', name: 'Walenstadt', lake: 'Walensee', region: 'SG',
    lat: 47.1230, lon: 9.3080, directions: [[240, 300]], level: 'intermediaire',
    notes: 'Vent d\'ouest canalisé dans la vallée.',
    waterClimate: 'grand-lac',
  },
  // --- Est ---
  {
    id: 'altenrhein', name: 'Altenrhein', lake: 'Bodensee', region: 'SG',
    lat: 47.4890, lon: 9.5530, directions: [[200, 290], [20, 70]], level: 'debutant',
    notes: 'Rive suisse du lac de Constance. Vent d\'ouest / sud-ouest.',
    waterClimate: 'grand-lac',
  },
  {
    id: 'romanshorn', name: 'Romanshorn', lake: 'Bodensee', region: 'TG',
    lat: 47.5560, lon: 9.3830, directions: [[20, 80], [270, 330]], level: 'intermediaire',
    notes: 'Bise et vent de nord-ouest.',
    waterClimate: 'grand-lac',
  },
  // --- Grisons ---
  {
    id: 'silvaplana', name: 'Silvaplana', lake: 'Silvaplanersee', region: 'GR',
    lat: 46.4530, lon: 9.7950, directions: [[200, 250]], level: 'intermediaire',
    notes: 'Vent de Maloja quasi quotidien l\'après-midi par beau temps (mai–sept). Lac à 1800 m, eau très froide.',
    waterClimate: 'altitude',
  },
  // --- Italie proche ---
  {
    id: 'colico', name: 'Colico (IT)', lake: 'Lago di Como', region: 'Lombardie',
    lat: 46.1320, lon: 9.3770, directions: [[160, 220], [340, 30]], level: 'intermediaire',
    notes: 'Breva (sud) l\'après-midi, Tivano (nord) le matin. En Italie.',
    waterClimate: 'plaine',
  },
]

export const SPOTS_BY_ID: Record<string, Spot> = Object.fromEntries(SPOTS.map((s) => [s.id, s]))
