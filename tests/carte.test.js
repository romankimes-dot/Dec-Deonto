// Carte des notions : graphe des sous-thèmes, thème dominant, voisins, état des nœuds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as CA from '../js/carte.js';
import { mastery } from '../js/srs.js';
import { TAG_LABELS } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url))).questions;
const g = CA.buildGraph(bank);
const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));

test('carte : un nœud par sous-thème et par profession, chaque question comptée', () => {
  const keys = new Set(bank.flatMap((q) => q.tags.map((t) => `${q.profession}:${t}`)));
  assert.equal(g.nodes.length, keys.size);
  for (const n of g.nodes) assert.ok(TAG_LABELS[n.tag], `libellé manquant : ${n.tag}`);
  const total = g.nodes.reduce((s, n) => s + n.ids.length, 0);
  assert.equal(total, bank.reduce((s, q) => s + q.tags.length, 0));
});

test('carte : liens entre nœuds existants, jumeaux EC / CAC du même sous-thème', () => {
  for (const e of g.edges) {
    assert.ok(byId[e.a] && byId[e.b] && e.a !== e.b);
    if (e.twin) { assert.equal(byId[e.a].tag, byId[e.b].tag); assert.notEqual(byId[e.a].prof, byId[e.b].prof); }
    else { assert.equal(byId[e.a].prof, byId[e.b].prof); assert.ok(e.w >= CA.MIN_LINK); }
  }
  assert.ok(g.edges.some((e) => e.twin) && g.edges.some((e) => !e.twin));
});

test('carte : thème dominant du programme, voisins et jumeau', () => {
  for (const n of g.nodes) assert.ok(CA.THEME_ORDER.includes(n.theme) && n.themes[n.theme] >= Math.max(...Object.values(n.themes)), n.id);
  const nb = CA.neighbours(g, 'EC:lcb_ft');
  assert.equal(nb.twin, 'CAC:lcb_ft');
  assert.ok(nb.links.every((l, i, a) => !i || a[i - 1].w >= l.w));
});

test('carte : état vierge, fragile, en cours, solide', () => {
  const n = { id: 'EC:x', ids: ['a', 'b', 'c'] };
  assert.equal(CA.nodeState(n, {}, {}, mastery).level, 'vierge');
  const learning = { reps: 1, interval: 1, lapses: 0 }, solid = { reps: 4, interval: 20, lapses: 0 };
  assert.equal(CA.nodeState(n, { a: learning }, { 'EC:x': { ok: 1, n: 4 } }, mastery).level, 'fragile');
  assert.equal(CA.nodeState(n, { a: learning }, { 'EC:x': { ok: 1, n: 1 } }, mastery).level, 'en_cours');
  const st = CA.nodeState(n, { a: solid, b: solid, c: solid }, { 'EC:x': { ok: 9, n: 10 } }, mastery);
  assert.equal(st.level, 'solide'); assert.equal(st.cover, 1); assert.deepEqual(st.m, [0, 0, 0, 3]);
});

test('carte : une question répondue hors session (entraînement, examen) compte comme vue', () => {
  const n = { id: 'EC:x', ids: ['a', 'b', 'c'] };
  const seenFn = (id) => id === 'b';
  const st = CA.nodeState(n, {}, {}, mastery, seenFn);
  assert.equal(st.seen, 1); assert.equal(st.level, 'en_cours');
  // Carte de répétition et réponse hors session ne se comptent pas deux fois
  assert.equal(CA.nodeState(n, { b: { reps: 1, interval: 1, lapses: 0 } }, {}, mastery, seenFn).seen, 1);
  assert.equal(CA.nodeState(n, {}, {}, mastery).level, 'vierge');
});

test('trainOrder : les jamais vues passent devant, même dans un bloc de plus de 20 questions', () => {
  const ids = Array.from({ length: 23 }, (_, i) => `q${i}`);
  const seen = new Set(ids.slice(0, 22)); // seule la dernière n'a jamais été vue, aucune n'a de carte
  const out = CA.trainOrder(ids, {}, mastery, (id) => seen.has(id));
  assert.equal(out.length, 20);
  assert.equal(out[0], 'q22');
  const learning = { reps: 1, interval: 1, ease: 2.5, due: 0, lapses: 0 };
  assert.deepEqual(CA.trainOrder(['a', 'b', 'c'], { a: learning }, mastery, (id) => id !== 'c'), ['c', 'b', 'a']);
});
