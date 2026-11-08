import test from 'node:test';
import assert from 'node:assert/strict';
import { missedOrder, requeue } from '../js/loop.js';

test('missedOrder : seulement les questions ratées, les plus ratées d’abord', () => {
  const q = { a: { seen: 4, ok: 3 }, b: { seen: 2, ok: 0 }, c: { seen: 3, ok: 3 }, d: { seen: 4, ok: 2 }, e: { seen: 2, ok: 1 }, z: { seen: 1, ok: 0 } };
  assert.deepEqual(missedOrder(q, (id) => id !== 'z'), ['b', 'd', 'e', 'a']);
  assert.deepEqual(missedOrder(null), []);
});

test('requeue : la question ratée revient quelques positions plus loin, ou en fin de file', () => {
  assert.deepEqual(requeue(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 0, 'a', 4), ['a', 'b', 'c', 'd', 'e', 'a', 'f', 'g']);
  assert.deepEqual(requeue(['a', 'b'], 1, 'b', 4), ['a', 'b', 'b']);
});
