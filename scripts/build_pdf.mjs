// PDF des fiches à imprimer, noir et blanc : couverture et légende, sommaire paginé, une page de garde par
// partie (schémas, fiches EC, fiches CAC), une fiche par page, numéros de page en pied.
// Usage : npm run pdf  →  data/fiches-a-imprimer.pdf (A4, une page par feuille) et
// data/fiches-a-imprimer-2-par-feuille.pdf (pages A5, deux côte à côte sur A4 paysage, texte à taille normale).
// À relancer après toute modification d'une fiche.
// Besoin : Playwright (Chromium), pdftotext (poppler-utils) pour paginer le sommaire, pypdf pour l'imposition 2 par feuille.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderMarkdown } from '../js/bank.js';
import { STEPS } from '../js/plan.js';
import { inputsHash } from './pdf_inputs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const index = JSON.parse(readFileSync(join(ROOT, 'data/fiches/index.json'), 'utf8'));

// Même ordre que l'onglet Fiches : schémas dans l'ordre du parcours, puis fiches de référence EC et CAC.
const stepOf = (file) => { const i = STEPS.findIndex((s) => (s.fiches || []).includes(file)); return i < 0 ? 99 : i + 1; };
const visuels = index.filter((f) => f.kind === 'visuel').map((f) => ({ ...f, n: stepOf(f.file) })).sort((a, b) => a.n - b.n);
const synth = index.filter((f) => f.kind !== 'visuel');
const PARTS = [
  { title: 'Les schémas', sub: 'Dans l’ordre du parcours de révision', intro: 'Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision. À lire dans cet ordre.', fiches: visuels, label: (f, j, n) => `Schéma ${j + 1} / ${n}${f.n < 99 ? ` · étape ${f.n} du parcours` : ''}` },
  { title: 'Fiches de référence : expert-comptable', sub: 'Exercice, déontologie, qualité, responsabilité', intro: 'Le détail des règles de l’expert-comptable, à consulter au besoin après les schémas.', fiches: synth.filter((f) => /-ec-/.test(f.file)), label: () => 'Fiche de référence · expert-comptable' },
  { title: 'Fiches de référence : commissaire aux comptes', sub: 'Exercice, déontologie, contrôle, responsabilité', intro: 'Le détail des règles du commissaire aux comptes, à consulter au besoin après les schémas.', fiches: synth.filter((f) => /-cac-/.test(f.file)), label: () => 'Fiche de référence · commissaire aux comptes' },
].filter((p) => p.fiches.length);
let k = 0; for (const p of PARTS) for (const f of p.fiches) f.id = `F${String(++k).padStart(2, '0')}`;
const total = k;

// Tableaux courts : jamais coupés entre deux pages ; tableaux larges (5 colonnes et plus) : texte plus petit.
const tables = (h) => h.replace(/<table>([\s\S]*?)<\/table>/g, (all, body) => {
  const rows = (body.match(/<tr>/g) || []).length; const cols = ((/<tr>([\s\S]*?)<\/tr>/.exec(body) || [, ''])[1].match(/<th>/g) || []).length;
  const cls = [rows <= 9 ? 'short' : '', cols >= 5 ? 'wide' : ''].filter(Boolean).join(' ');
  return cls ? `<table class="${cls}">${body}</table>` : all;
});

