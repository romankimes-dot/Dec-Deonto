import test from 'node:test';
import assert from 'node:assert/strict';
import * as CN from '../js/carnet.js';
import { merge } from '../js/sync.js';

test('carnet : ajout, note, retrait, tri du plus récent', () => {
  const c = {};
  CN.toggle(c, 'q1', true, 1);
  CN.toggle(c, 'sht:a', true, 3);
  CN.setNote(c, 'q1', 'six exercices, pas trois', 2);
  assert.ok(CN.has(c, 'q1'));
  assert.deepEqual(CN.entries(c).map((x) => x.id), ['sht:a', 'q1']);
  assert.equal(CN.entries(c)[1].note, 'six exercices, pas trois');
  CN.toggle(c, 'q1', undefined, 4);
  assert.ok(!CN.has(c, 'q1'));
  assert.equal(CN.setNote(c, 'q1', 'x', 5), null);
  // question disparue de la banque : ignorée ; short gardé
  CN.toggle(c, 'q9', true, 6);
  assert.deepEqual(CN.entries(c, { q1: {} }).map((x) => x.id), ['sht:a']);
});

test('carnet : un retrait plus récent l’emporte à la synchronisation', () => {
  const a = { cards: {}, updatedAt: 10, carnet: { q1: { on: false, last: 9, note: '' } } };
  const b = { cards: {}, updatedAt: 5, carnet: { q1: { on: true, last: 4, note: 'x' }, q2: { on: true, last: 3, note: '' } } };
  const m = merge(a, b);
  assert.equal(m.carnet.q1.on, false);
  assert.equal(m.carnet.q2.on, true);
});
