// Glossaire : définitions clés, recherche, et repérage des termes dans le texte affiché (infobulles).
// La logique de repérage et de recherche est pure ; `linkTerms` agit sur le DOM.

export const PROFS = ['ec', 'cac'];
export const CATS = ['institution', 'notion', 'norme', 'texte'];

// Comparaison sans accents ni casse, apostrophes unifiées.
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'");
const key = (s) => String(s).toLowerCase().replace(/’/g, "'");
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Sigle (H2A, NEP, NP 2300…) : casse exacte ; mot courant : casse libre.
const isSigle = (s) => /\p{Lu}.*\p{Lu}|\d/u.test(s) && !/\p{Ll}{3}/u.test(s.replace(/^\p{Lu}/u, ''));

export async function loadGlossary() {
  const res = await fetch('./data/glossaire.json');
  if (!res.ok) throw new Error('Glossaire indisponible');
  return res.json();
}

export function validateEntry(e) {
  const errs = [];
  if (!/^[a-z0-9-]+$/.test(e.id || '')) errs.push('id');
  if (!e.terme) errs.push('terme');
  if (!e.def || e.def.length < 20) errs.push('def');
  if (!Array.isArray(e.alias)) errs.push('alias');
  if (!Array.isArray(e.prof) || !e.prof.length || e.prof.some((p) => !PROFS.includes(p))) errs.push('prof');
  if (!CATS.includes(e.cat)) errs.push('cat');
  return errs;
}

// Formes repérées d'une entrée : le terme (sans sigle entre parenthèses) et ses alias.
export const formsOf = (e) => [e.terme.replace(/\s*\([^)]*\)\s*$/, ''), ...(e.alias || [])].filter(Boolean);

export function buildMatcher(entries) {
  const byForm = new Map();
  entries.filter((e) => e.auto !== false).forEach((e) => formsOf(e).forEach((f) => { if (!byForm.has(key(f))) byForm.set(key(f), { entry: e, form: f, strict: isSigle(f) }); }));
  const forms = [...byForm.values()].map((x) => x.form).sort((a, b) => b.length - a.length);
  if (!forms.length) return null;
  const alt = forms.map((f) => reEsc(f).replace(/'/g, "['’]")).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?:s|x)?(?![\\p{L}\\p{N}])`, 'giu');
  return { re, byForm };
}

// Occurrences valides dans un texte : [{ start, end, entry }].
export function findTerms(text, matcher) {
  if (!matcher || !text) return [];
  const out = [];
  matcher.re.lastIndex = 0;
  for (const m of text.matchAll(matcher.re)) {
    let s = m[0]; let hit = matcher.byForm.get(key(s));
    if (!hit && /[sx]$/i.test(s)) { s = s.slice(0, -1); hit = matcher.byForm.get(key(s)); }
    if (!hit) continue;
    if (hit.strict && s.replace(/’/g, "'") !== hit.form) continue;
    out.push({ start: m.index, end: m.index + m[0].length, entry: hit.entry });
  }
  return out;
}

export function filterEntries(entries, filter) {
  if (PROFS.includes(filter)) return entries.filter((e) => e.prof.includes(filter));
  if (filter === 'institution') return entries.filter((e) => e.cat === 'institution');
  if (filter === 'norme') return entries.filter((e) => e.cat === 'norme' || e.cat === 'texte');
  return entries;
}

// Recherche : tous les mots doivent figurer ; le terme lui-même passe avant les alias, puis la définition.
export function search(entries, q, filter = 'tout') {
  const list = filterEntries(entries, filter);
  const nq = norm(q).trim();
  const byName = (a, b) => a.terme.localeCompare(b.terme, 'fr');
  if (!nq) return [...list].sort(byName);
  const words = nq.split(/\s+/);
  return list.map((e) => {
    const t = norm(e.terme); const a = norm(e.alias.join(' | ')); const d = norm(e.def);
    if (!words.every((w) => t.includes(w) || a.includes(w) || d.includes(w))) return null;
    const score = t === nq ? 0 : t.startsWith(nq) ? 1 : (t.includes(nq) || a.split(' | ').some((x) => x.startsWith(nq))) ? 2 : a.includes(nq) ? 3 : 4;
    return { e, score };
  }).filter(Boolean).sort((x, y) => x.score - y.score || byName(x.e, y.e)).map((x) => x.e);
}

// Souligne la première occurrence de chaque terme par zone (`scopeOf`), hors éléments `skip`.
export function linkTerms(root, matcher, { skip, scopeOf }) {
  if (!matcher || !root || root.closest?.(skip)) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */, {
    acceptNode: (t) => (t.nodeValue.length > 1 && !t.parentElement?.closest(skip) ? 1 : 3),
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  const used = new Map();
  for (const t of nodes) {
    const hits0 = findTerms(t.nodeValue, matcher);
    if (!hits0.length) continue;
    const scope = scopeOf(t.parentElement);
    let seen = used.get(scope);
    if (!seen) { seen = new Set([...scope.querySelectorAll('.gl')].map((x) => x.dataset.gl)); used.set(scope, seen); }
    const hits = hits0.filter((h) => !seen.has(h.entry.id) && seen.add(h.entry.id));
    if (!hits.length) continue;
    const s = t.nodeValue; const frag = doc.createDocumentFragment(); let pos = 0;
    for (const h of hits) {
      frag.append(s.slice(pos, h.start));
      const sp = doc.createElement('span');
      sp.className = 'gl'; sp.dataset.gl = h.entry.id; sp.tabIndex = 0; sp.setAttribute('role', 'button');
      sp.textContent = s.slice(h.start, h.end);
      frag.append(sp); pos = h.end;
    }
    frag.append(s.slice(pos));
    t.replaceWith(frag);
  }
}
