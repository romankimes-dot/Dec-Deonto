import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateEntry, buildMatcher, findTerms, search, norm } from '../js/glossaire.js';

const root = new URL('../', import.meta.url);
const gloss = JSON.parse(readFileSync(new URL('data/glossaire.json', root), 'utf8'));

test('glossaire publié : format, identifiants uniques, fiches existantes', () => {
  const ids = new Set();
  for (const e of gloss) {
    assert.deepEqual(validateEntry(e), [], e.id);
    assert.ok(!ids.has(e.id), `doublon ${e.id}`); ids.add(e.id);
    if (e.fiche) assert.ok(existsSync(new URL(`data/fiches/${e.fiche}`, root)), e.fiche);
  }
  assert.ok(gloss.length >= 60);
});

test('repérage : sigles en casse exacte, mots en casse libre, apostrophes, pluriels', () => {
  const m = buildMatcher(gloss);
  const ids = (t) => findTerms(t, m).map((h) => h.entry.id);
  assert.deepEqual(ids('La H2A contrôle les CAC des EIP.'), ['h2a', 'eip']);
  assert.deepEqual(ids('ex-H3C'), ['h2a']);
  assert.deepEqual(ids('la eip'), []);
  assert.deepEqual(ids('Délit d’entrave et délai de viduité'), ['entrave', 'viduite']);
  assert.deepEqual(ids('Le délit d\'entrave'), ['entrave']);
  assert.deepEqual(ids('Les mesures de sauvegarde suffisent'), ['sauvegarde']);
  assert.deepEqual(ids('les commissaires du gouvernement'), ['commissaire-gouvernement']);
  assert.deepEqual(ids('Un EC et un CAC'), [], 'EC et CAC ne sont pas soulignés');
  assert.deepEqual(ids('NP 2300 et NP 23000'), ['np-2300']);
  assert.deepEqual(ids('réseaux sociaux'), ['reseau']);
  assert.deepEqual(ids('révélation des faits délictueux'), ['revelation']);
  const [h] = findTerms('Voir le CROEC.', m);
  assert.equal('Voir le CROEC.'.slice(h.start, h.end), 'CROEC');
});

test('recherche : accents, sigle, filtre, ordre', () => {
  assert.equal(norm('Révélation’'), "revelation'");
  assert.equal(search(gloss, 'h2a')[0].id, 'h2a');
  assert.equal(search(gloss, 'viduite')[0].id, 'viduite');
  assert.ok(search(gloss, 'haute autorite').some((e) => e.id === 'h2a'));
  assert.ok(search(gloss, '', 'institution').every((e) => e.cat === 'institution'));
  assert.ok(search(gloss, '', 'ec').every((e) => e.prof.includes('ec')));
  assert.equal(search(gloss, 'zzzz').length, 0);
});
