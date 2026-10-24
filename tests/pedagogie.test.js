import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { newCard, review, capToExam, spreadOf, suggestGrade, confidentError, qrcPoints, calibration, confidentErrors, buildQueue, mastery, DAY } from '../js/srs.js';
import { recordDrill, pickDrill, drillStats, BOX_DAYS } from '../js/drill.js';
import * as GM from '../js/games.js';
import { buildClusters } from '../js/cluster.js';
import * as PAL from '../js/palais.js';

const T0 = Date.UTC(2026, 9, 23, 8); // 23 octobre 2026
const EXAM = Date.UTC(2026, 10, 10, 9, 30);
const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url))).questions;
const ficheDir = new URL('../data/fiches/', import.meta.url);
const fiches = readdirSync(ficheDir).filter((f) => /^\d+-schema/.test(f)).map((f) => ({ file: f, md: readFileSync(new URL(f, ficheDir), 'utf8') }));

// ---------- Échéances ramenées avant l'épreuve ----------
test('avant l’épreuve, chaque carte revient avant l’épreuve, l’intervalle SM-2 reste intact', () => {
  let c = newCard(T0); let t = T0; const dues = [];
  for (let i = 0; i < 4; i++) { c = review(c, 2, t, { examAt: EXAM }); assert.ok(c.due <= EXAM, `révision ${i} avant l’épreuve`); dues.push(c.due); t = c.due; }
  assert.equal(dues[2], EXAM - DAY - 1.5 * 60 * 60 * 1000, 'J-8 + 7 j : la veille, sans saut par-dessus l’épreuve');
  const free = [2, 2, 2, 2].reduce((card, g) => review(card, g, card.due), newCard(T0));
  assert.equal(c.interval, free.interval, 'même solidité mesurée qu’en SM-2 libre');
  assert.equal(mastery(c), mastery(free));
});
test('étalement : les dernières révisions tombent entre J-3 et J-1', () => {
  const t = EXAM - 10 * DAY;
  const days = [0, 1, 2].map((sp) => capToExam(30, t, EXAM, sp));
  assert.deepEqual(days, [9, 8, 7]);
  assert.equal(capToExam(30, EXAM - 1.5 * DAY, EXAM, 2), 1, 'jamais moins d’un jour');
  assert.equal(capToExam(30, EXAM + DAY, EXAM), 30, 'après l’épreuve : SM-2 normal');
  assert.equal(capToExam(30, t, null), 30, 'sans date : SM-2 normal');
  for (const q of bank.slice(0, 50)) assert.ok([0, 1, 2].includes(spreadOf(q.id)));
});

// ---------- Note proposée, certitude ----------
test('QCM : une bonne réponse au hasard n’est pas une carte sue', () => {
  assert.equal(suggestGrade({ mode: 'qcm', ok: true, conf: 2 }), 2);
  assert.equal(suggestGrade({ mode: 'qcm', ok: true, conf: 1 }), 1);
  assert.equal(suggestGrade({ mode: 'qcm', ok: true, conf: 0 }), 0);
  assert.equal(suggestGrade({ mode: 'qcm', ok: true, conf: null }), 2);
  assert.equal(suggestGrade({ mode: 'qcm', ok: false, conf: 2 }), 0);
});
test('QRC : la note proposée suit les éléments cochés', () => {
  assert.equal(suggestGrade({ mode: 'qrc', ratio: 0 }), 0);
  assert.equal(suggestGrade({ mode: 'qrc', ratio: 0.4 }), 0);
  assert.equal(suggestGrade({ mode: 'qrc', ratio: 0.5 }), 1);
  assert.equal(suggestGrade({ mode: 'qrc', ratio: 1 }), 2);
  assert.equal(suggestGrade({ mode: 'qrc', ratio: 1, conf: 1 }), 1);
  assert.equal(qrcPoints(2, 2 / 3), 1.5);
  assert.equal(qrcPoints(3, 1 / 3), 1);
  assert.equal(qrcPoints(2, 0), 0);
});
test('erreurs avec certitude : listées jusqu’à une réussite certaine', () => {
  assert.equal(confidentError(false, 2), true);
  assert.equal(confidentError(false, 1), false);
  const att = [
    { id: 'a', ok: false, conf: 2 }, { id: 'b', ok: false, conf: 2 }, { id: 'b', ok: true, conf: 1 },
    { id: 'c', ok: false, conf: 2 }, { id: 'c', ok: true, conf: 2 }, { id: 'd', ok: false, conf: 0 },
  ];
  assert.deepEqual(confidentErrors(att), ['a', 'b']);
  const cal = calibration(att);
  assert.deepEqual(cal[2], { n: 4, ok: 1 });
  assert.deepEqual(cal[0], { n: 1, ok: 0 });
});
test('buildQueue : à parcours égal, les notions souvent posées passent d’abord', () => {
  const qs = [{ id: 'a', profession: 'EC' }, { id: 'b', profession: 'EC' }, { id: 'c', profession: 'CAC' }, { id: 'd', profession: 'CAC' }];
  const w = { b: 3, d: 2 };
  const { fresh } = buildQueue(qs, {}, { newLimit: 4, weight: (q) => w[q.id] || 0, now: T0 });
  assert.deepEqual(fresh.map((q) => q.id), ['d', 'b', 'c', 'a']);
});

