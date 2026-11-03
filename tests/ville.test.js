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

test('ville 3D : chaque salle désigne un bâtiment existant, chaque personne dit qui elle est et ce qu’elle fait', async () => {
  const { SALLES } = await import('../js/ville3d.js');
  for (const [id, salle] of Object.entries(SALLES)) {
    assert.ok(ids.has(id), `salle sans bâtiment : ${id}`);
    assert.ok(['table', 'rangs', 'tribunal', 'bureau'].includes(salle.layout), `${id} : disposition`);
    for (const g of salle.groupes) assert.ok(g.n > 0 && g.label && g.role && g.qui && g.fait, `${id} : groupe incomplet`);
  }
  for (const b of VILLE.batiments) assert.ok(SALLES[b.id], `${b.id} : personne à l’intérieur`);
  const cncc = SALLES.cncc.groupes.reduce((n, g) => n + g.n, 0); assert.equal(cncc, 60, 'CNCC : 60 membres');
  assert.equal(SALLES.crcc.groupes.reduce((n, g) => n + g.n, 0), 22, 'CRCC : 22 au plus');
  assert.equal(SALLES.sanctions.groupes.reduce((n, g) => n + g.n, 0), 5, 'commission des sanctions : 1 + 4');
  assert.equal(SALLES.chnat.groupes.reduce((n, g) => n + g.n, 0), 5, 'chambre nationale : 1 + 2 + 2');
  assert.equal(SALLES.chreg.groupes.filter((g) => !g.debout).reduce((n, g) => n + g.n, 0), 3, 'chambre régionale : 1 + 2');
});

test('ville 3D : rues, emplacements, symboles et liste rapide couvrent les 29 bâtiments, sans chevauchement', async () => {
  const { LOTS, PLACES, SYMBOLES, ICONES, QUARTIERS_LISTE, STREETS, route, lotOf } = await import('../js/ville3d.js');
  assert.equal(LOTS.length, VILLE.batiments.length);
  for (const b of VILLE.batiments) {
    assert.ok(PLACES[b.id], `${b.id} : pas d’emplacement`);
    assert.ok(SYMBOLES[b.id] && ICONES[SYMBOLES[b.id][0]], `${b.id} : symbole`);
  }
  const listed = QUARTIERS_LISTE.flatMap((q) => q.ids);
  assert.deepEqual([...listed].sort(), [...ids].sort(), 'liste « Aller à » : chaque bâtiment une fois');
  assert.deepEqual(QUARTIERS_LISTE.map((q) => q.titre.split(' ')[0]), ['Expert-comptable', 'Commissaire', 'Juridictions', 'International']);
  for (const q of QUARTIERS_LISTE.slice(0, 2)) for (const id of q.ids) assert.equal(lotOf(id).b.rive, q.rive, `${id} rangé côté ${q.rive}`);
  for (const l of LOTS) {
    assert.ok(l.edge >= 0, `${l.id} : porte hors des rues`);
    if (l.b.rive === 'ec') assert.ok(l.x < 0, `${l.id} : rive EC à l’ouest`);
    if (l.b.rive === 'cac' && STREETS.indexOf(l.st) > 0) assert.ok(l.x > 0, `${l.id} : rive CAC à l’est`);
    const r = route({ x: 0, z: 50 }, l); assert.ok(r.length >= 1 && r[r.length - 1] === l.stop, `${l.id} : itinéraire`);
  }
  for (let i = 0; i < LOTS.length; i++) for (let j = i + 1; j < LOTS.length; j++) {
    const a = LOTS[i], b = LOTS[j];
    assert.ok(!(Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 1 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + 1), `${a.id} et ${b.id} se chevauchent`);
  }
  for (const [a, b] of [['cnoec', 'cncc'], ['croec', 'crcc'], ['bercy', 'chancellerie']]) assert.equal(lotOf(a).st, lotOf(b).st, `${a} et ${b} : même rue`);
  assert.ok(LOTS.every((l) => l.h <= 12), 'bâtiments bas');
});

test('plans imprimables : deux pages (EC, CAC), toutes les pièces, disposition de la visite 3D, PDF présent', async () => {
  const { planHtml, planLayout, plansHtml } = await import('../js/villeplan.js');
  for (const rive of ['ec', 'cac']) {
    const L = planLayout(rive);
    assert.equal(L.rooms.length, VILLE.batiments.length, `${rive} : une pièce par bâtiment`);
    assert.ok(L.height <= 248.01, `${rive} : tient sur une page (${L.height} mm)`);
    for (const r of L.rooms) {
      assert.equal(r.kind === 'ghost', r.lot.b.rive !== rive && r.lot.b.rive !== 'commun', `${r.lot.id} : style`);
      assert.ok(r.x >= 0 && r.x + r.w <= 190.01 && r.w > 5 && r.h > 5, `${r.lot.id} : dans la page`);
    }
    for (let i = 0; i < L.rooms.length; i++) for (let j = i + 1; j < L.rooms.length; j++) {
      const a = L.rooms[i], b = L.rooms[j];
      assert.ok(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01, `${rive} : ${a.lot.id} et ${b.lot.id} se chevauchent`);
    }
    const html = planHtml(rive, { '01-ec-exercice.md': 'Exercice EC' });
    assert.ok(html.includes('class="vp-page"') && html.includes('Fiche : Exercice EC'));
  }
  assert.equal((plansHtml().match(/class="vp-page"/g) || []).length, 2);
  assert.ok(existsSync(new URL('../data/ville-plan.pdf', import.meta.url)), 'PDF absent (npm run pdf:ville)');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/ville3d.js', './js/villeplan.js', './js/vendor/three.module.min.js']) assert.ok(sw.includes(`'${f}'`), `${f} non précaché`);
});
