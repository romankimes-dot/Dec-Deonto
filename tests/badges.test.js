import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildContext, buildCatalog, emptyStats, applyAnswer, applyExam, applyOpen, rebuildStats,
  evaluate, progressOf, currentGrade, gradeConditions, themeMastery, dayKey, examInfo,
} from '../js/gamify.js';
import { ANECDOTES, QBADGES } from '../js/catalog-data.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
const ctx = buildContext(bank);
const catalog = buildCatalog(ctx);
const byId = Object.fromEntries(catalog.map((b) => [b.id, b]));
const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const T0 = D(2026, 10, 1);
const DAY = 86400000;

// Historique simulé
function sim() {
  const st = emptyStats();
  let t = T0;
  return {
    st,
    ans(id, ok, at) { t = at ?? t + 1000; applyAnswer(st, { id, ok, t }, ctx); return this; },
    many(ids, ok, at) { let k = at ?? t + 1000; for (const id of ids) this.ans(id, ok, k++); return this; },
    done(id) { return progressOf(byId[id], st).done; },
    p(id) { return progressOf(byId[id], st); },
  };
}

test('catalogue : ids uniques, familles et raretés valides, toutes les questions citées existent', () => {
  assert.equal(new Set(catalog.map((b) => b.id)).size, catalog.length);
  for (const b of catalog) {
    assert.ok(['couverture', 'series', 'maitrise', 'repassage', 'anecdotes', 'questions', 'caches'].includes(b.family), b.id);
    assert.ok(['commun', 'rare', 'epique', 'legendaire'].includes(b.rarity), b.id);
    for (const id of b.ids || []) assert.ok(ctx.known.has(id), `${b.id} → ${id}`);
  }
  assert.ok(ANECDOTES.length >= 40);
  assert.equal(catalog.filter((b) => b.family === 'anecdotes').length, ANECDOTES.length);
  assert.equal(catalog.filter((b) => b.family === 'questions').length, QBADGES.length * 2);
});

test('couverture : paliers 25/50/75/100 %, EC, CAC, LAB, secret, thème, sous-thème', () => {
  const s = sim();
  const n = ctx.all.length;
  s.many(ctx.all.slice(0, Math.ceil(n / 4) - 1), false);
  assert.equal(s.done('cov-1'), true);
  assert.equal(s.done('cov-25'), false);
  s.many(ctx.all.slice(Math.ceil(n / 4) - 1, Math.ceil(n / 4)), false);
  assert.equal(s.done('cov-25'), true, 'une réponse fausse compte comme vue');
  assert.equal(s.done('cov-50'), false);
  s.many(ctx.ec, false);
  assert.equal(s.done('cov-ec'), true);
  assert.equal(s.done('cov-cac'), false);
  assert.equal(s.done('cov-th-EC-exercice'), true);
  s.many(ctx.tags.lcb_ft, true);
  assert.equal(s.done('cov-lab'), true);
  s.many(ctx.tags.secret_professionnel, true);
  assert.equal(s.done('cov-secret'), true);
  assert.equal(s.done('cov-tag-lcb_ft'), true);
  s.many(ctx.cac, true);
  for (const id of ['cov-50', 'cov-75', 'cov-100', 'cov-cac', 'cov-tags-all']) assert.equal(s.done(id), true, id);
});

test('séries : 1, 3, 5, 10, 20, 30 et 50 cachés ; une erreur remet à zéro ; record conservé', () => {
  const s = sim();
  const ids = ctx.all;
  for (let i = 0; i < 9; i++) s.ans(ids[i], true);
  for (const id of ['ser-1', 'ser-3', 'ser-5']) assert.equal(s.done(id), true, id);
  assert.equal(s.done('ser-10'), false);
  s.ans(ids[9], false);
  assert.equal(s.st.streak.cur, 0);
  assert.equal(s.st.streak.best, 9);
  for (let i = 0; i < 50; i++) s.ans(ids[i], true);
  for (const id of ['ser-10', 'ser-20', 'ser-30', 'ser-50']) assert.equal(s.done(id), true, id);
  assert.equal(byId['ser-30'].hidden, true);
  assert.equal(byId['ser-50'].hidden, true);
});

