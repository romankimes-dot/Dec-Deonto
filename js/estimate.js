// Estimation de la note à l'épreuve (10 questions EC + 10 CAC). Logique pure.
//
// Pourquoi ce modèle. Le jour J, le sujet est inédit : sur les dernières sessions, seules 1 à 6 questions sur 20
// sont des quasi-reprises d'annales antérieures (même profession, un sous-thème commun, Jaccard ≥ 0,3 sur
// l'énoncé, comme js/cluster.js ; voir repeatShare). Calculer la note sur la banque déjà révisée (une carte
// d'intervalle ≥ 14 j comptée à 85 %) mesure donc surtout la mémoire de ces questions-là, et flatte la note.
// La chance de réussir une question du sujet mélange deux cas :
//   - quasi-reprise (part R, ≈ 0,2) : ce que l'on sait de la question de la banque (réponses, carte acquise) ;
//   - question inédite (part 1 − R) : le transfert, mesuré par la réussite du sous-thème À LA PREMIÈRE RENCONTRE
//     d'une question (premier essai sur chaque carte : une question encore jamais vue, comme le jour J),
//     a priori la profession, sinon un niveau de départ. La mémoire d'une carte n'y compte plus.
// QRC : même calcul, corrigé du rapport QRC / QCM observé (0,8 par défaut : produire est plus dur que reconnaître).
// Examens blancs : ceux des 14 derniers jours comptent pour 50 % (copies répondues à moins de 50 % exclues).
// Examen inédit : une session entière tenue à l'écart de la révision (voir pickHeldOut) ; c'est la seule mesure
// directe du transfert, son résultat compte pour 60 % de la note du format passé (30 jours).
import { buildRepeatIndex } from './cluster.js';
import { isCounted } from './exam.js';

const BASE = 0.3; // question jamais vue, aucun historique : un peu plus que le hasard
export const REPEAT_SHARE = 0.2; // part de quasi-reprises si elle ne peut être calculée
const TRANSFER = 0.95; // une première rencontre dans la banque reste un peu guidée par les schémas du parcours
const W_BLANC = 0.5, W_INEDIT = 0.6;
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const DAY = 86400000;
const clamp = (v) => Math.min(0.97, Math.max(0.05, v));

// Chance de réussir chaque question DE LA BANQUE (mémoire de la question elle-même).
export function questionProbs(questions, stats, cards, attempts) {
  const acc = {}; const add = (k, ok) => { acc[k] = acc[k] || { ok: 0, n: 0 }; acc[k].n++; if (ok) acc[k].ok++; };
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  for (const a of attempts) { const q = byId[a.id]; if (!q) continue; add(q.profession, a.ok); for (const t of q.tags) add(`${q.profession}:${t}`, a.ok); }
  const rate = (k, min) => (acc[k] && acc[k].n >= min ? acc[k].ok / acc[k].n : null);
  const p = {};
  for (const q of questions) {
    const tagRates = q.tags.map((t) => rate(`${q.profession}:${t}`, 3)).filter((x) => x !== null);
    const prior = tagRates.length ? tagRates.reduce((s, x) => s + x, 0) / tagRates.length : rate(q.profession, 5) ?? BASE;
    const s = stats?.q?.[q.id];
    let v = s ? (s.ok + 2 * prior) / (s.ok + s.ko + 2) : prior;
    if (s && s.last === 'ko') v *= 0.8; // dernière réponse ratée
    const c = cards[q.id];
    if (c && c.reps > 0 && c.interval >= 14) v = Math.max(v, 0.85);
    p[q.id] = clamp(v);
  }
  return p;
}

// Chance de réussir une question INÉDITE du même sous-thème : premier essai sur chaque question.
export function transferProbs(questions, attempts) {
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  const first = new Map();
  for (const a of attempts) if (byId[a.id] && !first.has(a.id)) first.set(a.id, !!a.ok);
  const acc = {}; const add = (k, ok) => { acc[k] = acc[k] || { ok: 0, n: 0 }; acc[k].n++; if (ok) acc[k].ok++; };
  for (const [id, ok] of first) { const q = byId[id]; add(q.profession, ok); for (const t of q.tags) add(`${q.profession}:${t}`, ok); }
  const smooth = (k, prior, w) => (acc[k] ? (acc[k].ok + w * prior) / (acc[k].n + w) : prior);
  const p = {};
  for (const q of questions) {
    const prof = smooth(q.profession, BASE, 5);
    const tags = q.tags.map((t) => smooth(`${q.profession}:${t}`, prof, 3));
    const v = tags.length ? tags.reduce((s, x) => s + x, 0) / tags.length : prof;
    p[q.id] = clamp(v * TRANSFER);
  }
  return p;
}

