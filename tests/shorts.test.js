import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildFeed, spreadTypes, validateShort, linkedQuestions, shortsStats, memoId } from '../js/shorts.js';
import { STEPS } from '../js/plan.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('shorts publiés : format, sous-thèmes, ancrage dans les fiches, index', () => {
  const bank = JSON.parse(read('data/questions.json'));
  const tags = new Set(bank.questions.flatMap((q) => q.tags));
  const fiches = Object.fromEntries(readdirSync(new URL('data/fiches/', root)).filter((f) => f.endsWith('.md')).map((f) => [f, read(`data/fiches/${f}`)]));
  const index = JSON.parse(read('data/shorts/index.json'));
  const schema = STEPS.filter((s) => s.kind === 'schema').map((s) => s.id);
  const ids = new Set();
  for (const step of index) {
    assert.ok(schema.includes(step), `${step} : étape inconnue`);
    const data = JSON.parse(read(`data/shorts/${step}.json`));
    assert.equal(data.step, step);
    for (const s of data.shorts) {
      assert.deepEqual(validateShort(s, { step, tags, fiches }), [], s.id);
      assert.ok(!ids.has(s.id), `${s.id} en double`); ids.add(s.id);
    }
  }
  const files = readdirSync(new URL('data/shorts/', root)).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => f.slice(0, -5));
  assert.deepEqual([...files].sort(), [...index].sort(), 'index.json liste tous les fichiers');
  assert.ok(ids.size >= 150);
});

test('validation : extrait absent de la fiche, choix hors limites', () => {
  const ctx = { step: 'cadre', tags: new Set(['nep']), fiches: { 'f.md': 'Le **barème** fixe un nombre d’heures.' } };
  const ok = { id: 'cadre-01', type: 'vf', prof: 'CAC', tags: ['nep'], fiche: 'f.md', title: 'T', statement: 'S', verdict: true, why: 'W', src: ["le barème fixe un nombre d'heures"] };
  assert.deepEqual(validateShort(ok, ctx), []);
  assert.match(validateShort({ ...ok, src: ['un tarif en euros'] }, ctx).join(), /src introuvable/);
  assert.match(validateShort({ ...ok, id: 'mandat-01' }, ctx).join(), /doit commencer/);
  const cas = { ...ok, type: 'cas', situation: 'S', quiz: { q: 'Q', choices: ['a', 'b'], answer: 2, why: 'W' } };
  assert.match(validateShort(cas, ctx).join(), /quiz\.answer/);
});

const sh = (id, step, type = 'vf', prof = 'CAC', tags = ['x']) => ({ id, step, type, prof, tags });
const steps = ['a', 'b', 'c'];

test('fil : à revoir et nouveaux entremêlés ; étape ciblée, points faibles, étape en cours, puis les suivantes', () => {
  const now = 1000;
  const list = [sh('c1', 'c'), sh('b1', 'b'), sh('a1', 'a'), sh('w1', 'c', 'vf', 'EC', ['faible']), sh('d1', 'a'), sh('l1', 'a')];
  const memo = { [memoId(list[4])]: { due: 500 }, [memoId(list[5])]: { due: 5000 } };
  const ids = (o) => buildFeed(list, memo, { steps, cur: 1, now, rnd: () => 0.5, ...o }).map((s) => s.id);
  const base = ids({});
  assert.equal(base[0], 'd1', 'le short dû passe en premier');
  assert.equal(base[base.length - 1], 'l1', 'les shorts pas encore dus à la fin');
  assert.ok(base.indexOf('b1') < base.indexOf('a1') && base.indexOf('a1') < base.indexOf('c1'), 'étape en cours, faites, puis suivantes');
  const weak = ids({ weak: new Set(['EC:faible']) });
  assert.equal(weak[1], 'w1', 'sous-thème faible en tête des nouveaux');
  const focus = ids({ focus: ['c'] });
  assert.equal(focus[1], 'c1', 'étape ciblée en tête');
  assert.ok(!ids({ served: new Set(['d1']) }).includes('d1'), 'déjà servi dans la séance');
});

test('fil : deux formats identiques ne se suivent pas quand on peut l’éviter', () => {
  const out = spreadTypes([sh('1', 'a', 'vf'), sh('2', 'a', 'vf'), sh('3', 'a', 'cas'), sh('4', 'a', 'cas'), sh('5', 'a', 'duel')]).map((s) => s.type);
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i], out[i - 1]);
});

test('questions liées : fiche du short et schémas de l’étape, même profession et sous-thème', () => {
  const idx = [{ file: 'f1', questions: ['q1', 'q2'] }, { file: 'f2', questions: ['q3'] }];
  const byId = { q1: { profession: 'CAC', tags: ['x'] }, q2: { profession: 'EC', tags: ['x'] }, q3: { profession: 'CAC', tags: ['x', 'y'] } };
  const s = { ...sh('s', 'a'), fiche: 'f1' };
  assert.deepEqual(linkedQuestions(s, idx, byId), ['q1']);
  assert.deepEqual(linkedQuestions(s, idx, byId, ['f2']), ['q1', 'q3']);
  assert.deepEqual(linkedQuestions({ ...s, prof: 'EC+CAC' }, idx, byId).sort(), ['q1', 'q2']);
});

test('avancement : vus, acquis, à revoir', () => {
  const list = [sh('1', 'a'), sh('2', 'a'), sh('3', 'a')];
  const memo = { 'sht:1': { box: 3, due: 9e12 }, 'sht:2': { box: 0, due: 0 } };
  assert.deepEqual(shortsStats(list, memo, 1000), { total: 3, seen: 2, known: 1, due: 1 });
});