function html(pages, cls, tight = new Set()) {
  const pg = (id) => esc(pages?.[id] ?? '00');
  const toc = PARTS.map((p, i) => `<h3>Partie ${i + 1} · ${esc(p.title)} <span style="float:right">p. ${pg(`P${i + 1}`)}</span></h3><ol>${p.fiches.map((f) => `<li><span class="tick"></span><span class="t">${esc(f.title)}</span><span class="dots"></span><span class="p">${pg(f.id)}</span></li>`).join('')}</ol>`).join('');
  const parts = PARTS.map((p, i) => `<section class="part"><span class="mk">§P${i + 1}§</span><div class="num">${i + 1}</div><h2>${esc(p.title)}</h2><p><strong>${esc(p.sub)}</strong></p><p>${esc(p.intro)}</p><ol>${p.fiches.map((f) => `<li>${esc(f.title)} <span class="muted">· p. ${pg(f.id)}</span></li>`).join('')}</ol></section>`
    + p.fiches.map((f, j) => `<article class="fiche print-fiche${tight.has(f.id) ? ' tight' : ''}"><span class="mk">§${f.id}§</span><div class="print-label"><span>${esc(p.label(f, j, p.fiches.length))}</span><span>Partie ${i + 1}</span></div>${tables(renderMarkdown(readFileSync(join(ROOT, 'data/fiches', f.file), 'utf8')))}<span class="mk">§E${f.id.slice(1)}§</span></article>`).join('')).join('');
  return `<!doctype html><html lang="fr" data-theme="light" class="${cls}"><head><meta charset="utf-8"><base href="${pathToFileURL(ROOT).href}/"><title>DEC Épreuve 1 · Fiches à imprimer</title>
<link rel="stylesheet" href="css/app.css"><link rel="stylesheet" href="scripts/print.css"></head><body>
<section class="cover"><div class="kicker">DEC · Épreuve 1</div><h1>Réglementation professionnelle et déontologie de l’expert-comptable et du commissaire aux comptes</h1><div class="rule"></div>
<p><strong>Fiches à imprimer : ${total} fiches en ${PARTS.length} parties.</strong></p><p>Une fiche commence toujours sur une nouvelle page : imprimez seulement celles que vous voulez. Marge droite large pour annoter.</p>
<div class="legend"><h3>Lire les schémas en noir et blanc</h3><ul>
<li><span class="sw ec"></span>Trait <strong>simple</strong> à gauche : expert-comptable (colonne de gauche des comparatifs).</li>
<li><span class="sw cac"></span>Trait <strong>double</strong> à gauche : commissaire aux comptes (colonne de droite).</li>
<li><span class="fpill ec">EC</span> <span class="fpill cac">CAC</span> : la règle vise cette profession.</li>
<li><span class="fpill trap">piège</span> : erreur fréquente à l’examen. <span class="fpill check">à vérifier</span> : point à confirmer.</li>
<li>Dans les arbres : cadre <strong>épais</strong> = question ; <strong>✓</strong> = conclusion ; <strong>✗</strong> en pointillés = interdit ou piège.</li>
<li>Échelles : plus la barre est longue, plus le niveau est élevé.</li></ul></div></section>
<section class="toc"><h2>Sommaire</h2><p class="hint">Cochez la case quand la fiche est apprise.</p>${toc}</section>
${parts}</body></html>`;
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = mkdtempSync(join(tmpdir(), 'fiches-pdf-'));
const browser = await chromium.launch();
const FORMATS = [
  { out: 'fiches-a-imprimer.pdf', cls: 'a4', format: 'A4', margin: { top: '14mm', bottom: '16mm', left: '18mm', right: '28mm' }, pad: '18mm', font: 10 },
  { out: 'fiches-a-imprimer-2-par-feuille.pdf', cls: 'a5', format: 'A5', margin: { top: '9mm', bottom: '11mm', left: '10mm', right: '16mm' }, pad: '10mm', font: 9, twoUp: true },
];
const pageText = (file) => execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\f');
try {
  const page = await browser.newPage();
  for (const F of FORMATS) {
    const pdf = async (pages, tight) => {
      const file = join(dir, 'fiches.html'); writeFileSync(file, html(pages, F.cls, tight));
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      return page.pdf({
        format: F.format, printBackground: true, displayHeaderFooter: true, margin: F.margin,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font-family:Arial,sans-serif;font-size:${F.font}px;color:#000;padding:0 ${F.pad};display:flex;justify-content:space-between"><span>DEC Épreuve 1 · Déontologie EC / CAC</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      });
    };
    // Marqueurs invisibles §F01§ (début de fiche), §E01§ (fin), §P1§ (page de garde) → numéro de page.
    const locate = async (pages, tight) => {
      const file = join(dir, 'p1.pdf'); writeFileSync(file, await pdf(pages, tight));
      const text = pageText(file); const at = {};
      text.forEach((t, i) => { for (const m of t.matchAll(/§([PFE]\d+)§/g)) at[m[1]] ??= i + 1; });
      return { at, text };
    };
    // Passe 1 : fiches dont la dernière page n'a que quelques lignes → resserrées (classe tight).
    const p1 = await locate(null);
    const tight = new Set(PARTS.flatMap((p) => p.fiches).filter((f) => {
      const end = p1.at[`E${f.id.slice(1)}`];
      return end > p1.at[f.id] && p1.text[end - 1].replace(/§E\d+§/, '').trim().length < 400;
    }).map((f) => f.id));
    // Passe 2 : pages définitives ; passe 3 : sommaire paginé.
    const { at: pages } = await locate(null, tight);
    const missing = [...PARTS.map((_, i) => `P${i + 1}`), ...PARTS.flatMap((p) => p.fiches.map((f) => f.id))].filter((id) => !pages[id]);
    if (missing.length) throw new Error(`${F.out} : marqueurs introuvables : ${missing.join(', ')}`);
    const flat = join(dir, 'p2.pdf'); writeFileSync(flat, await pdf(pages, tight));
    const final = pageText(flat);
    final.forEach((t, i) => { for (const m of t.matchAll(/§([PFE]\d+)§/g)) if (pages[m[1]] !== i + 1 && !final.slice(0, i).some((x) => x.includes(m[0]))) throw new Error(`${F.out} : sommaire décalé : ${m[1]}`); });
    const OUT = join(ROOT, 'data', F.out);
    if (F.twoUp) execFileSync('python3', ['-I', join(ROOT, 'scripts', 'impose_2up.py'), flat, OUT], { stdio: 'inherit' });
    else writeFileSync(OUT, readFileSync(flat));
    console.log(`${OUT} : ${final.length - 1} pages${F.twoUp ? ` sur ${Math.ceil((final.length - 1) / 2)} feuilles` : ''}, ${total} fiches (${tight.size} resserrées), ${(readFileSync(OUT).length / 1024).toFixed(0)} Ko`);
  }
  writeFileSync(join(ROOT, 'data', 'fiches-a-imprimer.pdf.sha256'), `${inputsHash(ROOT)}\n`);
} finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
