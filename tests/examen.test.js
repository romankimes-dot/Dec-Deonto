import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startExam, finishExam, remainingMs, pauseExam, resumePaused, answeredCount, isCounted, EXAM_DURATION_MS } from '../js/exam.js';
import { estimate, repeatShare, pickHeldOut, transferProbs } from '../js/estimate.js';
import { buildRepeatIndex } from '../js/cluster.js';
import { readDone, atBottom, fitsScreen, markGameDone, READ_MIN_MS, READ_FIT_MS } from '../js/plan.js';
import { applyExam, emptyStats } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8')).questions;
const byId = Object.fromEntries(bank.map((q) => [q.id, q]));
const MIN = 60000;

test('copie : questions répondues, copie à moins de 50 % non comptée', () => {
  const ex = startExam(bank, {}, 'qcm', 0);
  ex.ids.slice(0, 3).forEach((id) => { ex.answers[id] = byId[id].qcm.answer; });
  assert.equal(answeredCount(ex), 3);
  const res = finishExam(ex, byId, 10 * MIN);
  assert.equal(res.answered, 3);
  assert.equal(isCounted(res), false, '3/20 répondues : exclue');
  ex.ids.slice(3, 10).forEach((id) => { ex.answers[id] = 0; });
  assert.equal(isCounted(finishExam(ex, byId, 10 * MIN)), true, '10/20 : comptée');
  assert.equal(isCounted({ note: 12, ids: ex.ids }), true, 'copie ancienne sans le champ : comptée');
  const qrc = startExam(bank, {}, 'qrc', 0); qrc.answers[qrc.ids[0]] = '   ';
  assert.equal(answeredCount(qrc), 0, 'QRC : une réponse vide ne compte pas');
});

test('pause : chrono arrêté, échéance repoussée, durée de composition sans la pause', () => {
  const ex = startExam(bank, {}, 'qcm', 0);
  pauseExam(ex, 10 * MIN);
  assert.equal(remainingMs(ex, 30 * MIN), 50 * MIN, 'figé pendant la pause');
  resumePaused(ex, 30 * MIN);
  assert.equal(ex.pausedAt, null);
  assert.equal(remainingMs(ex, 30 * MIN), 50 * MIN);
  assert.equal(ex.endsAt, EXAM_DURATION_MS + 20 * MIN);
  assert.equal(finishExam(ex, byId, 40 * MIN).durationMs, 20 * MIN);
});

test('examen inédit : sujet imposé, marqué dans le résultat', () => {
  const s = bank.filter((q) => q.session === '2026-05');
  const ex = startExam(bank, {}, 'qrc', 0, s); ex.inedit = '2026-05';
  assert.deepEqual(ex.ids, s.map((q) => q.id));
  assert.equal(finishExam(ex, byId, MIN).inedit, '2026-05');
});

test('badges : une copie rendue presque blanche ne compte pas', () => {
  const st = emptyStats();
  applyExam(st, { t: 1, mode: 'qcm', note: 2, ids: Array(20).fill('x'), answered: 3, byProf: {} });
  assert.equal(st.exams.length, 0);
  applyExam(st, { t: 2, mode: 'qcm', note: 12, ids: Array(20).fill('x'), answered: 20, byProf: {} });
  assert.equal(st.exams.length, 1);
});

// Banque fictive : 40 questions, 4 sous-thèmes.
const qs = [...Array(40)].map((_, i) => ({ id: `q${i}`, profession: i < 20 ? 'EC' : 'CAC', tags: [`t${i % 4}`], session: `20${10 + (i % 5)}-05`, question: `énoncé numéro ${i}` }));
const okAll = () => { const q = {}; const attempts = []; qs.forEach((x) => { q[x.id] = { seen: 3, ok: 3, ko: 0, last: 'ok' }; for (let k = 0; k < 3; k++) attempts.push({ id: x.id, ok: true, mode: 'qcm' }); }); return { stats: { q }, attempts }; };

test('estimation : une copie à 3/20 répondues ne fait pas chuter la note', () => {
  const now = 100 * 86400000; const { stats, attempts } = okAll();
  const base = estimate({ repeat: 0.2, questions: qs, stats, cards: {}, attempts, now });
  const ids = qs.slice(0, 20).map((q) => q.id);
  const withBlank = estimate({ repeat: 0.2, questions: qs, stats, cards: {}, attempts, now, exams: [{ t: now - 1000, mode: 'qcm', note: 0, ids, answered: 3 }] });
  assert.equal(withBlank.qcm.note, base.qcm.note);
  assert.equal(withBlank.qcm.risk, base.qcm.risk);
  const withFull = estimate({ repeat: 0.2, questions: qs, stats, cards: {}, attempts, now, exams: [{ t: now - 1000, mode: 'qcm', note: 4, ids, answered: 20 }] });
  assert.ok(withFull.qcm.note < base.qcm.note, 'une vraie copie compte');
});

