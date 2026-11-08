import test from 'node:test';
import assert from 'node:assert/strict';
import { missedOrder, requeue, toConfirm, pitfalls } from '../js/loop.js';

test('missedOrder : seulement les questions ratées, les plus ratées d’abord', () => {
  const q = { a: { seen: 4, ok: 3 }, b: { seen: 2, ok: 0 }, c: { seen: 3, ok: 3 }, d: { seen: 4, ok: 2 }, e: { seen: 2, ok: 1 }, z: { seen: 1, ok: 0 } };
  assert.deepEqual(missedOrder(q, (id) => id !== 'z'), ['b', 'd', 'e', 'a']);
  assert.deepEqual(missedOrder(null), []);
});

test('requeue : la question ratée revient quelques positions plus loin, ou en fin de file', () => {
  assert.deepEqual(requeue(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 0, 'a', 4), ['a', 'b', 'c', 'd', 'e', 'a', 'f', 'g']);
  assert.deepEqual(requeue(['a', 'b'], 1, 'b', 4), ['a', 'b', 'b']);
});

test('toConfirm : erreurs non confirmées, encore fausses d’abord, déjà réussies aujourd’hui exclues', () => {
  const today = '2026-11-09';
  const q = {
    a: { failed: true, recovered: false, last: 'ok', ko: 2, recDays: ['2026-11-08'] },
    b: { failed: true, recovered: false, last: 'ko', ko: 1, recDays: [] },
    c: { failed: true, recovered: false, last: 'ok', ko: 5, recDays: [today] },
    d: { failed: true, recovered: true, last: 'ok', ko: 3, recDays: ['x', 'y', 'z'] },
    e: { failed: false, last: 'ok', ko: 0 },
    f: { failed: true, recovered: false, last: 'ok', ko: 4, recDays: ['2026-11-07'] },
  };
  assert.deepEqual(toConfirm(q, today), ['b', 'f', 'a']);
});

test('pitfalls : ratées au moins 3 fois, les plus ratées d’abord', () => {
  const q = { a: { ko: 3, seen: 9 }, b: { ko: 6, seen: 8 }, c: { ko: 2, seen: 2 }, d: { ko: 3, seen: 4 } };
  assert.deepEqual(pitfalls(q), ['b', 'd', 'a']);
});
