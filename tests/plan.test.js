import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, currentIndex, priorityIds, stepQuestionIds, stepProgress } from '../js/plan.js';
import { buildQueue, mastery } from '../js/srs.js';

const idx = [
  { file: '10-schema-cadre-normatif.md', questions: ['a1', 'a2', 'a3'] },
  { file: '11-schema-niveaux-assurance.md', questions: ['a2', 'a4'] },
  { file: '12-schema-institutions-ec-cac.md', questions: ['b1', 'b2'] },
  { file: '14-schema-mandat-cac.md', questions: ['c1'] },
];
const qs = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'c1', 'z1', 'z2'].map((id) => ({ id, profession: id.startsWith('c') || id === 'z2' ? 'CAC' : 'EC' }));

test('étape en cours : la première non terminée, ou celle choisie', () => {
  assert.equal(currentIndex({}), 0);
  assert.equal(currentIndex({ done: { cadre: 1 } }), 1);
  assert.equal(currentIndex({ done: { cadre: 1 }, focus: 'mandat' }), STEPS.findIndex((s) => s.id === 'mandat'));
  assert.equal(currentIndex({ done: { cadre: 1 }, focus: 'cadre' }), 1, 'une étape terminée ne peut pas être « choisie »');
  assert.equal(currentIndex({ done: Object.fromEntries(STEPS.map((s) => [s.id, 1])) }), STEPS.length);
});

test('questions d’une étape : union dédoublonnée des schémas', () => {
  assert.deepEqual(stepQuestionIds(STEPS[0], idx), ['a1', 'a2', 'a3', 'a4']);
});

test('priorité : étape en cours, puis les suivantes, puis les terminées', () => {
  assert.deepEqual(priorityIds({}, idx).slice(0, 4), ['a1', 'a2', 'a3', 'a4']);
  const p = priorityIds({ done: { cadre: 1 } }, idx);
  assert.deepEqual(p.slice(0, 3), ['b1', 'b2', 'c1']);
  assert.deepEqual(p.slice(-4), ['a1', 'a2', 'a3', 'a4']);
});

test('file du jour : les nouvelles cartes suivent le parcours, pas l’ordre des annales', () => {
  const { fresh } = buildQueue(qs, {}, { newLimit: 3, priority: priorityIds({}, idx) });
  assert.deepEqual(fresh.map((q) => q.id), ['a1', 'a2', 'a3']);
});

test('file du jour : complétée par le reste de la banque quand l’étape est épuisée', () => {
  const { fresh } = buildQueue(qs, {}, { newLimit: 7, priority: ['a1', 'c1'] });
  assert.deepEqual(fresh.slice(0, 2).map((q) => q.id), ['a1', 'c1']);
  assert.equal(fresh.length, 7);
  assert.equal(new Set(fresh.map((q) => q.id)).size, 7);
});

test('file du jour sans parcours : comportement inchangé (CAC puis EC)', () => {
  const { fresh } = buildQueue(qs, {}, { newLimit: 4 });
  assert.deepEqual(fresh.map((q) => q.profession), ['CAC', 'EC', 'CAC', 'EC']);
});

test('avancement : vues et acquises', () => {
  const cards = { a1: { reps: 3, interval: 14, lapses: 0 }, a2: { reps: 1, interval: 1, lapses: 0 } };
  assert.deepEqual(stepProgress(STEPS[0], idx, cards, mastery), { total: 4, seen: 2, known: 1 });
});

test('chaque schéma du parcours existe dans l’index réel des fiches', async () => {
  const { readFileSync } = await import('node:fs');
  const real = JSON.parse(readFileSync(new URL('../data/fiches/index.json', import.meta.url), 'utf8'));
  for (const st of STEPS) for (const f of [...(st.fiches || []), ...(st.deep || [])]) assert.ok(real.some((x) => x.file === f), f);
  for (const st of STEPS.filter((s) => s.kind === 'schema')) assert.ok(stepQuestionIds(st, real).length > 0, st.id);
});

