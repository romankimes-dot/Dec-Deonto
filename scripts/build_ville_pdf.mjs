// PDF de la ville des institutions : le plan sur une page A4 (data/ville-plan.pdf, js/villeplan.js) et la composition
// de chaque institution (data/ville-compositions.pdf, js/ville3d.js), comme la vue « À imprimer » de l'app. `npm run pdf:ville`.
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { plansHtml, PLAN_CSS } from '../js/villeplan.js';
import { compositionHtml, COMPO_CSS } from '../js/ville3d.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const fiches = Object.fromEntries(JSON.parse(readFileSync(new URL('data/fiches/index.json', root), 'utf8')).map((f) => [f.file, f.title]));
const dir = mkdtempSync(join(tmpdir(), 'ville-pdf-'));
const docs = [
  ['ville-plan.pdf', 'Plan de la ville des institutions', `<style>${PLAN_CSS}</style>${plansHtml(fiches)}`],
  ['ville-compositions.pdf', 'Composition des institutions', `<style>${COMPO_CSS}</style><style>body{font-family:'Liberation Sans',Arial,sans-serif;font-size:9pt;color:#000}.cp-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.cp-b{break-inside:avoid}</style><h1 class="cp-ptitle" style="display:block;font-size:15pt;margin:0 0 3mm">Qui compose chaque institution</h1>${compositionHtml()}`],
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [file, label, body] of docs) {
    const src = join(dir, `${file}.html`);
    writeFileSync(src, `<!doctype html><html lang="fr"><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style><body>${body}</body></html>`);
    await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
    const out = new URL(`data/${file}`, root);
    writeFileSync(out, await page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '9mm', bottom: '11mm', left: '10mm', right: '10mm' },
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-family:'Liberation Sans',Arial,sans-serif;font-size:7px;color:#000;padding:0 10mm;display:flex;justify-content:space-between"><span>DEC Épreuve 1 · ${label}</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    }));
    console.log(`→ ${out.pathname}`);
  }
} finally { await browser.close(); }
