import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderScene, PROP_NAMES, SPECIAL_PROPS } from '../js/scene.js';
import { buildContext, buildCatalog, GRADES } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
const catalog = buildCatalog(buildContext(bank));

test('chaque objet de badge existe dans la scène', () => {
  for (const b of catalog) if (b.prop) assert.ok(PROP_NAMES.has(b.prop) || SPECIAL_PROPS.has(b.prop), `${b.id} → ${b.prop}`);
});

test('chaque grade produit un SVG valide avec le personnage', () => {
  for (const gr of GRADES) {
    const svg = renderScene(gr.n, { decor: gr.decor });
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.match(svg, /class="person"/);
    assert.equal((svg.match(/<g/g) || []).length >= (svg.match(/<\/g>/g) || []).length, true);
  }
});

test('les badges débloqués apparaissent physiquement, et seulement eux', () => {
  const empty = renderScene(5, { decor: 'perso' });
  assert.doesNotMatch(empty, /data-badge="mast-EC-deontologie"/);
  const full = renderScene(5, { decor: 'perso', badgeProps: [['mast-EC-deontologie', 'balance', 'Balance'], ['ser-5', 'tasse', 'Tasse']] });
  assert.match(full, /data-badge="mast-EC-deontologie"/);
  assert.match(full, /data-badge="ser-5"/);
});

test('la plaque n’apparaît qu’au cabinet (grade 8) et la plante grandit avec le record', () => {
  assert.doesNotMatch(renderScene(7, { decor: 'perso' }), /Plaque sur la porte/);
  assert.match(renderScene(8, { decor: 'cabinet' }), /Plaque sur la porte/);
  assert.doesNotMatch(renderScene(1, { bestStreak: 2 }), /record de série/);
  const small = renderScene(1, { bestStreak: 3 }).length;
  const big = renderScene(1, { bestStreak: 50 }).length;
  assert.ok(big > small);
});
