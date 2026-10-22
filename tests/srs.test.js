import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, mastery, buildQueue, drawExam, scoreExam, DAY } from '../js/srs.js';

const T0 = 1_000_000_000_000;

test('nouvelle carte est due immédiatement', () => {
  const c = newCard(T0);
  assert.equal(isDue(c, T0), true);
  assert.equal(mastery(c), 0);
});

test('Bien sur une nouvelle carte : 3 jours', () => {
  const c = review(newCard(T0), 2, T0);
  assert.equal(c.interval, 3);
  assert.equal(c.reps, 1);
  assert.equal(c.due, T0 + 3 * DAY);
  assert.equal(isDue(c, T0 + 2 * DAY), false);
  assert.equal(isDue(c, T0 + 3 * DAY), true);
});

test('Encore remet la carte en apprentissage dans 10 minutes', () => {
  let c = review(newCard(T0), 2, T0);
  c = review(c, 2, T0 + 3 * DAY);
  c = review(c, 0, T0 + 10 * DAY);
  assert.equal(c.reps, 0);
  assert.equal(c.lapses, 1);
  assert.equal(c.interval, 0);
  assert.equal(c.due, T0 + 10 * DAY + 10 * 60 * 1000);
});

test('intervalles croissants et maîtrise', () => {
  let c = newCard(T0);
  let t = T0;
  const seq = [];
  for (let i = 0; i < 5; i++) {
    c = review(c, 2, t);
    seq.push(c.interval);
    t = c.due;
  }
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] > seq[i - 1], `intervalle ${i} croissant`);
  assert.equal(mastery(c), 3);
});

test('Facile augmente la facilité, Difficile la réduit, bornes respectées', () => {
  let c = newCard(T0);
  for (let i = 0; i < 20; i++) c = review(c, 3, c.due);
  assert.ok(c.ease <= 3.0);
  let d = newCard(T0);
  for (let i = 0; i < 20; i++) d = review(d, 1, d.due);
  assert.ok(d.ease >= 1.3);
});

const mkQ = (id, profession) => ({ id, profession });

test('buildQueue : dues d abord, puis nouvelles alternées CAC/EC, limite respectée', () => {
  const qs = [
    mkQ('a', 'EC'), mkQ('b', 'EC'), mkQ('c', 'CAC'), mkQ('d', 'CAC'), mkQ('e', 'EC'), mkQ('f', 'CAC'),
  ];
  const cards = { a: { ...newCard(T0), due: T0 - DAY }, b: { ...newCard(T0), due: T0 + DAY } };
  const { due, fresh, queue } = buildQueue(qs, cards, { newLimit: 3, now: T0 });
  assert.deepEqual(due.map((q) => q.id), ['a']);
  assert.deepEqual(fresh.map((q) => q.id), ['c', 'e', 'd']);
  assert.equal(queue.length, 4);
});

test('drawExam : 10 EC puis 10 CAC, sans doublon, jamais vues en priorité', () => {
  const qs = [];
  for (let i = 0; i < 30; i++) qs.push(mkQ(`ec${i}`, 'EC'));
  for (let i = 0; i < 30; i++) qs.push(mkQ(`cac${i}`, 'CAC'));
  const seen = {};
  for (let i = 0; i < 25; i++) { seen[`ec${i}`] = T0; seen[`cac${i}`] = T0; }
  const exam = drawExam(qs, seen, () => 0.5);
  assert.equal(exam.length, 20);
  assert.equal(exam.slice(0, 10).every((q) => q.profession === 'EC'), true);
  assert.equal(exam.slice(10).every((q) => q.profession === 'CAC'), true);
  assert.equal(new Set(exam.map((q) => q.id)).size, 20);
  const unseen = exam.filter((q) => !seen[q.id]).length;
  assert.equal(unseen, 10);
});

test('scoreExam : QCM = 1 point par bonne réponse ; QRC = total/max * 20', () => {
  const qcm = Array.from({ length: 20 }, (_, i) => ({ points: i < 13 ? 1 : 0, max: 1 }));
  assert.equal(scoreExam(qcm, 'qcm'), 13);
  const qrc = [{ points: 2, max: 2 }, { points: 1, max: 3 }, { points: 0, max: 1 }];
  assert.equal(scoreExam(qrc, 'qrc'), 10);
});
