// Recoupement des annales : regroupe les questions qui portent sur la même notion d'une session à l'autre.
// Similarité de Jaccard sur les mots significatifs de l'énoncé, même profession, au moins un sous-thème commun.
// Logique pure.

const STOP = new Set(('alors aussi autre autres avec avoir cette cela celle celui ces cet comme dans depuis des doit donc dont elle elles '
  + 'entre est etre etait fait faut leur leurs lors mais meme moins notamment nous peut peuvent plus pour quand quel quelle quelles quels '
  + 'qui quoi sans selon ses son sont sous sur tous tout toute toutes tres une vous votre vos cas lequel laquelle lesquels lesquelles '
  + 'question questions reponse reponses citez indiquez precisez expliquez justifiez definissez quelles ainsi peut-il peut-elle '
  + 'expert-comptable experts-comptables expert comptable comptables commissaire commissaires comptes profession professionnel professionnels '
  + 'societe entite mission missions').split(/\s+/));

const ANNALE = /^\d{4}-\d{2}$/;

export function tokens(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ').replace(/[^a-z0-9-]+/g, ' ');
  return new Set(t.split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)));
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

// Renvoie { clusterOf: id -> n° de groupe, groups: [[ids…]] } ; seuls les groupes de 2 sessions ou plus sont gardés.
export function buildClusters(questions, threshold = 0.3) {
  const tk = questions.map((q) => tokens(`${q.question} ${q.qcm?.question || ''}`));
  const parent = questions.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const a = questions[i], b = questions[j];
      if (a.profession !== b.profession || a.session === b.session) continue;
      // Questions de transfert (hors annales) : jamais comptées comme « posées » à une session.
      if (!ANNALE.test(a.session) || !ANNALE.test(b.session)) continue;
      if (!a.tags.some((t) => b.tags.includes(t))) continue;
      if (jaccard(tk[i], tk[j]) >= threshold) parent[find(i)] = find(j);
    }
  }
  const byRoot = new Map();
  questions.forEach((q, i) => { const r = find(i); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(q.id); });
  const groups = [...byRoot.values()].filter((g) => new Set(g.map((id) => id.slice(0, 7))).size >= 2)
    .sort((a, b) => b.length - a.length);
  const clusterOf = {};
  groups.forEach((g, n) => g.forEach((id) => { clusterOf[id] = n; }));
  return { clusterOf, groups };
}