import { schedule, newTarget, tagStats, adaptiveWeight, gameOfDay, daysUntil, validateExamDate, examKeyOf } from '../js/plan.js';
import { estimate } from '../js/estimate.js';

test('plan jour par jour : étapes réparties, quatre derniers jours fixes', () => {
  const undone = STEPS.filter((s) => s.kind === 'schema').map((s) => s.id);
  const days = schedule('2026-10-24', '2026-11-10', undone);
  assert.equal(days.length, 17);
  assert.equal(days[0].n, 17); assert.equal(days.at(-1).n, 1);
  assert.deepEqual(days.flatMap((d) => d.steps), undone, 'chaque étape une fois, dans l’ordre');
  assert.deepEqual(days.slice(-4).map((d) => [d.kind, d.exam]), [['blanc', 'qcm'], ['blanc', 'qrc'], ['faibles', null], ['veille', null]]);
  assert.equal(days.find((d) => d.n === 10).exam, 'qcm');
  assert.equal(days.filter((d) => d.exam).length, 4, 'quatre examens blancs : J-10, J-7, J-4, J-3');
  // En retard : tout ce qui reste est tassé sur les jours d'étude restants.
  const late = schedule('2026-11-03', '2026-11-10', undone);
  assert.deepEqual(late.flatMap((d) => d.steps), undone);
  assert.ok(late.slice(0, 3).every((d) => d.steps.length >= 3));
  assert.equal(schedule('2026-11-10', '2026-11-10', [])[0].kind, 'jour-j');
  assert.equal(daysUntil('2026-10-31', '2026-11-01'), 1);
});
test('objectif de nouvelles cartes : tout voir à J-3, allégé si beaucoup de cartes attendent', () => {
  assert.equal(newTarget(320, 17, 20), 23);
  assert.equal(newTarget(10, 17, 20), 10);
  assert.equal(newTarget(320, 17, 20, 80), 12);
  assert.equal(newTarget(50, 2, 20), 0);
});
test('adaptation : sous-thème faible en tête, point fort en retrait, jeu le plus raté', () => {
  const byId = { a: { id: 'a', profession: 'EC', tags: ['lcb_ft'] }, b: { id: 'b', profession: 'EC', tags: ['honoraires'] } };
  const att = [...Array(4)].map(() => ({ id: 'a', ok: false })).concat([...Array(6)].map(() => ({ id: 'b', ok: true })));
  const ts = tagStats(att, byId);
  assert.equal(ts.weak[0].tag, 'lcb_ft'); assert.equal(ts.strong[0].tag, 'honoraires');
  assert.ok(adaptiveWeight(byId.a, ts, 0) > adaptiveWeight({ profession: 'EC', tags: ['x'] }, ts, 0));
  assert.ok(adaptiveWeight(byId.b, ts, 0) < 0);
  assert.equal(gameOfDay('2026-10-24', { 'num:1': { ok: 1, n: 6 }, 'duel:1': { ok: 9, n: 10 } }), 'chiffres');
});
test('estimation : monte avec les réussites, risque d’éliminatoire cohérent', () => {
  const questions = [...Array(40)].map((_, i) => ({ id: `q${i}`, profession: i < 20 ? 'EC' : 'CAC', tags: ['t'] }));
  const none = estimate({ questions, stats: { q: {} }, cards: {}, attempts: [] });
  const q = {}; const attempts = [];
  questions.forEach((x) => { q[x.id] = { seen: 3, ok: 3, ko: 0, last: 'ok' }; for (let k = 0; k < 3; k++) attempts.push({ id: x.id, ok: true, mode: 'qcm' }); });
  const good = estimate({ questions, stats: { q }, cards: {}, attempts });
  assert.ok(good.qcm.note > 14 && none.qcm.note < 8, `${none.qcm.note} → ${good.qcm.note}`);
  assert.ok(good.qcm.risk < 1 && none.qcm.risk > 30);
  assert.ok(good.qrc.note < good.qcm.note, 'produire est plus dur que reconnaître');
  assert.equal(good.reliable, true); assert.equal(none.reliable, false);
});

