// Carte des notions : graphe, disposition (dans sa colonne, dans sa bande, sans chevauchement), état des nœuds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as CA from '../js/carte.js';
import { mastery } from '../js/srs.js';
import { TAG_LABELS } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url))).questions;
const g = CA.layout(CA.buildGraph(bank));
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

test('carte : chaque nœud dans sa colonne et sa bande, aucun disque ne chevauche un autre', () => {
  assert.deepEqual(g.bands.map((b) => b.theme), CA.THEME_ORDER);
  for (const n of g.nodes) {
    assert.ok(n.prof === 'EC' ? n.x < CA.W / 2 : n.x > CA.W / 2, n.id);
    const b = g.bands.find((x) => x.theme === n.theme);
    assert.ok(n.y >= b.y0 && n.y <= b.y1, n.id);
  }
  for (let i = 0; i < g.nodes.length; i++) for (let j = i + 1; j < g.nodes.length; j++) {
    const a = g.nodes[i], b = g.nodes[j];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `${a.id} / ${b.id}`);
    // Étiquettes (sous le disque) lisibles : pas de recouvrement dans une même case
    if (a.prof === b.prof && a.theme === b.theme) {
      const free = Math.abs(a.x - b.x) >= Math.max(a.r, 36) + Math.max(b.r, 36) || Math.abs(a.y - b.y) >= a.r + b.r + 26;
      assert.ok(free, `étiquettes ${a.id} / ${b.id}`);
    }
  }
});

test('carte : disposition reproductible', () => {
  const g2 = CA.layout(CA.buildGraph(bank));
  assert.deepEqual(g2.nodes.map((n) => [n.x, n.y]), g.nodes.map((n) => [n.x, n.y]));
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

test('carte : priorité au fragile le plus posé, étiquettes sur deux lignes', () => {
  const states = Object.fromEntries(g.nodes.map((n) => [n.id, { level: n.id === 'CAC:reseau' ? 'fragile' : 'vierge' }]));
  assert.equal(CA.priority(g, states).id, 'CAC:reseau');
  for (const n of g.nodes) assert.ok(CA.wrapLabel(TAG_LABELS[n.tag]).length <= 2);
});
