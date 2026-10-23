import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { renderMarkdown, splitFrontMatter } from '../js/bank.js';

const DIR = new URL('../data/fiches/', import.meta.url);

test('entête : lue puis retirée du rendu', () => {
  const md = '---\ntype: visuel\nquestions: EC:lcb_ft 2018-05-EC-01\n---\n# Titre\n';
  const { meta, body } = splitFrontMatter(md);
  assert.equal(meta.type, 'visuel');
  assert.equal(meta.questions, 'EC:lcb_ft 2018-05-EC-01');
  assert.equal(body, '# Titre\n');
  const html = renderMarkdown(md);
  assert.ok(!html.includes('questions:'));
  assert.ok(!html.includes('<hr>'));
});

test('bloc vs : intitulés par défaut et personnalisés', () => {
  const html = renderMarkdown('```vs\nSerment | Conseil régional | Cour d\'appel\n```');
  assert.match(html, /Expert-comptable.*Commissaire aux comptes/s);
  assert.match(html, /<div class="vs-k">Serment<\/div><div class="vs-a">Conseil régional<\/div><div class="vs-b">Cour d'appel<\/div>/);
  const custom = renderMarkdown('```vs\n= | EIP | Non-EIP\nRègle | Liste | Pas de liste\n```');
  assert.match(custom, /<span class="vs-a">EIP<\/span><span class="vs-b">Non-EIP<\/span>/);
});

test('bloc arbre : imbrication équilibrée et types de nœuds', () => {
  const html = renderMarkdown('```arbre\n? Racine\n  = Oui\n  ? Non\n    ! Interdit\n  Autre\n```');
  assert.equal((html.match(/<ul>/g) || []).length, (html.match(/<\/ul>/g) || []).length);
  assert.equal((html.match(/<li>/g) || []).length, (html.match(/<\/li>/g) || []).length);
  assert.match(html, /node q">Racine/);
  assert.match(html, /node ok">Oui/);
  assert.match(html, /node ko">Interdit/);
});

test('blocs echelle, frise, etapes et pastilles', () => {
  assert.match(renderMarkdown('```echelle\nRaisonnable | Audit | Opinion\nAucune | Compilation\n```'), /--w:100%.*--w:55%/s);
  assert.match(renderMarkdown('```frise\n6 exercices | Fin du mandat\n```'), /<span class="fr-k">6 exercices<\/span>/);
  assert.match(renderMarkdown('```etapes\nSaisine | Président du CROEC\n```'), /<span class="et-k">Saisine<\/span>Président du CROEC/);
  assert.match(renderMarkdown('{EC} et {CAC} {!} {?}'), /fpill ec.*fpill cac.*fpill trap.*fpill check/);
});

test('le texte des blocs est échappé', () => {
  const html = renderMarkdown('```vs\n<script> | a | b\n```');
  assert.ok(!html.includes('<script>'));
});

test('chaque fiche se rend sans bloc ouvert ni balise déséquilibrée', () => {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith('.md'))) {
    const html = renderMarkdown(readFileSync(new URL(f, DIR), 'utf8'));
    assert.ok(!html.includes('```'), `${f} : bloc non rendu`);
    for (const tag of ['ul', 'ol', 'li', 'div']) {
      const open = (html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
      const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(open, close, `${f} : <${tag}> déséquilibré`);
    }
  }
});

test('index des fiches : les schémas pointent vers des questions existantes', () => {
  const index = JSON.parse(readFileSync(new URL('index.json', DIR), 'utf8'));
  const ids = new Set(JSON.parse(readFileSync(new URL('../questions.json', DIR), 'utf8')).questions.map((q) => q.id));
  const visuels = index.filter((f) => f.kind === 'visuel');
  assert.ok(visuels.length >= 10);
  for (const f of visuels) {
    assert.ok(f.questions.length > 0, f.file);
    for (const id of f.questions) assert.ok(ids.has(id), `${f.file} : ${id}`);
  }
});
