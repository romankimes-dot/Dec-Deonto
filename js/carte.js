// Carte des notions : un nœud par sous-thème (tag) et par profession, rangé dans le thème du programme où il est le plus posé.
// Poids = nombre de questions des annales ; état = où en est la révision. Liens : sous-thèmes posés ensemble dans une même
// question (au moins MIN_LINK fois) ; jumeaux : même sous-thème dans les deux professions (là où se font les confusions).
// Code pur, sans dépendance à l'interface.

export const THEME_ORDER = ['exercice', 'deontologie', 'controle_qualite', 'responsabilite'];
export const MIN_LINK = 2;

const keyOf = (prof, tag) => `${prof}:${tag}`;

export function buildGraph(questions, { minLink = MIN_LINK } = {}) {
  const nodes = new Map();
  const co = new Map();
  for (const q of questions) {
    for (const t of q.tags) {
      const k = keyOf(q.profession, t);
      if (!nodes.has(k)) nodes.set(k, { id: k, prof: q.profession, tag: t, ids: [], themes: {} });
      const n = nodes.get(k); n.ids.push(q.id); n.themes[q.theme] = (n.themes[q.theme] || 0) + 1;
    }
    const ts = [...new Set(q.tags)].sort();
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      const k = `${keyOf(q.profession, ts[i])}|${keyOf(q.profession, ts[j])}`;
      co.set(k, (co.get(k) || 0) + 1);
    }
  }
  for (const n of nodes.values()) {
    // Thème dominant ; à égalité, l'ordre du programme
    n.theme = THEME_ORDER.slice().sort((a, b) => (n.themes[b] || 0) - (n.themes[a] || 0) || THEME_ORDER.indexOf(a) - THEME_ORDER.indexOf(b))[0];
  }
  const edges = [];
  for (const [k, w] of co) { if (w < minLink) continue; const [a, b] = k.split('|'); edges.push({ a, b, w, twin: false }); }
  for (const n of nodes.values()) {
    if (n.prof !== 'EC') continue;
    const t = keyOf('CAC', n.tag);
    if (nodes.has(t)) edges.push({ a: n.id, b: t, w: 1, twin: true });
  }
  return { nodes: [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1)), edges };
}

// État d'un nœud : vierge (aucune question vue), fragile (réussite < 60 % sur 3 réponses au moins),
// en cours, solide (maîtrise moyenne ≥ 2/3 et réussite ≥ 80 %). masteryFn : srs.mastery (0 à 3).
export function nodeState(node, cards, tagAcc, masteryFn) {
  const n = node.ids.length;
  const levels = node.ids.map((id) => masteryFn(cards[id]));
  const seen = node.ids.filter((id) => cards[id]).length;
  const score = levels.reduce((s, x) => s + x, 0) / (3 * n);
  const a = tagAcc?.[node.id] || { ok: 0, n: 0 };
  const acc = a.n ? a.ok / a.n : null;
  let level = 'vierge';
  if (seen) {
    if (a.n >= 3 && acc < 0.6) level = 'fragile';
    else if (score >= 0.66 && (acc === null || acc >= 0.8)) level = 'solide';
    else level = 'en_cours';
  }
  const m = [0, 0, 0, 0]; levels.forEach((x) => { m[x]++; });
  return { n, seen, cover: seen / n, score, acc, answers: a.n, level, m };
}

export const LEVELS = {
  vierge: 'jamais vue', fragile: 'fragile', en_cours: 'en cours', solide: 'solide',
};

// Voisins d'un nœud (liens de co-occurrence, du plus fort au plus faible) et son jumeau de l'autre profession
export function neighbours(graph, id) {
  const out = []; let twin = null;
  for (const e of graph.edges) {
    const other = e.a === id ? e.b : e.b === id ? e.a : null;
    if (!other) continue;
    if (e.twin) twin = other; else out.push({ id: other, w: e.w });
  }
  return { links: out.sort((x, y) => y.w - x.w), twin };
}
