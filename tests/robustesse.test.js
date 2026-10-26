import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startExam, finishExam, remainingMs, EXAM_DURATION_MS } from '../js/exam.js';
import { buildContext, emptyStats, applyAnswer, rebuildStats, mergeStats } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));
const ctx = buildContext(bank);
const T0 = new Date(2026, 9, 1, 12).getTime();
const MIN = 60000;

// localStorage de remplacement ; quota : toute écriture échoue comme un stockage plein
function mockStorage({ quota = false } = {}) {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
  return m;
}
const store = await import('../js/store.js');

// ---------- Examen ----------
test('examen : 10 EC + 10 CAC, durée 60 min', () => {
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  assert.equal(ex.ids.length, 20);
  assert.equal(ex.ids.filter((id) => byId[id].profession === 'EC').length, 10);
  assert.equal(ex.endsAt - ex.startedAt, EXAM_DURATION_MS);
  assert.equal(remainingMs(ex, T0 + 10 * MIN), 50 * MIN);
});

test('finishExam QCM : note, détail par profession, durée réelle', () => {
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  ex.ids.forEach((id, i) => { if (i % 2 === 0) ex.answers[id] = byId[id].qcm.answer; });
  const r = finishExam(ex, byId, T0 + 25 * MIN);
  assert.equal(r.note, 10);
  assert.equal(r.durationMs, 25 * MIN);
  assert.equal(r.byProf.EC.n + r.byProf.CAC.n, 20);
  assert.equal(r.byProf.EC.points + r.byProf.CAC.points, 10);
  assert.equal(r.rows.length, 20);
});

test('finishExam QRC : points auto-attribués plafonnés au barème', () => {
  const ex = startExam(bank.questions, {}, 'qrc', T0);
  for (const id of ex.ids) ex.grading[id] = 99;
  const r = finishExam(ex, byId, T0 + MIN);
  assert.equal(r.note, 20);
  assert.ok(r.rows.every((x) => x.points === x.max));
});

test('reprise après expiration : temps écoulé, durée plafonnée à 60 min, réponses gardées', () => {
  mockStorage();
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  ex.answers[ex.ids[0]] = byId[ex.ids[0]].qcm.answer; ex.current = 5;
  store.saveExam(ex);
  const back = store.loadExam();
  const later = T0 + 3 * 60 * MIN; // rouvert 3 h plus tard
  assert.equal(remainingMs(back, later), 0);
  assert.equal(back.current, 5);
  const r = finishExam(back, byId, later);
  assert.equal(r.durationMs, EXAM_DURATION_MS);
  assert.equal(r.note, 1);
  store.saveExam(null);
  assert.equal(store.loadExam(), null);
});

// ---------- Stockage plein ----------
test('save : quota plein, échec signalé sans exception ni perte de l’état sauvegardé', () => {
  const m = mockStorage();
  const s = store.defaultState(); s.cards.a = { due: 1 };
  assert.equal(store.save(s), true);
  const before = m.get('dec1.progress.v1');
  globalThis.localStorage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  s.cards.b = { due: 2 };
  assert.equal(store.save(s), false);
  assert.equal(m.get('dec1.progress.v1'), before);
  assert.deepEqual(Object.keys(store.load().cards), ['a']);
  mockStorage({ quota: true });
  assert.equal(store.save(s), false);
  assert.doesNotThrow(() => store.saveExam({ mode: 'qcm' }));
});

// ---------- Statistiques : historique tronqué ----------
test('rebuildStats : l’historique tronqué ne fait pas baisser compteurs ni records', () => {
  const ids = ctx.all.slice(0, 50);
  const attempts = [];
  for (let i = 0; i < 600; i++) attempts.push({ id: ids[i % 50], ok: i < 150 || i % 50 !== 49, t: T0 + i * MIN });
  const full = emptyStats();
  for (const a of attempts) applyAnswer(full, a, ctx);
  // Changement de version des stats : recalcul sur les 400 dernières réponses seulement
  const rebuilt = rebuildStats({ attempts: attempts.slice(-400), exams: [], stats: full }, ctx);
  const bare = rebuildStats({ attempts: attempts.slice(-400), exams: [] }, ctx);
  assert.ok(bare.streak.best < full.streak.best, 'le recalcul seul perdrait le record');
  assert.equal(rebuilt.streak.best, full.streak.best);
  for (const id of ids) assert.equal(rebuilt.q[id].seen, full.q[id].seen);
  assert.deepEqual(rebuilt.days, full.days);
});

test('mergeStats : questions et examens disparus de l’historique conservés, drapeaux réunis', () => {
  const prev = emptyStats();
  applyAnswer(prev, { id: ctx.all[0], ok: true, t: T0 }, ctx);
  prev.flags.avion = true;
  prev.exams.push({ t: T0, mode: 'qcm', note: 15, durationMs: MIN, cacOk: false });
  const m = mergeStats(emptyStats(), prev);
  assert.equal(m.q[ctx.all[0]].ok, 1);
  assert.equal(m.flags.avion, true);
  assert.equal(m.exams.length, 1);
  assert.equal(mergeStats(emptyStats(), null).exams.length, 0);
});
