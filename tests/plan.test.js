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