// Part des questions des `lastN` dernières sessions qui reprennent presque une question d'une session antérieure.
const repeatCache = new WeakMap();
export function repeatShare(questions, lastN = 6) {
  if (repeatCache.has(questions)) return repeatCache.get(questions);
  const { hasEarlier } = buildRepeatIndex(questions);
  const sessions = [...new Set(questions.map((q) => q.session).filter(Boolean))].sort().slice(-lastN);
  const qs = questions.filter((q) => sessions.includes(q.session));
  const r = sessions.length >= 2 && qs.length ? qs.filter((q) => hasEarlier.has(q.id)).length / qs.length : REPEAT_SHARE;
  repeatCache.set(questions, r);
  return r;
}

// Rapport de réussite QRC / QCM observé (au moins 10 réponses de chaque), sinon 0,8.
export function qrcRatio(attempts) {
  const m = { qcm: { ok: 0, n: 0 }, qrc: { ok: 0, n: 0 } };
  for (const a of attempts) if (m[a.mode]) { m[a.mode].n++; if (a.ok) m[a.mode].ok++; }
  if (m.qcm.n < 10 || m.qrc.n < 10 || !m.qcm.ok) return 0.8;
  return Math.min(1, Math.max(0.4, (m.qrc.ok / m.qrc.n) / (m.qcm.ok / m.qcm.n)));
}

// Session tenue à l'écart de la révision pour l'examen inédit : la plus récente dont aucune question n'a encore
// été vue (carte, réponse, examen). Le sujet le plus récent ressemble le plus au prochain ; si l'utilisateur
// n'a rien vu, c'est la dernière session (2026-05). null si toutes les sessions ont déjà été entamées.
export function pickHeldOut(questions, { cards = {}, stats = {}, attempts = [], examSeen = {} } = {}) {
  const touched = new Set([...Object.keys(cards), ...Object.keys(examSeen), ...attempts.map((a) => a.id),
    ...Object.entries(stats?.q || {}).filter(([, s]) => s && s.seen > 0).map(([id]) => id)]);
  const sessions = [...new Set(questions.map((q) => q.session).filter(Boolean))].sort().reverse();
  for (const s of sessions) {
    const qs = questions.filter((q) => q.session === s);
    if (qs.filter((q) => q.profession === 'EC').length >= 10 && qs.filter((q) => q.profession === 'CAC').length >= 10 && !qs.some((q) => touched.has(q.id))) return s;
  }
  return null;
}

// `repeat` : part de quasi-reprises imposée (tests) ; sinon calculée sur la banque.
export function estimate({ questions, stats, cards, attempts, exams = [], now = Date.now(), repeat = null }) {
  const mem = questionProbs(questions, stats, cards, attempts);
  const fresh = transferProbs(questions, attempts);
  const R = repeat ?? repeatShare(questions);
  const p = {};
  for (const q of questions) p[q.id] = R * mem[q.id] + (1 - R) * fresh[q.id];
  const mean = (prof) => { const qs = questions.filter((q) => q.profession === prof); return qs.reduce((s, q) => s + p[q.id], 0) / Math.max(1, qs.length); };
  const ec = mean('EC'), cac = mean('CAC');
  const ratio = qrcRatio(attempts);
  const seen = questions.filter((q) => stats?.q?.[q.id]?.seen > 0).length;
  const counted = exams.filter(isCounted);
  const out = {};
  for (const mode of ['qcm', 'qrc']) {
    const f = mode === 'qrc' ? ratio : 1;
    const pe = Math.min(0.97, ec * f), pc = Math.min(0.97, cac * f);
    let note = 10 * pe + 10 * pc;
    const recent = counted.filter((e) => !e.inedit && e.mode === mode && now - e.t < 14 * DAY).slice(-2);
    if (recent.length) note = (1 - W_BLANC) * note + W_BLANC * (recent.reduce((s, e) => s + e.note, 0) / recent.length);
    const inedit = counted.filter((e) => e.inedit && e.mode === mode && now - e.t < 30 * DAY).at(-1);
    if (inedit) note = (1 - W_INEDIT) * note + W_INEDIT * inedit.note;
    const sd = Math.sqrt(10 * pe * (1 - pe) + 10 * pc * (1 - pc)) || 1;
    out[mode] = {
      note: Math.round(note * 2) / 2, low: Math.max(0, Math.round((note - sd) * 2) / 2), high: Math.min(20, Math.round((note + sd) * 2) / 2),
      ec: Math.round(pe * 100), cac: Math.round(pc * 100),
      risk: Math.round(phi((5.5 - note) / sd) * 100), // note éliminatoire (< 6)
      pass: Math.round((1 - phi((9.75 - note) / sd)) * 100), // 10 et plus
      exams: recent.length, inedit: inedit ? inedit.note : null,
    };
  }
  const coverage = seen / Math.max(1, questions.length);
  return { ...out, seen, coverage, reliable: coverage >= 0.6, probs: p, repeat: R };
}
