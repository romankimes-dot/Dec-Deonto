// Audit de contenu : jeu de l'intrus, confusion EC / CAC, questions de transfert, équilibre des QCM rédigés par IA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as GM from '../js/games.js';
import { buildClusters } from '../js/cluster.js';
import { SESSION_LABEL, isAnnale } from '../js/bank.js';
import { STEPS, gameOfDay, GAME_ROTATION } from '../js/plan.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url))).questions;
const byId = Object.fromEntries(bank.map((q) => [q.id, q]));
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

test('intrus : une manche = trois éléments attendus et le leurre, une seule bonne réponse', () => {
  const items = GM.intrusItems(bank);
  assert.ok(items.length >= 35, `${items.length} items`);
  assert.ok(items.some((x) => x.cross) && items.some((x) => !x.cross));
  for (const it of items) {
    assert.ok(it.id.startsWith(GM.INTRUS_PREFIX) && byId[it.qid]);
    assert.ok(it.items.length >= 3 && !it.items.includes(it.leurre), it.id);
    assert.ok(it.ask.length > 10 && it.why.length > 10, it.id);
    for (let s = 1; s < 6; s++) {
      const r = GM.intrusRound(it, seeded(s * 97));
      assert.equal(r.choices.length, 4);
      assert.equal(new Set(r.choices).size, 4);
      assert.equal(r.choices[r.answer], it.leurre);
      assert.equal(r.choices.filter((c) => it.items.includes(c)).length, 3);
    }
  }
});

test('intrus : le leurre « autre profession » couvre les deux professions', () => {
  const items = GM.intrusItems(bank).filter((x) => x.cross);
  assert.ok(items.some((x) => x.prof === 'EC') && items.some((x) => x.prof === 'CAC'));
});

test('intrus : jeu du jour et répétition comme les autres jeux', () => {
  assert.ok(GAME_ROTATION.includes('intrus'));
  assert.equal(gameOfDay('2026-10-24', { 'int:2022-11-CAC-11': { ok: 1, n: 6 }, 'duel:1': { ok: 9, n: 10 } }), 'intrus');
  const st = GM.intrusCrossStats(GM.intrusItems(bank), { 'int:2022-11-CAC-11': { ok: 1, n: 4 }, 'int:2019-05-EC-06': { ok: 0, n: 3 } });
  assert.deepEqual([st.n, st.ko], [4, 3], 'seuls les intrus « autre profession » comptent');
});

test('confusion EC / CAC : part des réponses QCM qui choisissent le leurre de l’autre profession', () => {
  const q = bank.find((x) => Number.isInteger(x.qcm.crossProf) && x.profession === 'CAC');
  const good = q.qcm.answer; const cp = q.qcm.crossProf; const other = [0, 1, 2, 3].find((i) => i !== good && i !== cp);
  const att = [
    { id: q.id, mode: 'qcm', ok: false, pick: cp }, { id: q.id, mode: 'qcm', ok: false, pick: other },
    { id: q.id, mode: 'qcm', ok: true, pick: good }, { id: q.id, mode: 'qcm', ok: true, pick: good },
    { id: q.id, mode: 'qrc', ok: false }, { id: q.id, mode: 'qcm', ok: false }, // sans choix enregistré : ignorée
  ];
  const c = GM.confusionStats(att, byId);
  assert.equal(c.n, 4); assert.equal(c.cross, 1); assert.equal(c.rate, 0.25); assert.equal(c.shareOfErrors, 0.5);
  assert.equal(c.byProf.CAC.n, 4); assert.equal(c.byProf.EC.n, 0);
  assert.equal(GM.confusionStats([], byId).rate, null);
});

test('crossProf : jamais sur un sujet QCM officiel, toujours un leurre', () => {
  const marked = bank.filter((q) => Number.isInteger(q.qcm.crossProf));
  assert.ok(marked.length >= 40, `${marked.length} QCM marqués`);
  for (const q of marked) {
    assert.ok(q.origFormat === 'qrc' || q.origFormat === 'transfert', `${q.id} : sujet QCM officiel`);
    assert.notEqual(q.qcm.crossProf, q.qcm.answer, q.id);
  }
});

test('QCM rédigés par IA : ni les termes absolus ni la longueur ne désignent la bonne réponse', () => {
  const ABS = /\b(uniquement|seul|seule|seuls|seules|seulement|automatiquement|aucun|aucune|jamais|toujours|exclusivement|systématiquement|obligatoirement|nécessairement|totalement|entièrement|absolument|librement|de plein droit|tout|toute|tous|toutes)\b/i;
  const qs = bank.filter((q) => q.origFormat === 'qrc');
  let g = 0, d = 0, longest = 0;
  for (const q of qs) {
    const c = q.qcm.choices; const a = q.qcm.answer;
    c.forEach((x, i) => { if (ABS.test(x)) { if (i === a) g++; else d++; } });
    if (c[a].length === Math.max(...c.map((x) => x.length))) longest++;
  }
  const rg = g / qs.length, rd = d / (3 * qs.length);
  assert.ok(Math.abs(rg - rd) < 0.04, `termes absolus : bonnes ${(rg * 100).toFixed(1)} %, leurres ${(rd * 100).toFixed(1)} %`);
  assert.ok(longest / qs.length < 0.33, `bonne réponse la plus longue : ${longest}/${qs.length}`);
});

test('questions de transfert : marquées hors annales, jamais comptées comme posées à une session', () => {
  const tr = bank.filter((q) => !isAnnale(q));
  assert.ok(tr.length >= 15);
  for (const q of tr) {
    assert.equal(q.session, 'transfert'); assert.equal(q.hors_annales, true, q.id);
    assert.ok(q.reference && q.confidence, q.id);
  }
  assert.equal(SESSION_LABEL('transfert'), 'hors annales (transfert)');
  assert.equal(SESSION_LABEL('2025-11'), 'nov. 2025');
  const { clusterOf } = buildClusters(bank);
  for (const q of tr) assert.equal(clusterOf[q.id], undefined, `${q.id} regroupée avec des annales`);
});

test('schéma « procédure de sanction H2A » : dans l’étape discipline, avec ses questions', () => {
  const step = STEPS.find((s) => s.id === 'discipline');
  assert.ok(step.fiches.includes('22-schema-sanctions-h2a.md'));
  const idx = JSON.parse(readFileSync(new URL('../data/fiches/index.json', import.meta.url)));
  const f = idx.find((x) => x.file === '22-schema-sanctions-h2a.md');
  assert.equal(f.kind, 'visuel');
  assert.ok(f.questions.length >= 20 && f.questions.some((id) => id.startsWith('transfert-')));
  const md = readFileSync(new URL('../data/fiches/22-schema-sanctions-h2a.md', import.meta.url), 'utf8');
  assert.ok(GM.arbreItems('22-schema-sanctions-h2a.md', md).length > 0, 'l’arbre alimente le jeu des arbres');
  assert.ok(GM.duelItems('22-schema-sanctions-h2a.md', md).length > 0, 'le comparatif alimente le duel');
});
