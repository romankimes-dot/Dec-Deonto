// Estimation de la note à l'épreuve (10 questions EC + 10 CAC tirées dans la banque). Logique pure.
// Probabilité de réussir chaque question : ses propres réponses (loi bêta), avec pour a priori la réussite du
// sous-thème, sinon de la profession, sinon un niveau de départ. Carte acquise (intervalle ≥ 14 j) : 85 % au moins.
// QRC : même calcul, corrigé du rapport QRC / QCM observé (0,8 par défaut : produire est plus dur que reconnaître).
// Les examens blancs récents (7 jours) comptent pour 40 %.

const BASE = 0.3; // question jamais vue, aucun historique : un peu plus que le hasard
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const DAY = 86400000;

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
    p[q.id] = Math.min(0.97, Math.max(0.05, v));
  }
  return p;
}

// Rapport de réussite QRC / QCM observé (au moins 10 réponses de chaque), sinon 0,8.
export function qrcRatio(attempts) {
  const m = { qcm: { ok: 0, n: 0 }, qrc: { ok: 0, n: 0 } };
  for (const a of attempts) if (m[a.mode]) { m[a.mode].n++; if (a.ok) m[a.mode].ok++; }
  if (m.qcm.n < 10 || m.qrc.n < 10 || !m.qcm.ok) return 0.8;
  return Math.min(1, Math.max(0.4, (m.qrc.ok / m.qrc.n) / (m.qcm.ok / m.qcm.n)));
}

export function estimate({ questions, stats, cards, attempts, exams = [], now = Date.now() }) {
  const p = questionProbs(questions, stats, cards, attempts);
  const mean = (prof) => { const qs = questions.filter((q) => q.profession === prof); return qs.reduce((s, q) => s + p[q.id], 0) / Math.max(1, qs.length); };
  const ec = mean('EC'), cac = mean('CAC');
  const ratio = qrcRatio(attempts);
  const seen = questions.filter((q) => stats?.q?.[q.id]?.seen > 0).length;
  const out = {};
  for (const mode of ['qcm', 'qrc']) {
    const f = mode === 'qrc' ? ratio : 1;
    const pe = Math.min(0.97, ec * f), pc = Math.min(0.97, cac * f);
    let note = 10 * pe + 10 * pc;
    const recent = exams.filter((e) => e.mode === mode && now - e.t < 7 * DAY).slice(-2);
    if (recent.length) note = 0.6 * note + 0.4 * (recent.reduce((s, e) => s + e.note, 0) / recent.length);
    const sd = Math.sqrt(10 * pe * (1 - pe) + 10 * pc * (1 - pc)) || 1;
    out[mode] = {
      note: Math.round(note * 2) / 2, low: Math.max(0, Math.round((note - sd) * 2) / 2), high: Math.min(20, Math.round((note + sd) * 2) / 2),
      ec: Math.round(pe * 100), cac: Math.round(pc * 100),
      risk: Math.round(phi((5.5 - note) / sd) * 100), // note éliminatoire (< 6)
      pass: Math.round((1 - phi((9.75 - note) / sd)) * 100), // 10 et plus
      exams: recent.length,
    };
  }
  const coverage = seen / Math.max(1, questions.length);
  return { ...out, seen, coverage, reliable: coverage >= 0.6, probs: p };
}
