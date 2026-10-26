// Générateurs d'items pour les jeux, tirés des fiches et de la banque (relues sur les textes). Logique pure.
//   Duel        : blocs ```vs des schémas (« critère | EC | CAC ») -> « à qui est cette règle ? »
//   Vrai / Faux : chaque proposition d'un QCM -> « est-ce la bonne réponse ? »
//   Chiffres    : tableaux du schéma des chiffres clés -> « quel chiffre ? »
//   Arbres      : blocs ```arbre -> « quelle proposition se rattache à cette branche ? »
import { splitFrontMatter } from './bank.js';
import { hashId } from './drill.js';

const DEFAULT_LABELS = ['Expert-comptable', 'Commissaire aux comptes'];
const cols = (l) => l.split('|').map((c) => c.trim());
// Texte brut (sans gras ni pastilles), pour comparer deux cellules.
export const plain = (s) => String(s || '').replace(/\{(EC|CAC|!|\?)\}/g, '').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();

function fences(md, kind) {
  const lines = splitFrontMatter(md).body.split('\n');
  const out = []; let cur = null;
  for (const l of lines) {
    if (cur) { if (/^```\s*$/.test(l)) { out.push(cur); cur = null; } else if (l.trim()) cur.push(l.replace(/\s+$/, '')); continue; }
    const m = /^```(\w+)\s*$/.exec(l);
    if (m && m[1] === kind) cur = [];
  }
  return out;
}

const titleOf = (md) => (/^#\s+(.*)$/m.exec(splitFrontMatter(md).body)?.[1] || '').replace(/^Schéma\s*\d+\s*[–-]\s*/, '');

// ---------- Duel ----------
// Cellule exploitable : ni vide, ni « — », ni « à vérifier », ni un simple oui/non.
const usable = (c) => { const p = plain(c); return p.length > 5 && p !== '—' && !/^\{\?\}/.test(c.trim()) && !/^(oui|non)\.?$/i.test(p); };
export function duelItems(file, md) {
  const items = []; const title = titleOf(md);
  for (const block of fences(md, 'vs')) {
    let labels = DEFAULT_LABELS;
    const rows = [...block];
    if (rows[0]?.startsWith('=')) labels = cols(rows.shift()).slice(1);
    for (const r of rows) {
      const [k, a = '', b = ''] = cols(r);
      const pa = plain(a), pb = plain(b);
      if (!pa || !pb || pa === pb || pa.startsWith(pb) || pb.startsWith(pa)) continue;
      [[a, 0], [b, 1]].forEach(([cell, side]) => {
        if (!usable(cell)) return;
        items.push({ id: `duel:${hashId(`${file}|${plain(k)}|${side}`)}`, file, title, labels, criterion: k, text: cell, answer: side, other: side ? a : b });
      });
    }
  }
  return items;
}

// ---------- Vrai / Faux ----------
const META = /aucune des (propositions|solutions|réponses)|toutes les (propositions|solutions|réponses)|ci-dessus|précédentes/i;
export function vfItems(questions) {
  const items = [];
  for (const q of questions) {
    if (q.qcm.choices.some((c) => META.test(c))) continue;
    q.qcm.choices.forEach((c, i) => {
      items.push({ id: `vf:${q.id}:${i}`, qid: q.id, stem: q.qcm.question || q.question, text: c, answer: i === q.qcm.answer, good: q.qcm.choices[q.qcm.answer] });
    });
  }
  return items;
}

// ---------- Chiffres ----------
export const CHIFFRES_FILE = '15-schema-chiffres-cles.md';
// Tableaux Markdown : 1re colonne = la réponse si l'en-tête est « Chiffre », sinon la 2e colonne.
export function chiffresItems(file, md) {
  const lines = splitFrontMatter(md).body.split('\n');
  const items = []; let section = '';
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.*)$/.exec(lines[i]); if (h) { section = h[1].trim(); continue; }
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(lines[i]); i += 2;
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
    i--;
    const numFirst = /chiffre/i.test(head[0]);
    const table = rows.map((r) => ({ value: numFirst ? r[0] : r[1], prompt: numFirst ? r[1] : r[0], prof: numFirst ? (r[2] || '') : '' }))
      .filter((r) => r.value && r.prompt);
    const values = [...new Set(table.map((r) => plain(r.value)))];
    for (const r of table) {
      const v = plain(r.value);
      const distract = values.filter((x) => x !== v);
      if (!distract.length) continue;
      items.push({ id: `num:${hashId(`${section}|${plain(r.prompt)}`)}`, file, section, prompt: r.prompt, prof: r.prof, value: v, pool: distract });
    }
  }
  return items;
}

// ---------- Arbres ----------
// Chaque feuille d'un arbre devient un item : le chemin (contexte) et la bonne feuille, contre des feuilles
// d'autres branches du même arbre (jamais des feuilles sœurs, qui seraient aussi justes).
export function parseTree(lines) {
  const root = { text: '', kind: '', children: [], depth: -1, parent: null };
  const stack = [root];
  for (const l of lines) {
    const depth = Math.floor((/^ */.exec(l)[0].length) / 2);
    let t = l.trim(); let kind = '';
    const m = /^([?=!])\s*/.exec(t);
    if (m) { kind = m[1]; t = t.slice(m[0].length); }
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    const node = { text: t, kind, children: [], depth, parent };
    parent.children.push(node); stack.push(node);
  }
  return root;
}
export function arbreItems(file, md) {
  const items = []; const title = titleOf(md);
  fences(md, 'arbre').forEach((block, bi) => {
    const root = parseTree(block);
    const leaves = [];
    const walk = (n) => { if (n !== root && !n.children.length) leaves.push(n); n.children.forEach(walk); };
    walk(root);
    for (const leaf of leaves) {
      // Les feuilles rattachées directement au sommet appartiennent à tout l'arbre : pas de leurre possible.
      if (!leaf.parent || leaf.parent === root || leaf.parent.parent === root) continue;
      const others = leaves.filter((x) => x.parent !== leaf.parent && plain(x.text) !== plain(leaf.text));
      if (others.length < 2) continue;
      const path = []; for (let n = leaf.parent; n && n !== root; n = n.parent) path.unshift(n.text);
      items.push({
        id: `arb:${hashId(`${file}|${bi}|${plain(leaf.text)}`)}`, file, title, path, text: leaf.text, kind: leaf.kind,
        siblings: leaf.parent.children.filter((x) => x !== leaf).map((x) => x.text),
        slot: leaf.parent.children.indexOf(leaf), // place de la case vide parmi ses sœurs
        pool: others.map((x) => x.text),
      });
    }
  });
  return items;
}

// ---------- Intrus ----------
// Questions « citez / quelles sont » : trois éléments attendus et un leurre, « lequel n'en fait pas partie ? ».
// Le leurre est relu à la main (champ `intrus` de la banque) ; `cross` : c'est la règle de l'autre profession.
// Le sujet de nov. 2025 posait 12 questions sur 20 sous forme négative : ce jeu y entraîne.
export const INTRUS_PREFIX = 'int:';
export function intrusItems(questions) {
  return questions.filter((q) => q.intrus && Array.isArray(q.intrus.items) && q.intrus.items.length >= 3 && q.intrus.leurre)
    .map((q) => ({ id: `${INTRUS_PREFIX}${q.id}`, qid: q.id, prof: q.profession, ask: q.intrus.q, items: q.intrus.items, leurre: q.intrus.leurre, cross: !!q.intrus.cross, why: q.intrus.why }));
}
// Une manche : trois éléments tirés parmi les attendus, plus le leurre, dans un ordre aléatoire.
// Renvoie { choices, answer } ; answer est l'index du leurre.
export function intrusRound(item, rnd = Math.random) {
  const three = item.items.map((v) => ({ v, r: rnd() })).sort((a, b) => a.r - b.r).slice(0, 3).map((x) => x.v);
  const choices = [...three, item.leurre].map((v) => ({ v, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.v);
  return { choices, answer: choices.indexOf(item.leurre) };
}

// ---------- Confusion EC / CAC ----------
// QCM dont un leurre est la règle de l'autre profession (qcm.crossProf) : part des réponses qui le choisissent.
// attempts : [{ id, mode, ok, pick }] (pick = index d'origine de la proposition choisie, QCM seulement).
export function confusionStats(attempts, byId) {
  const out = { n: 0, cross: 0, wrong: 0, byProf: { EC: { n: 0, cross: 0 }, CAC: { n: 0, cross: 0 } } };
  for (const a of attempts) {
    if (a.mode !== 'qcm' || !Number.isInteger(a.pick)) continue;
    const q = byId[a.id]; const cp = q?.qcm?.crossProf;
    if (!Number.isInteger(cp)) continue;
    out.n++; const p = out.byProf[q.profession];
    if (p) p.n++;
    if (!a.ok) out.wrong++;
    if (a.pick === cp) { out.cross++; if (p) p.cross++; }
  }
  out.rate = out.n ? out.cross / out.n : null;
  out.shareOfErrors = out.wrong ? out.cross / out.wrong : null;
  return out;
}
// Intrus « autre profession » : réponses et erreurs (boîtes de Leitner des jeux).
export function intrusCrossStats(items, memo) {
  let n = 0, ko = 0;
  for (const it of items) { if (!it.cross) continue; const m = memo[it.id]; if (!m) continue; n += m.n; ko += m.n - m.ok; }
  return { n, ko, rate: n ? ko / n : null };
}

// Propositions d'une question à choix : la bonne + jusqu'à n-1 leurres du pool, mélangées par rnd.
export function choicesFor(good, pool, n = 4, rnd = Math.random) {
  const picked = [...pool].map((v) => ({ v, r: rnd() })).sort((a, b) => a.r - b.r).slice(0, n - 1).map((x) => x.v);
  return [good, ...picked].map((v) => ({ v, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.v);
}
