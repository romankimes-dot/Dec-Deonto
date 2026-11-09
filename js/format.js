// Formats d'affichage communs : pourcentages, notes et scores. Un seul module, pour que la même mesure
// s'affiche à l'identique sur l'accueil, les statistiques, la carrière, les conditions de grade et les résultats.
//
// Règle d'arrondi (revue de novembre 2026) :
//   - couverture (questions vues) et réussite : par défaut ('floor'). 49,6 % s'affiche « 49 % », comme la condition
//     de grade « 50 % » qui n'est pas encore remplie ; on n'affiche jamais 100 % tant que tout n'est pas vu ;
//   - risques et parts d'erreurs (note < 6, leurre de l'autre profession choisi) : par excès ('ceil'), pour ne jamais
//     afficher « 0 % » d'un risque qui existe ;
//   - chance d'avoir 10 et plus : par défaut ('floor').
// Les largeurs CSS (barres de progression) ne passent pas par ici.
// Espace insécable fine avant « % » (U+202F) ; « – » quand il n'y a pas de donnée.
export const NNBSP = ' ';
export const NO_DATA = '–';
const EPS = 1e-9; // 0,29 × 100 = 28,999999999999996 : sans marge, floor donnerait 28

// Entier affiché pour un pourcentage p (0 à 100), ou null sans donnée.
export function pctInt(p, mode = 'floor') {
  if (p === null || p === undefined || !Number.isFinite(Number(p))) return null;
  const x = Number(p);
  const v = mode === 'ceil' ? Math.ceil(x - EPS) : mode === 'round' ? Math.round(x) : Math.floor(x + EPS);
  return Math.max(0, Math.min(100, v)) + 0; // + 0 : jamais « -0 »
}
// Pourcentage (0 à 100) de n sur d, ou null si d = 0.
export const ratioPct = (n, d) => (d > 0 ? (100 * n) / d : null);

// « 49 % » (espace fine insécable), « – » sans donnée. p en pourcentage (0 à 100).
export function fmtPct(p, mode = 'floor') {
  const v = pctInt(p, mode);
  return v === null ? NO_DATA : `${v}${NNBSP}%`;
}
// Même chose pour une fraction x (0 à 1).
export const fmtFrac = (x, mode = 'floor') => fmtPct(x === null || x === undefined ? null : 100 * x, mode);
// Même chose pour n sur d (« – » si d = 0).
export const fmtShare = (n, d, mode = 'floor') => fmtPct(ratioPct(n, d), mode);
// Taux avec son effectif : « 62 % · 18 rép. » ; « – » sans réponse.
export const fmtRate = (ok, n, mode = 'floor') => (n > 0 ? `${fmtShare(ok, n, mode)} · ${n} rép.` : NO_DATA);

// Note ou nombre de points, virgule décimale française : 13,33 ; 12,5 ; 14. « – » sans donnée.
export function fmtNote(x) {
  if (x === null || x === undefined || x === '' || !Number.isFinite(Number(x))) return NO_DATA;
  return Number(x).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
// Score « bonnes réponses (ou points) sur total » : « 3/10 », « 7,5/20 ». « – » sans total.
export const fmtScore = (points, max) => (max > 0 ? `${fmtNote(points)}/${fmtNote(max)}` : NO_DATA);