test('estimation : cartes mémorisées plafonnées, le transfert (premier essai) domine', () => {
  // Chaque question ratée au premier essai, puis apprise par cœur (carte à 30 jours).
  const q = {}; const attempts = []; const cards = {};
  qs.forEach((x) => { attempts.push({ id: x.id, ok: false, mode: 'qcm' }); for (let k = 0; k < 4; k++) attempts.push({ id: x.id, ok: true, mode: 'qcm' }); q[x.id] = { seen: 5, ok: 4, ko: 1, last: 'ok' }; cards[x.id] = { reps: 4, interval: 30, lapses: 1 }; });
  const e = estimate({ repeat: 0.2, questions: qs, stats: { q }, cards, attempts });
  assert.ok(e.qcm.note < 10, `mémoire des annales seule : ${e.qcm.note}/20 attendu sous 10`);
  const fresh = transferProbs(qs, attempts);
  assert.ok(Object.values(fresh).every((p) => p < 0.3));
  // Réussite au premier essai : le niveau monte franchement.
  const { stats: s2, attempts: a2 } = okAll();
  assert.ok(estimate({ repeat: 0.2, questions: qs, stats: s2, cards, attempts: a2 }).qcm.note > 14);
});

test('estimation : l’examen inédit compte plus qu’un examen blanc', () => {
  const now = 100 * 86400000; const { stats, attempts } = okAll(); const ids = qs.slice(0, 20).map((q) => q.id);
  const blanc = estimate({ repeat: 0.2, questions: qs, stats, cards: {}, attempts, now, exams: [{ t: now - 1000, mode: 'qcm', note: 8, ids, answered: 20 }] });
  const inedit = estimate({ repeat: 0.2, questions: qs, stats, cards: {}, attempts, now, exams: [{ t: now - 1000, mode: 'qcm', note: 8, ids, answered: 20, inedit: '2026-05' }] });
  assert.ok(inedit.qcm.note < blanc.qcm.note, `${inedit.qcm.note} < ${blanc.qcm.note}`);
  assert.equal(inedit.qcm.inedit, 8); assert.equal(inedit.qrc.inedit, null, 'seulement le format passé');
});

test('quasi-reprises : 1 à 6 questions sur 20 aux dernières sessions (Jaccard 0,3)', () => {
  const { hasEarlier } = buildRepeatIndex(bank);
  for (const s of ['2025-05', '2025-11', '2026-05']) {
    const n = bank.filter((q) => q.session === s && hasEarlier.has(q.id)).length;
    assert.ok(n >= 1 && n <= 6, `${s} : ${n}`);
  }
  const r = repeatShare(bank);
  assert.ok(r > 0.05 && r < 0.3, String(r));
});

test('examen inédit : la session la plus récente jamais vue', () => {
  assert.equal(pickHeldOut(bank, {}), '2026-05', 'rien vu : mai 2026');
  const id = bank.find((q) => q.session === '2026-05').id;
  assert.equal(pickHeldOut(bank, { cards: { [id]: {} } }), '2025-11');
  assert.equal(pickHeldOut(bank, { attempts: [{ id }] }), '2025-11');
  assert.equal(pickHeldOut(bank, { stats: { q: { [id]: { seen: 1 } } } }), '2025-11');
  assert.equal(pickHeldOut(bank, { stats: { q: { [id]: { seen: 0 } } } }), '2026-05');
  assert.equal(pickHeldOut(bank, { examSeen: Object.fromEntries(bank.map((q) => [q.id, 1])) }), null, 'tout entamé : aucune');
});

test('plan : schéma lu seulement après défilement jusqu’en bas ou temps minimal', () => {
  const long = { top: 0, height: 700, total: 3000 };
  assert.equal(atBottom(long), false); assert.equal(fitsScreen(long), false);
  assert.equal(atBottom({ ...long, top: 2280 }), true);
  assert.equal(readDone({ reachedBottom: false, fits: false, elapsedMs: 10 * MIN }), false, 'ouvert longtemps sans défiler : non lu');
  assert.equal(readDone({ reachedBottom: true, fits: false, elapsedMs: 3000 }), false, 'défilement éclair : non lu');
  assert.equal(readDone({ reachedBottom: true, fits: false, elapsedMs: READ_MIN_MS }), true);
  const short = { top: 0, height: 700, total: 680 };
  assert.equal(fitsScreen(short), true);
  assert.equal(readDone({ reachedBottom: true, fits: true, elapsedMs: READ_FIT_MS - 1 }), false, 'à l’ouverture : non lu');
  assert.equal(readDone({ reachedBottom: true, fits: true, elapsedMs: READ_FIT_MS }), true);
});

test('plan : jeu du jour noté à la fin de la partie, une semaine gardée', () => {
  const plan = {};
  markGameDone(plan, '2026-10-26', 'duel'); markGameDone(plan, '2026-10-26', 'duel'); markGameDone(plan, '2026-10-26', 'vf');
  assert.deepEqual(plan.gamesDone['2026-10-26'], ['duel', 'vf']);
  for (let d = 10; d <= 25; d++) markGameDone(plan, `2026-10-${d}`, 'duel');
  assert.equal(Object.keys(plan.gamesDone).length, 7);
  assert.ok(plan.gamesDone['2026-10-26']);
});