test('maîtrise : ≥ 90 % et chaque question réussie 2 jours différents', () => {
  const th = ctx.themes['CAC:controle_qualite'].ids;
  const s = sim();
  s.many(th, true, D(2026, 10, 1));
  assert.equal(s.done('mast-CAC-controle_qualite'), false, 'un seul jour ne suffit pas');
  s.many(th, true, D(2026, 10, 1, 18));
  assert.equal(s.done('mast-CAC-controle_qualite'), false, 'deux fois le même jour ne suffit pas');
  s.many(th, true, D(2026, 10, 2));
  assert.equal(s.done('mast-CAC-controle_qualite'), true);
  // taux < 90 % : beaucoup d'erreurs sur une question
  const s2 = sim();
  s2.many(th, true, D(2026, 10, 1)); s2.many(th, true, D(2026, 10, 2));
  for (let i = 0; i < th.length; i++) s2.ans(th[0], false, D(2026, 10, 3) + i);
  s2.ans(th[0], true, D(2026, 10, 4));
  assert.ok(themeMastery(s2.st, th).rate < 0.9);
  assert.equal(s2.done('mast-CAC-controle_qualite'), false);
});

test('maîtrise : blocs EC, CAC, transversal et totale', () => {
  const s = sim();
  s.many(ctx.all, true, D(2026, 10, 1)); s.many(ctx.all, true, D(2026, 10, 2));
  for (const id of ['mast-bloc-ec', 'mast-bloc-cac', 'mast-transversal', 'mast-total']) assert.equal(s.done(id), true, id);
});

test('repassage : deuxième lecture, revue indépendante (3 jours après l’échec), dossier assaini, passages', () => {
  const th = ctx.themes['EC:controle_qualite'].ids;
  const s = sim();
  s.many(th, true, D(2026, 10, 1));
  assert.equal(s.done('rep-lect-EC-controle_qualite'), false);
  assert.equal(s.done('rep-sain-EC-controle_qualite'), true);
  s.many(th, false, D(2026, 10, 2));
  assert.equal(s.done('rep-lect-EC-controle_qualite'), true);
  assert.equal(s.done('rep-sain-EC-controle_qualite'), false, 'dernière réponse fausse');
  const id = th[0];
  s.ans(id, true, D(2026, 10, 3)); s.ans(id, true, D(2026, 10, 3, 15));
  assert.equal(s.done('rep-revue-1'), false, 'même jour compté une fois');
  s.ans(id, true, D(2026, 10, 4));
  assert.equal(s.done('rep-revue-1'), false);
  s.ans(id, false, D(2026, 10, 5));
  s.ans(id, true, D(2026, 10, 6)); s.ans(id, true, D(2026, 10, 7));
  assert.equal(s.done('rep-revue-1'), false, 'un nouvel échec remet le compteur à zéro');
  s.ans(id, true, D(2026, 10, 8));
  assert.equal(s.done('rep-revue-1'), true);
  const s2 = sim();
  s2.many(ctx.all, true, D(2026, 10, 1)); s2.many(ctx.all, true, D(2026, 10, 2));
  assert.equal(s2.done('rep-pass-2'), true);
  assert.equal(s2.done('rep-pass-3'), false);
  s2.many(ctx.all, true, D(2026, 10, 3));
  assert.equal(s2.done('rep-pass-3'), true);
});

test('revue indépendante en série : 10 questions rattrapées', () => {
  const s = sim();
  const ids = ctx.all.slice(0, 10);
  s.many(ids, false, D(2026, 10, 1));
  for (let d = 2; d <= 4; d++) s.many(ids, true, D(2026, 10, d));
  assert.equal(s.done('rep-revue-10'), true);
});

test('anecdotes : chaque anecdote se débloque en réussissant toutes ses questions, pas avant', () => {
  for (const a of catalog.filter((b) => b.family === 'anecdotes' && b.ids.length)) {
    const s = sim();
    s.many(a.ids.slice(0, -1), true);
    if (a.ids.length > 1) assert.equal(s.done(a.id), false, a.id);
    s.ans(a.ids[a.ids.length - 1], false);
    assert.equal(s.done(a.id), false, `${a.id} : une réponse fausse ne débloque pas`);
    s.ans(a.ids[a.ids.length - 1], true);
    assert.equal(s.done(a.id), true, a.id);
  }
});

