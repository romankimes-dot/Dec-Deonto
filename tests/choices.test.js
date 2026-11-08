import test from 'node:test';
import assert from 'node:assert/strict';
import { nextOrder } from '../js/choices.js';

test('nextOrder : une permutation des 4 propositions, jamais identique à la précédente', () => {
  let last = null;
  for (let k = 0; k < 500; k++) {
    const o = nextOrder(last);
    assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
    if (last) assert.notEqual(o.join(''), last);
    last = o.join('');
  }
});

test('nextOrder : un générateur constant ne bloque pas', () => {
  const first = nextOrder(null, 4, () => 0);
  const o = nextOrder(first.join(''), 4, () => 0);
  assert.notDeepEqual(o, first);
  assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
});

test('nextOrder : les ordres varient', () => {
  const seen = new Set(); for (let k = 0; k < 300; k++) seen.add(nextOrder(null).join(''));
  assert.ok(seen.size > 15);
});
