import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

test('revue 2026-11 : termes ajoutés et alias attendus', () => {
  const byId = Object.fromEntries(gloss.map((e) => [e.id, e]));
  for (const id of ['oec', 'cnil', 'cse', 'oti', 'csrd', 'cmf', 'sel', 'spfpl', 'spe', 'scp', 'dec', 'dscg', 'cafcac', 'vae',
    'loi-macron', 'mandat-implicite', 'ec-entreprise', 'salaries-83', 'taux-encadrement', 'petit-groupe', 'fonctions-sensibles',
    'lien-personnel', 'tiers-objectif', 'mission-prestation', 'declaration-activite', 'procedure-simplifiee', 'suspension-provisoire',
    'formation-restreinte', 'alerte', 'vigilance', 'operation-atypique', 'dps', 'cer', 'apg', 'cnccfp', 'ceaob', 'anc', 'cjue', 'ifac',
    'np-2910', 'qcm-qrc', 'ecf', 'certificateur', 'diligences', 'quitus', 'avertissement', 'blame', 'suspension', 'reprimande', 'radiation',
    'sanctions-disciplinaires', 'comite-lcb-ft']) assert.ok(byId[id], id);
  assert.ok(!byId['comite-lbc'], 'comite-lbc renommé');
  assert.ok(!byId.isa.alias.includes('NP 2910'), 'NP 2910 a sa propre entrée');
  const m = buildMatcher(gloss);
  const ids = (t) => findTerms(t, m).map((h) => h.entry.id);
  assert.deepEqual(ids('NP 2910'), ['np-2910']);
  assert.deepEqual(ids('LBC-FT et LCB'), ['lcb-ft', 'lcb-ft']);
  assert.deepEqual(ids('le comité LBC-FT'), ['comite-lcb-ft']);
  assert.deepEqual(ids('ISQC 1 puis ISQM 1'), ['npmq', 'npmq']);
  assert.deepEqual(ids('les PIE'), ['eip']);
  assert.deepEqual(ids('C. mon. fin.'), ['cmf']);
  assert.deepEqual(ids('la suspension provisoire, puis la suspension'), ['suspension-provisoire', 'suspension']);
  assert.deepEqual(ids("magistrat de l'ordre judiciaire"), []);
});

test('définitions : pas de journal de relecture, sigles et dates harmonisés', () => {
  for (const e of gloss) {
    assert.ok(!/sciemment|à vérifier|non vérifié|non consulté|Relecture/i.test(e.def), e.id);
    assert.ok(!/\b\d{2}\/\d{2}\/\d{4}\b/.test(e.def), `${e.id} : date en toutes lettres`);
    assert.ok(!/LBC-FT/.test(e.terme + e.def), `${e.id} : sigle unique LCB-FT`);
    assert.ok(e.def.length <= 600, `${e.id} : définition trop longue`);
  }
});

test('tout sigle fréquent des fiches, questions et shorts figure au glossaire', () => {
  const dir = (d, ext) => readdirSync(new URL(d, root)).filter((f) => f.endsWith(ext)).map((f) => readFileSync(new URL(d + f, root), 'utf8'));
  const txt = [...dir('data/fiches/', '.md'), ...dir('data/bank/', '.json'), ...dir('data/shorts/', '.json')].join('\n');
  const m = buildMatcher(gloss.map((e) => ({ ...e, auto: true })));
  const covered = new Set(findTerms(txt, m).map((h) => txt.slice(h.start, h.end)));
  const count = {};
  for (const [s] of txt.matchAll(/(?<![\p{L}\p{N}-])\p{Lu}{3,}(?![\p{L}\p{N}])/gu)) count[s] = (count[s] || 0) + 1;
  // Mots en capitales, sigles hors programme ou de travail, sans intérêt pour le candidat.
  const ignore = new Set(['LEGI', 'VERIFICATION', 'PAS', 'ABS', 'SMIC', 'TVA', 'PME', 'ZEN', 'ARPEC', 'NON', 'OUI', 'SANS', 'AVEC', 'ET', 'OU']);
  const missing = Object.entries(count)
    .filter(([s, n]) => n >= 5 && !ignore.has(s) && ![...covered].some((c) => c === s || c.includes(s)))
    .map(([s, n]) => `${s} (${n})`);
  assert.deepEqual(missing, []);
});