test('anecdote A18 (DEC en poche) : blocs EC et CAC maîtrisés', () => {
  const s = sim();
  s.many(ctx.ec, true, D(2026, 10, 1)); s.many(ctx.ec, true, D(2026, 10, 2));
  assert.equal(s.done('anec-A18'), false);
  s.many(ctx.cac, true, D(2026, 10, 1)); s.many(ctx.cac, true, D(2026, 10, 2));
  assert.equal(s.done('anec-A18'), true);
});

test('badges de questions : version simple puis version or (2 jours)', () => {
  for (const b of QBADGES) {
    const s = sim();
    s.many(b.ids, true, D(2026, 10, 1));
    assert.equal(s.done(b.id), true, b.id);
    assert.equal(s.done(`${b.id}-or`), false, `${b.id}-or`);
    s.many(b.ids, true, D(2026, 10, 2));
    assert.equal(s.done(`${b.id}-or`), true, `${b.id}-or`);
  }
});

test('cachés : horaires, retour, 100 réponses, week-end, 7 jours, mode avion, veille, jour J', () => {
  const id = ctx.all[0];
  let s = sim(); s.ans(id, true, D(2026, 10, 1, 6, 30)); assert.equal(s.done('hid-leve-tot'), true);
  s = sim(); s.ans(id, true, D(2026, 10, 1, 7, 0)); assert.equal(s.done('hid-leve-tot'), false);
  s = sim(); s.ans(id, true, D(2026, 10, 1, 23, 15)); assert.equal(s.done('hid-couche-tard'), true);
  s = sim(); s.ans(id, true, D(2026, 10, 2, 1, 30)); assert.equal(s.done('hid-couche-tard'), true);
  s = sim(); s.ans(id, true, D(2026, 10, 1)); s.ans(id, true, D(2026, 10, 4)); assert.equal(s.done('hid-retour'), false, '2 jours sans réponse');
  s.ans(id, true, D(2026, 10, 8)); assert.equal(s.done('hid-retour'), true, '3 jours sans réponse');
  s = sim(); for (let i = 0; i < 99; i++) s.ans(id, true, D(2026, 10, 1, 9) + i); assert.equal(s.done('hid-cent'), false);
  s.ans(id, true, D(2026, 10, 1, 10)); assert.equal(s.done('hid-cent'), true);
  s = sim(); s.ans(id, true, D(2026, 10, 24)); s.ans(id, true, D(2026, 10, 25)); assert.equal(s.done('hid-weekend'), true, 'samedi 24 puis dimanche 25');
  s = sim(); s.ans(id, true, D(2026, 10, 25)); s.ans(id, true, D(2026, 10, 26)); assert.equal(s.done('hid-weekend'), false);
  s = sim(); for (let d = 1; d <= 7; d++) for (let i = 0; i < 10; i++) s.ans(id, true, D(2026, 10, d) + i);
  assert.equal(s.done('hid-7j'), true);
  s = sim(); for (let d = 1; d <= 7; d++) for (let i = 0; i < (d === 4 ? 9 : 10); i++) s.ans(id, true, D(2026, 10, d) + i);
  assert.equal(s.done('hid-7j'), false);
  s = sim(); for (let i = 0; i < 10; i++) applyAnswer(s.st, { id, ok: true, t: D(2026, 10, 1) + i, off: 1 }, ctx);
  assert.equal(s.done('hid-avion'), true);
  s = sim(); s.ans(id, true, D(2026, 11, 9, 20)); assert.equal(s.done('hid-veille'), true);
  s = sim(); applyOpen(s.st, D(2026, 11, 10, 10, 29)); assert.equal(s.done('hid-jourj'), true);
  s = sim(); applyOpen(s.st, D(2026, 11, 10, 10, 30)); assert.equal(s.done('hid-jourj'), false);
  for (const b of catalog.filter((x) => x.family === 'caches')) assert.equal(b.hidden, true, b.id);
});

