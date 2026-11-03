import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { VILLE, batiment, VILLE_CSS } from '../js/ville.js';

const ids = new Set(VILLE.batiments.map((b) => b.id));

test('ville : chaque bâtiment a une rive, des pancartes, une fiche existante et une position sur le sol', () => {
  assert.ok(VILLE.batiments.length >= 25);
  assert.equal(ids.size, VILLE.batiments.length, 'identifiants uniques');
  for (const b of VILLE.batiments) {
    assert.ok(['ec', 'cac', 'commun'].includes(b.rive), `${b.id} : rive`);
    assert.ok(b.nom && b.court && b.type && b.role, `${b.id} : libellés`);
    assert.ok(Array.isArray(b.pancartes) && b.pancartes.length, `${b.id} : pancartes`);
    for (const p of b.pancartes) assert.ok(p.qui && p.fait, `${b.id} : pancarte incomplète`);
    assert.ok(b.x >= 0 && b.x <= 100 && b.y >= 0 && b.y <= 100, `${b.id} : position`);
    assert.ok(b.w > 0 && b.d > 0 && b.h >= 0, `${b.id} : dimensions`);
    assert.ok(existsSync(new URL(`../data/fiches/${b.fiche}`, import.meta.url)), `${b.id} : fiche ${b.fiche} absente`);
    if (b.jumeau) assert.ok(ids.has(b.jumeau), `${b.id} : jumeau inconnu ${b.jumeau}`);
  }
});

test('ville : les jumeaux sont de l’autre rive, les deux professions ont leurs instances', () => {
  for (const b of VILLE.batiments) {
    if (!b.jumeau) continue;
    const j = batiment(b.jumeau);
    if (b.rive !== 'commun' && j.rive !== 'commun') assert.notEqual(b.rive, j.rive, `${b.id} et ${j.id} : même rive`);
  }
  for (const id of ['cnoec', 'croec', 'chreg', 'chnat', 'bercy', 'terrain']) assert.equal(batiment(id).rive, 'ec');
  for (const id of ['cncc', 'crcc', 'h2a', 'sanctions', 'chancellerie']) assert.equal(batiment(id).rive, 'cac');
  for (const id of ['ce', 'ca', 'tracfin', 'parquet', 'tj', 'tcorr', 'cass', 'ifac']) assert.equal(batiment(id).rive, 'commun');
});

test('ville : le jeu « Qui fait quoi ? » vise des bâtiments existants, sans doublon, sur les deux professions', () => {
  assert.ok(VILLE.quiz.length >= 20);
  const qs = new Set();
  for (const q of VILLE.quiz) {
    assert.ok(ids.has(q.r), `question sans bâtiment : ${q.q}`);
    assert.ok(!qs.has(q.q), `question en double : ${q.q}`); qs.add(q.q);
  }
  const rives = new Set(VILLE.quiz.map((q) => batiment(q.r).rive));
  assert.ok(rives.has('ec') && rives.has('cac') && rives.has('commun'));
});

test('ville : les chiffres des pancartes concordent avec les fiches (échantillon)', () => {
  const f = (name) => readFileSync(new URL(`../data/fiches/${name}`, import.meta.url), 'utf8');
  const cac = f('05-cac-exercice.md'), h2a = f('22-schema-sanctions-h2a.md'), ec = f('01-ec-exercice.md');
  assert.match(cac, /\*\*60 membres\*\*/); assert.match(batiment('cncc').pancartes[0].fait, /\*\*60 membres\*\*/);
  assert.match(cac, /\*\*17 CRCC\*\*/); assert.ok(batiment('crcc').chiffres.some((c) => /17 CRCC/.test(c)));
  assert.match(h2a, /\*\*4 personnes qualifiées\*\*/); assert.match(batiment('sanctions').pancartes[0].fait, /\*\*4 personnes qualifiées\*\*/);
  assert.match(h2a, /\*\*3 ans au plus\*\*/); assert.match(batiment('sanctions').pancartes[3].fait, /\*\*3 ans au plus\*\*/);
  assert.match(ec, /suffrage direct/); assert.match(batiment('cnoec').pancartes[0].fait, /suffrage direct/);
  assert.ok(VILLE_CSS.includes('.vl-scene'));
});

test('ville : précachée par le service worker', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./js/ville.js'"));
});
