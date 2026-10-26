// Correction QRC : retrouver dans la réponse tapée les éléments attendus (module pur, sans DOM).
// Normalisation (casse, accents, ponctuation), racines simples (pluriel retiré, 6 premières lettres),
// mots vides ignorés. Un élément est retrouvé si :
//   - un mot distinctif de sa tête (avant la parenthèse ou les deux-points) figure dans la réponse ;
//   - ou deux mots distinctifs (absents des autres éléments de la question) y figurent ;
//   - ou la moitié au moins de ses mots-clés y figurent.
// L'utilisateur garde la main : la correspondance ne fait que pré-cocher.

const STOP = new Set(('le la les l de des du d un une et ou ou en au aux a par pour sur sous dans avec sans ce ces cet cette '
  + 'son sa ses leur leurs qui que qu quoi dont est sont etre ete ne pas plus moins se s sauf ex art al alinea selon tout tous toute toutes '
  + 'notamment ainsi meme comme lors entre vers chez apres avant si il ils elle elles on y c n j m t etc cas fait faire peut doit '
  + 'non oui tres bien aussi autre autres deux trois quatre').split(/\s+/).filter(Boolean));

export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Racine : sans pluriel, tronquée à 6 lettres (« honoraires » = « honoraire », « indépendance » = « indépendant »).
export function stem(word) {
  let w = normalize(word);
  if (/\d/.test(w)) return w;
  if (w.length > 4) w = w.replace(/(x|s)$/, '');
  return w.slice(0, 6);
}

// Mots d'un texte avec leur position dans le texte d'origine.
function tokens(text) {
  const out = []; const re = /[\p{L}\p{N}]+/gu; let m;
  while ((m = re.exec(String(text ?? '')))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}
const isKey = (w) => { const n = normalize(w); return /\d/.test(n) || (n.length >= 3 && !STOP.has(n)); };

// Mots-clés (racines, sans doublon) d'un élément attendu.
export function keywords(text) {
  return [...new Set(tokens(text).filter((t) => isKey(t.w)).map((t) => stem(t.w)))];
}
const head = (text) => String(text).split(/[(:;]| - | – /)[0];

// found[i] : l'élément i est retrouvé ; marks : passages de la réponse à surligner (avec les éléments concernés).
export function matchExpected(answer, expected) {
  const ans = tokens(answer).filter((t) => isKey(t.w)).map((t) => ({ ...t, s: stem(t.w) }));
  const have = new Set(ans.map((t) => t.s));
  const keys = expected.map((e) => keywords(e));
  const count = {}; keys.forEach((ks) => ks.forEach((k) => { count[k] = (count[k] || 0) + 1; }));
  const found = expected.map((e, i) => {
    const ks = keys[i]; if (!ks.length) return false;
    const hit = ks.filter((k) => have.has(k));
    const distinct = hit.filter((k) => count[k] === 1);
    const headHit = keywords(head(e)).some((k) => count[k] === 1 && have.has(k));
    return headHit || distinct.length >= 2 || hit.length / ks.length >= 0.5;
  });
  const marks = ans.map((t) => ({ start: t.start, end: t.end, el: keys.map((ks, i) => (ks.includes(t.s) ? i : -1)).filter((i) => i >= 0) }))
    .filter((m) => m.el.length);
  return { found, marks };
}

// Réponse tapée en HTML, mots-clés retrouvés dans <mark>. `esc` échappe le texte.
export function highlight(answer, marks, esc) {
  const s = String(answer ?? ''); let out = ''; let at = 0;
  for (const m of marks) {
    out += esc(s.slice(at, m.start)) + `<mark data-el="${m.el.join(' ')}">${esc(s.slice(m.start, m.end))}</mark>`;
    at = m.end;
  }
  return out + esc(s.slice(at));
}