// ---------- Leitner des jeux ----------
test('jeux : boîtes de Leitner, retour en boîte 0 après une erreur, échéance avant l’épreuve', () => {
  const m = {};
  recordDrill(m, 'x', true, T0); assert.equal(m.x.box, 1); assert.equal(m.x.due, T0 + BOX_DAYS[1] * DAY);
  recordDrill(m, 'x', true, T0); assert.equal(m.x.box, 2);
  recordDrill(m, 'x', false, T0); assert.equal(m.x.box, 0); assert.equal(m.x.due, T0 + 10 * 60 * 1000);
  assert.deepEqual([m.x.ok, m.x.n], [2, 3]);
  const late = {}; for (let i = 0; i < 4; i++) recordDrill(late, 'y', true, EXAM - 3 * DAY, EXAM);
  assert.ok(late.y.due <= EXAM - DAY);
});
test('jeux : tirage des dus d’abord, entremêlés avec des nouveaux, puis les autres', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const m = { a: { box: 1, due: T0 + DAY }, b: { box: 0, due: T0 - 2 }, c: { box: 0, due: T0 - 5 } };
  const out = pickDrill(items, m, 5, T0, () => 0.5).map((x) => x.id);
  assert.deepEqual(out.slice(0, 4).sort(), ['b', 'c', 'd', 'e']);
  assert.equal(out[0], 'c', 'le plus en retard d’abord');
  assert.equal(out[4], 'a');
  assert.deepEqual(drillStats(items, m, T0), { total: 5, seen: 3, due: 2, known: 0 });
});

// ---------- Générateurs d'items ----------
test('Duel : items tirés des comparatifs, jamais deux cellules identiques', () => {
  const items = fiches.flatMap((f) => GM.duelItems(f.file, f.md));
  assert.ok(items.length > 100, `${items.length} items`);
  const ids = new Set();
  for (const it of items) {
    assert.ok(it.answer === 0 || it.answer === 1);
    assert.equal(it.labels.length, 2);
    assert.notEqual(GM.plain(it.text), GM.plain(it.other));
    assert.ok(!ids.has(it.id), `identifiant unique ${it.id}`); ids.add(it.id);
  }
});
test('Vrai / Faux : une seule bonne réponse par question, propositions « aucune des… » exclues', () => {
  const items = GM.vfItems(bank);
  const byQ = {};
  for (const it of items) { byQ[it.qid] = (byQ[it.qid] || 0) + (it.answer ? 1 : 0); assert.ok(!/aucune des|toutes les (propositions|réponses)/i.test(it.text)); }
  assert.ok(Object.values(byQ).every((n) => n === 1));
  assert.ok(items.length > 1200);
});
test('Chiffres : la bonne valeur n’est jamais parmi les leurres', () => {
  const f = fiches.find((x) => x.file === GM.CHIFFRES_FILE);
  const items = GM.chiffresItems(f.file, f.md);
  assert.ok(items.length >= 30, `${items.length} items`);
  for (const it of items) { assert.ok(it.pool.length >= 1); assert.ok(!it.pool.includes(it.value)); }
  const mandat = items.find((it) => /Durée du mandat de CAC/.test(it.prompt));
  assert.equal(mandat.value, '6 exercices');
  const ch = GM.choicesFor(mandat.value, mandat.pool, 4, () => 0.3);
  assert.equal(ch.length, 4); assert.ok(ch.includes('6 exercices')); assert.equal(new Set(ch).size, 4);
});
test('Arbres : jamais de feuille sœur (également juste) parmi les leurres', () => {
  const items = fiches.flatMap((f) => GM.arbreItems(f.file, f.md));
  assert.ok(items.length >= 40, `${items.length} items`);
  for (const it of items) {
    assert.ok(it.pool.length >= 2);
    assert.ok(it.path.length >= 2, 'au moins le sommet et une branche');
    for (const s of it.siblings) assert.ok(!it.pool.includes(s), `${it.text} / ${s}`);
    assert.ok(it.slot >= 0 && it.slot <= it.siblings.length, 'la case vide a une place dans la branche');
  }
});

// ---------- Recoupement des annales ----------
test('recoupement : la même notion d’une session à l’autre, jamais entre professions', () => {
  const { clusterOf, groups } = buildClusters(bank);
  assert.ok(groups.length >= 20, `${groups.length} notions`);
  const byId = Object.fromEntries(bank.map((q) => [q.id, q]));
  for (const g of groups) {
    assert.ok(new Set(g.map((id) => byId[id].session)).size >= 2);
    assert.equal(new Set(g.map((id) => byId[id].profession)).size, 1);
  }
  assert.equal(clusterOf['2022-05-EC-03'], clusterOf['2024-05-EC-09'], 'étapes du devoir de conseil, posées deux fois');
  assert.notEqual(clusterOf['2022-05-EC-03'], undefined);
});

// ---------- Palais de mémoire ----------
test('palais : chaque liste tient dans le bureau, cite une fiche existante, leurres hors liste', () => {
  const ids = new Set();
  for (const l of PAL.LISTS) {
    assert.ok(!ids.has(l.id)); ids.add(l.id);
    assert.ok(l.items.length >= 3 && l.items.length <= PAL.LOCI.length, l.id);
    assert.ok(existsSync(new URL(l.source, ficheDir)), l.source);
    for (const d of PAL.decoys(l, 2, () => 0.4)) assert.ok(!l.items.includes(d));
  }
  assert.equal(PAL.initials(PAL.LISTS[0]), 'R-B-S-S-R');
});
