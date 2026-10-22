// Moteur de répétition espacée (SM-2 simplifié). Fonctions pures, testables.
// Grades : 0 = Encore, 1 = Difficile, 2 = Bien, 3 = Facile.

export const DAY = 24 * 60 * 60 * 1000;

export function newCard(now = Date.now()) {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: null };
}

export function review(card, grade, now = Date.now()) {
  const c = { ...card };
  c.last = now;
  if (grade === 0) {
    c.reps = 0;
    c.lapses = (c.lapses || 0) + 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.interval = 0;
    c.due = now + 10 * 60 * 1000; // revue dans la même session (10 min)
    return c;
  }
  if (c.reps === 0) {
    c.interval = grade === 1 ? 1 : grade === 2 ? 3 : 5;
  } else if (c.reps === 1) {
    c.interval = grade === 1 ? 3 : grade === 2 ? 7 : 10;
  } else {
    const mult = grade === 1 ? 1.2 : grade === 2 ? c.ease : c.ease * 1.3;
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * mult));
  }
  if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15);
  if (grade === 3) c.ease = Math.min(3.0, c.ease + 0.15);
  c.reps += 1;
  c.due = now + c.interval * DAY;
  return c;
}

export function isDue(card, now = Date.now()) {
  return !!card && card.due <= now;
}

// Niveau de maîtrise : 0 = jamais vue, 1 = apprentissage, 2 = en cours, 3 = acquise
export function mastery(card) {
  if (!card || card.reps === 0) return card && card.lapses ? 1 : 0;
  if (card.interval >= 14) return 3;
  if (card.interval >= 3) return 2;
  return 1;
}

// Construit la file du jour : cartes dues (les plus anciennes d'abord), puis nouvelles cartes.
// `cards` : map id -> card ; `questions` : liste ordonnée des questions candidates (déjà priorisées).
export function buildQueue(questions, cards, { newLimit = 20, now = Date.now() } = {}) {
  const due = [];
  const fresh = [];
  for (const q of questions) {
    const c = cards[q.id];
    if (!c) fresh.push(q);
    else if (isDue(c, now)) due.push(q);
  }
  due.sort((a, b) => cards[a.id].due - cards[b.id].due);
  // Alterner EC / CAC dans les nouvelles cartes pour équilibrer la session
  const ec = fresh.filter((q) => q.profession === 'EC');
  const cac = fresh.filter((q) => q.profession === 'CAC');
  const alt = [];
  while (alt.length < newLimit && (ec.length || cac.length)) {
    if (cac.length) alt.push(cac.shift()); // CAC en premier : partie la moins bien réussie
    if (alt.length < newLimit && ec.length) alt.push(ec.shift());
  }
  return { due, fresh: alt, queue: [...due, ...alt] };
}

// Tirage d'un examen blanc : 10 EC + 10 CAC, en privilégiant les questions jamais vues en examen
// puis les moins récemment vues. `seen` : map id -> timestamp de dernière apparition en examen.
export function drawExam(questions, seen = {}, rnd = Math.random) {
  const pick = (prof) => {
    const pool = questions.filter((q) => q.profession === prof);
    const shuffled = pool
      .map((q) => ({ q, r: rnd() }))
      .sort((a, b) => (seen[a.q.id] || 0) - (seen[b.q.id] || 0) || a.r - b.r)
      .map((x) => x.q);
    return shuffled.slice(0, 10);
  };
  return [...pick('EC'), ...pick('CAC')];
}

export function scoreExam(answers, mode) {
  // answers: [{ points, max }] -> note /20
  const total = answers.reduce((s, a) => s + a.points, 0);
  const max = answers.reduce((s, a) => s + a.max, 0) || 1;
  const note = mode === 'qcm' ? total : (total / max) * 20;
  return Math.round(note * 100) / 100;
}
