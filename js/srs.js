// Moteur de répétition espacée (SM-2 simplifié). Fonctions pures, testables.
// Grades : 0 = Encore, 1 = Difficile, 2 = Bien, 3 = Facile.

export const DAY = 24 * 60 * 60 * 1000;

export function newCard(now = Date.now()) {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: null };
}

// `examAt` (timestamp de l'épreuve) : avant l'examen, l'échéance est avancée pour que la carte revienne
// au plus tard entre J-3 et J-1 (`spread` 0..2 étale ces dernières révisions). L'intervalle SM-2 reste intact
// (il mesure la solidité du souvenir). Après l'examen : SM-2 normal.
export function review(card, grade, now = Date.now(), { examAt = null, spread = 0 } = {}) {
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
  if (grade === 1) {
    // Difficile : revoir plus tôt sans repartir de zéro (1 jour la première fois, puis la moitié de l'intervalle, 1 à 4 jours).
    c.interval = c.reps === 0 ? 1 : Math.min(HARD_MAX, Math.max(1, Math.round(c.interval / 2)));
  } else if (c.reps === 0) {
    c.interval = grade === 2 ? 3 : 5;
  } else if (c.reps === 1) {
    c.interval = grade === 2 ? 7 : 10;
  } else {
    const mult = grade === 2 ? c.ease : c.ease * 1.3;
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * mult));
  }
  if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15);
  if (grade === 3) c.ease = Math.min(3.0, c.ease + 0.15);
  c.reps += 1;
  c.due = startOfDay(now + capToExam(c.interval, now, examAt, spread) * DAY);
  return c;
}

const HARD_MAX = 4;

// Début du jour local : une carte due « dans 3 jours » l'est dès le matin, quelle que soit l'heure de la révision.
export function startOfDay(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime();
}

// Plus grand intervalle (en jours) qui fait revenir la carte avant l'épreuve.
export function capToExam(interval, now, examAt, spread = 0) {
  if (!examAt || now >= examAt) return interval;
  const left = Math.floor((examAt - now) / DAY);
  return Math.max(1, Math.min(interval, left - 1 - Math.max(0, Math.min(2, spread))));
}

// Étalement stable 0..2 à partir de l'identifiant (pour ne pas tout revoir la veille).
export function spreadOf(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 3;
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
// `weight(q)` : facultatif, les nouvelles cartes de poids élevé passent d'abord (notions souvent posées).
export function buildQueue(questions, cards, { newLimit = 20, now = Date.now(), priority = null, weight = null } = {}) {
  const due = [];
  const fresh = [];
  for (const q of questions) {
    const c = cards[q.id];
    if (!c) fresh.push(q);
    else if (isDue(c, now)) due.push(q);
  }
  due.sort((a, b) => cards[a.id].due - cards[b.id].due);
  const byWeight = (list) => (weight ? list.map((q, i) => ({ q, i, w: weight(q) })).sort((a, b) => b.w - a.w || a.i - b.i).map((x) => x.q) : list);
  let alt = [];
  if (priority && priority.length) {
    // Parcours guidé : les nouvelles cartes suivent l'ordre du parcours (étape en cours d'abord),
    // puis le reste de la banque en alternant EC / CAC.
    const byId = new Map(fresh.map((q) => [q.id, q]));
    const seen = new Set();
    for (const id of priority) {
      if (alt.length >= newLimit) break;
      const q = byId.get(id);
      if (q && !seen.has(id)) { alt.push(q); seen.add(id); }
    }
    const rest = byWeight(fresh.filter((q) => !seen.has(q.id)));
    alt = alt.concat(alternate(rest, newLimit - alt.length));
  } else {
    alt = alternate(byWeight(fresh), newLimit);
  }
  return { due, fresh: alt, queue: [...due, ...alt] };
}

// Alterne CAC / EC (CAC en premier : partie la moins bien réussie).
function alternate(list, limit) {
  const ec = list.filter((q) => q.profession === 'EC');
  const cac = list.filter((q) => q.profession === 'CAC');
  const out = [];
  while (out.length < limit && (ec.length || cac.length)) {
    if (cac.length) out.push(cac.shift());
    if (out.length < limit && ec.length) out.push(ec.shift());
  }
  return out;
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

// Note proposée après une réponse. conf : 2 = sûr, 1 = hésitant, 0 = au hasard / je ne sais pas, null = non demandé.
// QCM : `ok`. QRC : `ratio` = part des éléments attendus cochés. Une bonne réponse au hasard ne prouve rien : « Encore ».
export function suggestGrade({ mode, ok = false, ratio = 0, conf = null }) {
  if (mode === 'qrc') {
    if (ratio >= 1) return conf === 0 || conf === 1 ? 1 : 2;
    if (ratio >= 0.5) return conf === 0 ? 0 : 1;
    return 0;
  }
  if (!ok || conf === 0) return 0;
  return conf === 1 ? 1 : 2;
}

// Erreur commise avec certitude : celle que la correction fixe le mieux (effet d'hypercorrection).
export const confidentError = (ok, conf) => conf === 2 && !ok;

// Points d'une QRC d'après les éléments attendus cochés, arrondis au demi-point.
export const qrcPoints = (max, ratio) => Math.round(max * Math.max(0, Math.min(1, ratio)) * 2) / 2;

// Calibration : taux de réussite par niveau de certitude déclaré. attempts : [{ ok, conf }].
export function calibration(attempts) {
  const out = { 2: { n: 0, ok: 0 }, 1: { n: 0, ok: 0 }, 0: { n: 0, ok: 0 } };
  for (const a of attempts) if (a.conf === 0 || a.conf === 1 || a.conf === 2) { out[a.conf].n++; if (a.ok) out[a.conf].ok++; }
  return out;
}

// Questions ratées avec certitude, tant qu'elles n'ont pas été réussies avec certitude depuis.
export function confidentErrors(attempts) {
  const st = new Map();
  for (const a of attempts) {
    if (confidentError(a.ok, a.conf)) st.set(a.id, true);
    else if (a.ok && a.conf === 2 && st.has(a.id)) st.delete(a.id);
  }
  return [...st.keys()];
}
