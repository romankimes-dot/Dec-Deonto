// PDF des fiches à imprimer, noir et blanc : couverture et légende, sommaire paginé, une page de garde par
// partie (schémas, fiches EC, fiches CAC), une fiche par page, numéros de page en pied.
// Usage : npm run pdf  →  data/fiches-a-imprimer.pdf (à relancer après toute modification d'une fiche).
// Besoin : Playwright (Chromium) et pdftotext (poppler-utils), pour placer les numéros de page du sommaire.
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
const OUT = join(ROOT, 'data', 'fiches-a-imprimer.pdf');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const index = JSON.parse(readFileSync(join(ROOT, 'data/fiches/index.json'), 'utf8'));

// Même ordre que l'onglet Fiches : schémas dans l'ordre du parcours, puis fiches de référence EC et CAC.
const stepOf = (file) => { const i = STEPS.findIndex((s) => (s.fiches || []).includes(file)); return i < 0 ? 99 : i + 1; };
const visuels = index.filter((f) => f.kind === 'visuel').map((f) => ({ ...f, n: stepOf(f.file) })).sort((a, b) => a.n - b.n);
const synth = index.filter((f) => f.kind !== 'visuel');
const PARTS = [
  { title: 'Les schémas', sub: 'Dans l’ordre du parcours de révision', intro: 'Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision. À lire dans cet ordre.', fiches: visuels, label: (f) => (f.n < 99 ? `Schéma · étape ${f.n}` : 'Schéma') },
  { title: 'Fiches de référence : expert-comptable', sub: 'Exercice, déontologie, qualité, responsabilité', intro: 'Le détail des règles de l’expert-comptable, à consulter au besoin après les schémas.', fiches: synth.filter((f) => /-ec-/.test(f.file)), label: () => 'Fiche de référence · expert-comptable' },
  { title: 'Fiches de référence : commissaire aux comptes', sub: 'Exercice, déontologie, contrôle, responsabilité', intro: 'Le détail des règles du commissaire aux comptes, à consulter au besoin après les schémas.', fiches: synth.filter((f) => /-cac-/.test(f.file)), label: () => 'Fiche de référence · commissaire aux comptes' },
].filter((p) => p.fiches.length);
let k = 0; for (const p of PARTS) for (const f of p.fiches) f.id = `F${String(++k).padStart(2, '0')}`;
const total = k;

function html(pages) {
  const pg = (id) => esc(pages?.[id] ?? '00');
  const toc = PARTS.map((p, i) => `<h3>Partie ${i + 1} · ${esc(p.title)} <span style="float:right">p. ${pg(`P${i + 1}`)}</span></h3><ol>${p.fiches.map((f) => `<li><span class="tick"></span><span class="t">${esc(f.title)}</span><span class="dots"></span><span class="p">${pg(f.id)}</span></li>`).join('')}</ol>`).join('');
  const parts = PARTS.map((p, i) => `<section class="part"><span class="mk">§P${i + 1}§</span><div class="num">${i + 1}</div><h2>${esc(p.title)}</h2><p><strong>${esc(p.sub)}</strong></p><p>${esc(p.intro)}</p><ol>${p.fiches.map((f) => `<li>${esc(f.title)} <span class="muted">· p. ${pg(f.id)}</span></li>`).join('')}</ol></section>`
    + p.fiches.map((f) => `<article class="fiche print-fiche"><span class="mk">§${f.id}§</span><div class="print-label"><span>${esc(p.label(f))}</span><span>Partie ${i + 1}</span></div>${renderMarkdown(readFileSync(join(ROOT, 'data/fiches', f.file), 'utf8'))}</article>`).join('')).join('');
  return `<!doctype html><html lang="fr" data-theme="light"><head><meta charset="utf-8"><base href="${pathToFileURL(ROOT).href}/"><title>DEC Épreuve 1 · Fiches à imprimer</title>
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
try {
  const page = await browser.newPage();
  const pdf = async (pages) => {
    const file = join(dir, 'fiches.html'); writeFileSync(file, html(pages));
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: true,
      margin: { top: '14mm', bottom: '16mm', left: '18mm', right: '28mm' },
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#000;padding:0 18mm 0 18mm;display:flex;justify-content:space-between"><span>DEC Épreuve 1 · Déontologie EC / CAC</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    });
  };
  // Passe 1 : repérer la page de chaque fiche (marqueurs invisibles), passe 2 : sommaire paginé.
  const first = join(dir, 'p1.pdf'); writeFileSync(first, await pdf(null));
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', first, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const pages = {};
  text.split('\f').forEach((t, i) => { for (const m of t.matchAll(/§([PF]\d+)§/g)) pages[m[1]] ??= i + 1; });
  const missing = [...PARTS.map((_, i) => `P${i + 1}`), ...PARTS.flatMap((p) => p.fiches.map((f) => f.id))].filter((id) => !pages[id]);
  if (missing.length) throw new Error(`marqueurs introuvables : ${missing.join(', ')}`);
  const out = await pdf(pages);
  writeFileSync(OUT, out);
  writeFileSync(`${OUT}.sha256`, `${inputsHash(ROOT)}\n`);
  const final = execFileSync('pdftotext', ['-enc', 'UTF-8', OUT, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\f');
  final.forEach((t, i) => { for (const m of t.matchAll(/§([PF]\d+)§/g)) if (pages[m[1]] !== i + 1 && !final.slice(0, i).some((x) => x.includes(m[0]))) throw new Error(`sommaire décalé : ${m[1]}`); });
  const n = final.length - 1;
  console.log(`${OUT} : ${n} pages, ${total} fiches, ${(out.length / 1024).toFixed(0)} Ko`);
} finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
