import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, stem, keywords, matchExpected, highlight } from '../js/qrc.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

test('normalisation : casse et accents', () => {
  assert.equal(normalize('Indépendance ÉLÉMENT'), 'independance element');
});

test('racines : pluriel et suffixes proches', () => {
  assert.equal(stem('honoraires'), stem('Honoraire'));
  assert.equal(stem('indépendance'), stem('indépendant'));
  assert.equal(stem('commissaires'), stem('commissaire'));
  assert.equal(stem('226'), '226');
});

test('mots-clés : mots vides ignorés, sans doublon', () => {
  const k = keywords('Plus des deux tiers des droits de vote, des droits');
  assert.ok(!k.includes('des') && !k.includes('plus'));
  assert.equal(k.filter((x) => x === stem('droits')).length, 1);
  assert.ok(k.includes(stem('tiers')) && k.includes(stem('vote')));
});

test('éléments retrouvés par un mot distinctif de la tête', () => {
  const exp = ['Assurance raisonnable (conclusion exprimée de façon positive)', 'Assurance modérée (conclusion exprimée de façon négative)'];
  assert.deepEqual(matchExpected('une assurance RAISONNABLE', exp).found, [true, false]);
  assert.deepEqual(matchExpected('assurance moderee', exp).found, [false, true]);
  // « assurance » est commun aux deux : seul, il ne suffit pas.
  assert.deepEqual(matchExpected('assurance', exp).found, [false, false]);
});

test('réponse vide ou hors sujet : rien de retrouvé', () => {
  const exp = ['Violation du secret professionnel (C. pén. 226-13)', 'Faux et usage de faux'];
  assert.deepEqual(matchExpected('', exp).found, [false, false]);
  assert.deepEqual(matchExpected('je ne sais pas', exp).found, [false, false]);
  assert.deepEqual(matchExpected('le secret des professionnels ; faux', exp).found, [true, true]);
});

test('liste de critères : chaque élément retrouvé séparément', () => {
  const exp = [
    'Caractéristiques des clients (et des personnes agissant pour leur compte, bénéficiaires effectifs)',
    'Activité des clients (produits ou services, conditions de transaction, canaux de distribution, espèces…)',
    'Localisation des clients au sens large (établissements, fournisseurs, clients : origine et destination des fonds, pays à risque)',
    'Missions proposées par la structure',
  ];
  assert.deepEqual(matchExpected('Les caractéristiques du client, son activité, et les missions', exp).found, [true, true, false, true]);
});

test('surlignage : positions dans le texte tapé, texte échappé', () => {
  const exp = ['Secret professionnel'];
  const { marks } = matchExpected('Le <secret> pro', exp);
  assert.equal(marks.length, 1);
  assert.deepEqual(marks[0].el, [0]);
  assert.equal(highlight('Le <secret> pro', marks, esc), 'Le &lt;<mark data-el="0">secret</mark>&gt; pro');
});
