// Carte des notions : un nœud par sous-thème (tag) et par profession, EC à gauche, CAC à droite, rangés par thème du programme.
// Taille du nœud = nombre de questions des annales (poids à l'épreuve) ; couleur = état de la révision ; anneau = part vue.
// Liens : sous-thèmes posés ensemble dans une même question (au moins MIN_LINK fois) ; pointillé entre jumeaux EC / CAC
// (même sous-thème dans les deux professions : là où se font les confusions). Code pur, sans dépendance à l'interface.

export const THEME_ORDER = ['exercice', 'deontologie', 'controle_qualite', 'responsabilite'];
export const MIN_LINK = 2;
export const W = 360;
const PER_NODE = 36; // hauteur donnée à chaque nœud de la colonne la plus chargée d'une bande
const MIN_BAND = 150;

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
    n.r = Math.round(7 + 2.1 * Math.sqrt(n.ids.length));
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

// Hachage stable (position de départ reproductible d'un lancement à l'autre)
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

// Disposition par forces, déterministe : chaque nœud est tenu dans sa colonne (profession) et sa bande (thème),
// repoussé par ses voisins (étiquette comprise), attiré par ses liens ; les jumeaux se mettent à la même hauteur.
export function layout(graph, { iter = 400 } = {}) {
  const { nodes, edges } = graph;
  const pad = 8, mid = W / 2, gap = 14;
  const colX = (p) => (p === 'EC' ? [pad, mid - gap] : [mid + gap, W - pad]);
  // Bandes de thème : hauteur selon la colonne la plus chargée (EC ou CAC)
  let y = 0;
  graph.bands = THEME_ORDER.map((t) => {
    const k = Math.max(...['EC', 'CAC'].map((p) => nodes.filter((n) => n.prof === p && n.theme === t).length));
    const h = Math.max(MIN_BAND, k * PER_NODE + 50); const b = { theme: t, y0: y, y1: y + h }; y += h; return b;
  });
  graph.H = y;
  const bandY = (t) => { const b = graph.bands.find((x) => x.theme === t); return [b.y0 + 34, b.y1 - 20]; };
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    const [x0, x1] = colX(n.prof), [y0, y1] = bandY(n.theme);
    n.x = x0 + 20 + hash(n.tag) * (x1 - x0 - 40);
    n.y = y0 + 10 + hash(n.tag + '#') * (y1 - y0 - 20);
  }
  const links = edges.map((e) => ({ ...e, A: byId[e.a], B: byId[e.b] })).filter((e) => e.A && e.B);
  // Collision : le disque et son étiquette dessous (≈ 72 px de large, 2 lignes de 10 px)
  const collide = (yOnly = false) => {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.prof !== b.prof || a.theme !== b.theme) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const minX = Math.max(a.r, 36) + Math.max(b.r, 36) + 4, minY = a.r + b.r + 28;
      const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        if (!yOnly && ox * minY < oy * minX) { const s = (dx >= 0 ? 1 : -1) * ox * 0.5; a.x -= s; b.x += s; }
        else { const s = (dy >= 0 ? 1 : -1) * oy * 0.5; a.y -= s; b.y += s; }
      }
    }
  };
  const clamp = () => {
    for (const n of nodes) {
      const [x0, x1] = colX(n.prof), [y0, y1] = bandY(n.theme);
      const hx = Math.max(n.r, 36);
      n.x = Math.min(x1 - hx, Math.max(x0 + hx, n.x));
      n.y = Math.min(y1 - n.r - 22, Math.max(y0 + n.r, n.y));
    }
  };
  for (let it = 0; it < iter; it++) {
    const cool = 1 - it / iter;
    // Liens : seulement dans une même bande (un lien entre bandes tirerait tout vers la frontière)
    for (const e of links) {
      if (e.A.theme !== e.B.theme) continue;
      if (e.twin) { const dy = (e.B.y - e.A.y) * 0.03 * cool; e.A.y += dy; e.B.y -= dy; continue; }
      const dx = e.B.x - e.A.x, dy = e.B.y - e.A.y, d = Math.hypot(dx, dy) || 1;
      const f = ((d - (e.A.r + e.B.r + 40)) / d) * 0.015 * Math.min(3, e.w) * cool;
      e.A.x += dx * f; e.A.y += dy * f; e.B.x -= dx * f; e.B.y -= dy * f;
    }
    // Légère gravité vers le centre de sa case (colonne × bande) : la bande se remplit sans tas d'un côté
    for (const n of nodes) {
      const [x0, x1] = colX(n.prof), [y0, y1] = bandY(n.theme);
      n.x += ((x0 + x1) / 2 - n.x) * 0.01 * cool; n.y += ((y0 + y1) / 2 - n.y) * 0.01 * cool;
    }
    collide(); clamp();
  }
  // Puis les chevauchements restants (nœuds coincés contre un bord de colonne) se règlent en hauteur
  for (let it = 0; it < 100; it++) { collide(); clamp(); }
  for (let it = 0; it < 100; it++) { collide(true); clamp(); }
  for (const n of nodes) { n.x = Math.round(n.x * 10) / 10; n.y = Math.round(n.y * 10) / 10; }
  return graph;
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

// Nœud à travailler en premier : fragile le plus posé, sinon en cours le plus posé, sinon vierge le plus posé.
export function priority(graph, states) {
  const rank = { fragile: 0, en_cours: 1, vierge: 2, solide: 3 };
  return graph.nodes.slice().sort((a, b) => rank[states[a.id].level] - rank[states[b.id].level] || b.ids.length - a.ids.length)[0] || null;
}

// Étiquette sur deux lignes au plus (≈ 15 caractères par ligne), tronquée au-delà
export function wrapLabel(s, max = 15) {
  const words = String(s).split(/\s+/); const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = w;
    else if ((cur + ' ' + w).length <= max) lines[lines.length - 1] = cur + ' ' + w;
    else if (lines.length < 2) lines.push(w);
    else { lines[1] = (lines[1] + ' ' + w).slice(0, max - 1) + '…'; break; }
  }
  return lines.map((l) => (l.length > max + 2 ? l.slice(0, max) + '…' : l));
}
