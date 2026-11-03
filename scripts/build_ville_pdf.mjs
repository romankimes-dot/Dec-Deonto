// PDF du plan de la ville des institutions, un par profession (data/ville-plan-ec.pdf, data/ville-plan-cac.pdf) :
// carte numérotée en noir et blanc, puis annotations qui replacent fiches, personnes et chiffres dans les
// bâtiments. Contenu : js/villeplan.js (le même que la vue « Plan à imprimer » de l'app). `npm run pdf:ville`.
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { planHtml, PLAN_CSS } from '../js/villeplan.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const fiches = Object.fromEntries(JSON.parse(readFileSync(new URL('data/fiches/index.json', root), 'utf8')).map((f) => [f.file, f.title]));
const dir = mkdtempSync(join(tmpdir(), 'ville-pdf-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const rive of ['ec', 'cac']) {
    const src = join(dir, `${rive}.html`);
    writeFileSync(src, `<!doctype html><html lang="fr"><meta charset="utf-8"><style>html,body{margin:0;background:#fff}${PLAN_CSS}</style><body>${planHtml(rive, fiches)}</body></html>`);
    await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
    const out = new URL(`data/ville-plan-${rive}.pdf`, root);
    writeFileSync(out, await page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '10mm', bottom: '12mm', left: '12mm', right: '12mm' },
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-family:'Liberation Sans',Arial,sans-serif;font-size:8px;color:#000;padding:0 12mm;display:flex;justify-content:space-between"><span>DEC Épreuve 1 · La ville des institutions · ${rive === 'ec' ? 'Expert-comptable' : 'Commissaire aux comptes'}</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    }));
    console.log(`→ ${out.pathname}`);
  }
} finally { await browser.close(); }