test('cachés : « La veille » et « Jour J » suivent la date d’épreuve choisie', () => {
  const c2 = { ...ctx, exam: examInfo('2027-03-01', 14 * 60) };
  const cat2 = buildCatalog(c2);
  const byId = (id) => cat2.find((b) => b.id === id);
  assert.equal(c2.exam.eve, '2027-02-28');
  assert.equal(byId('hid-veille').hint, 'Le 28 février.');
  assert.equal(byId('hid-jourj').hint, 'Le 1er mars, 13 h 59.');
  assert.equal(byId('hid-jourj').cond, 'ouvrir l’app le 1er mars 2027 avant 14 h 00');
  const id = ctx.all[0];
  let st = emptyStats(); applyAnswer(st, { id, ok: true, t: D(2026, 11, 9, 20) }, c2); assert.equal(progressOf(byId('hid-veille'), st).done, false, 'ancienne veille');
  st = emptyStats(); applyAnswer(st, { id, ok: true, t: D(2027, 2, 28, 20) }, c2); assert.equal(progressOf(byId('hid-veille'), st).done, true);
  st = emptyStats(); applyOpen(st, D(2027, 3, 1, 13, 59), c2); assert.equal(progressOf(byId('hid-jourj'), st).done, true);
  st = emptyStats(); applyOpen(st, D(2027, 3, 1, 14, 0), c2); assert.equal(progressOf(byId('hid-jourj'), st).done, false);
});

test('caché : 20 questions difficiles d’affilée', () => {
  const hard = [...ctx.hardList];
  assert.ok(hard.length >= 20);
  const s = sim();
  s.many(hard.slice(0, 19), true);
  s.ans(ctx.all.find((id) => !ctx.hardList.has(id)), true); // une question facile ne casse pas la série difficile
  assert.equal(s.done('hid-hard20'), false);
  s.ans(hard[19], true);
  assert.equal(s.done('hid-hard20'), true);
});

test('cachés liés aux examens : mention, rattrapage, chrono, CAC parfaite', () => {
  const st = emptyStats();
  const p = (id) => progressOf(byId[id], st).done;
  applyExam(st, { t: T0, mode: 'qcm', note: 9, durationMs: 3600000, byProf: { CAC: { points: 4, max: 10 } } });
  assert.equal(p('hid-rattrapage'), false);
  applyExam(st, { t: T0 + 1, mode: 'qcm', note: 14, durationMs: 30 * 60000, byProf: { CAC: { points: 10, max: 10 } } });
  assert.equal(p('hid-rattrapage'), true);
  assert.equal(p('hid-chrono'), true);
  assert.equal(p('hid-cac10'), true);
  assert.equal(p('hid-mention'), false);
  applyExam(st, { t: T0 + 2, mode: 'qrc', note: 16.5, durationMs: 3600000, byProf: { CAC: { points: 15, max: 20 } } });
  assert.equal(p('hid-mention'), true);
});

test('grades : progression séquentielle, par badges et maîtrise, pas par volume', () => {
  const progress = { attempts: [], exams: [], stats: emptyStats() };
  evaluate(progress, catalog, ctx, T0);
  assert.equal(currentGrade(progress).n, 1);
  // Gros volume de réponses fausses : aucun grade gagné
  for (let i = 0; i < 2000; i++) applyAnswer(progress.stats, { id: ctx.all[i % ctx.all.length], ok: false, t: T0 + i }, ctx);
  evaluate(progress, catalog, ctx, T0 + 3000);
  assert.equal(currentGrade(progress).n, 1);
  // Tout réussi trois jours de suite + examens ≥ 16 → dernier grade
  const p2 = { attempts: [], exams: [], stats: emptyStats() };
  for (let d = 1; d <= 3; d++) for (const id of ctx.all) applyAnswer(p2.stats, { id, ok: true, t: D(2026, 10, d) }, ctx);
  applyExam(p2.stats, { t: D(2026, 10, 3, 20), mode: 'qcm', note: 17, durationMs: 3600000, byProf: {} });
  const fresh = evaluate(p2, catalog, ctx, D(2026, 10, 3, 21));
  assert.equal(currentGrade(p2).n, 8);
  assert.equal(fresh.grades.length, 7);
  // Conditions décrites et toutes remplies
  const has = (id) => !!p2.badges[id];
  for (let n = 1; n <= 8; n++) assert.ok(gradeConditions(n, has, p2.stats, ctx).every((c) => c.ok), `grade ${n}`);
});