const SCHEMAS = STEPS.filter((s) => s.kind === 'schema').map((s) => s.id);
test('date d’examen : validation (future seulement) et parcours générique si absente', () => {
  assert.deepEqual(validateExamDate('2026-11-10T10:30', '2026-10-26'), { ok: true, key: '2026-11-10' });
  assert.equal(validateExamDate('2026-11-10', '2026-10-26').ok, true);
  assert.equal(validateExamDate('2026-10-26T10:30', '2026-10-26').reason, 'passee');
  assert.equal(validateExamDate('2026-10-01', '2026-10-26').reason, 'passee');
  assert.equal(validateExamDate('', '2026-10-26').reason, 'format');
  assert.equal(validateExamDate('2026-02-30', '2026-01-01').reason, 'format');
  assert.equal(examKeyOf('2026-11-10T10:30:00', '2026-10-01'), '2026-11-10');
  assert.equal(examKeyOf('', '2026-10-01'), '2026-10-29', 'sans date : J-28 le premier jour');
  assert.equal(schedule('2026-10-01', examKeyOf('', '2026-10-01'), SCHEMAS)[0].n, 28);
});
test('délai court : aucune étape ni journée fixe supprimée, tout regroupé sur aujourd’hui', () => {
  for (const n of [1, 2, 3, 4]) {
    const exam = `2026-11-${String(10).padStart(2, '0')}`;
    const today = new Date(Date.UTC(2026, 10, 10 - n)).toISOString().slice(0, 10);
    const days = schedule(today, exam, SCHEMAS);
    assert.equal(days.length, n);
    assert.deepEqual(days.flatMap((d) => d.steps), SCHEMAS, `J-${n} : toutes les étapes`);
    const kinds = days.flatMap((d) => [d.exam && `blanc-${d.exam}`, d.kind === 'faibles' && 'faibles', d.kind === 'veille' && 'veille', ...(d.merged || []).map((m) => m.kind === 'blanc' ? `blanc-${m.exam}` : m.kind)]).filter(Boolean);
    assert.deepEqual(kinds.sort(), ['blanc-qcm', 'blanc-qrc', 'faibles', 'veille'].sort(), `J-${n} : examens blancs, points faibles, veille`);
  }
  const j5 = schedule('2026-11-05', '2026-11-10', SCHEMAS);
  assert.deepEqual(j5.flatMap((d) => d.steps), SCHEMAS);
  assert.equal(j5[0].steps.length, SCHEMAS.length, 'une seule journée d’étude : tout dessus');
});
test('délai long : étapes espacées régulièrement, révisions espacées à +2 et +6 jours', () => {
  const days = schedule('2026-08-01', '2026-11-10', SCHEMAS);
  assert.deepEqual(days.flatMap((d) => d.steps), SCHEMAS);
  const withSteps = days.filter((d) => d.steps.length);
  assert.ok(withSteps.every((d) => d.steps.length === 1));
  const gaps = withSteps.slice(1).map((d, i) => daysUntil(withSteps[i].key, d.key));
  assert.ok(gaps.every((g) => g === gaps[0] && g > 1), `espacement régulier : ${gaps}`);
  const first = withSteps[0]; const i0 = days.indexOf(first);
  assert.ok(days[i0 + 2].revise.includes(first.steps[0]) && days[i0 + 6].revise.includes(first.steps[0]));
  assert.ok(days.slice(-4).every((d) => d.revise.length === 0), 'rien à relire pendant les quatre derniers jours');
  assert.deepEqual(days.slice(-4).map((d) => d.kind), ['blanc', 'blanc', 'faibles', 'veille']);
});