test('grades : le grade 3 exige 2 thèmes maîtrisés même avec 50 % de la banque vue', () => {
  const p = { stats: emptyStats() };
  const excluded = new Set([...ctx.themes['EC:controle_qualite'].ids, ...ctx.themes['CAC:controle_qualite'].ids]);
  const half = ctx.all.filter((id) => !excluded.has(id)).slice(0, Math.ceil(ctx.all.length / 2));
  for (const id of half) applyAnswer(p.stats, { id, ok: false, t: T0 }, ctx);
  for (const a of catalog.filter((b) => b.family === 'anecdotes' && b.part === 'stage')) for (const id of a.ids) applyAnswer(p.stats, { id, ok: true, t: T0 + 1 }, ctx);
  for (const d of [2, 3]) for (const id of ctx.themes['EC:controle_qualite'].ids) applyAnswer(p.stats, { id, ok: true, t: T0 + DAY * d }, ctx);
  evaluate(p, catalog, ctx, T0 + DAY * 4);
  assert.equal(p.badges['cov-50'] > 0, true);
  assert.equal(currentGrade(p).n, 2, 'un seul thème maîtrisé : reste en 2e année');
  for (const d of [5, 6]) for (const id of ctx.themes['CAC:controle_qualite'].ids) applyAnswer(p.stats, { id, ok: true, t: T0 + DAY * d }, ctx);
  evaluate(p, catalog, ctx, T0 + DAY * 7);
  assert.equal(currentGrade(p).n, 3);
});

test('rétroactif : reconstruire depuis attempts et exams = calcul au fil de l’eau', () => {
  const attempts = [];
  let t = D(2026, 10, 1, 6);
  for (let d = 0; d < 4; d++) for (let i = 0; i < 60; i++) { const id = ctx.all[(i * 7 + d) % ctx.all.length]; attempts.push({ id, ok: (i + d) % 5 !== 0, mode: 'qcm', t: t + d * DAY + i * 60000 }); }
  const exams = [{ t: D(2026, 10, 4, 20), mode: 'qcm', note: 16, durationMs: 35 * 60000, byProf: { CAC: { points: 10, max: 10 } } }];
  const live = emptyStats();
  for (const a of attempts) applyAnswer(live, a, ctx);
  applyExam(live, exams[0]);
  const rebuilt = rebuildStats({ attempts: [...attempts].reverse(), exams }, ctx);
  assert.deepEqual(rebuilt.q, live.q);
  assert.deepEqual(rebuilt.streak, live.streak);
  assert.deepEqual(rebuilt.flags, live.flags);
  const p1 = { stats: live }, p2 = { stats: rebuilt };
  evaluate(p1, catalog, ctx, 1); evaluate(p2, catalog, ctx, 1);
  assert.deepEqual(Object.keys(p2.badges).sort(), Object.keys(p1.badges).sort());
  assert.ok(p2.badges['hid-leve-tot'] && p2.badges['hid-mention'] && p2.badges['hid-cac10']);
});

test('rétroactif : ignore les ids inconnus de la banque', () => {
  const st = rebuildStats({ attempts: [{ id: '1999-01-EC-01', ok: true, t: T0 }], exams: [] }, ctx);
  assert.deepEqual(st.q, {});
});

test('dayKey : heure locale', () => {
  assert.equal(dayKey(D(2026, 11, 10, 0, 5)), '2026-11-10');
  assert.equal(dayKey(D(2026, 11, 9, 23, 55)), '2026-11-09');
});

test('évaluation idempotente : un badge débloqué garde sa date', () => {
  const p = { stats: emptyStats() };
  applyAnswer(p.stats, { id: ctx.all[0], ok: true, t: T0 }, ctx);
  const f1 = evaluate(p, catalog, ctx, 111);
  assert.ok(f1.badges.some((b) => b.id === 'cov-1'));
  const f2 = evaluate(p, catalog, ctx, 222);
  assert.equal(f2.badges.length, 0);
  assert.equal(p.badges['cov-1'], 111);
});
