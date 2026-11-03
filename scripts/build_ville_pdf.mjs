// PDF des plans de la ville des institutions (data/ville-plan.pdf) : deux pages A4, expert-comptable puis
// commissaire aux comptes, dessinées comme un plan d'appartement (js/villeplan.js, comme la vue « Plans à imprimer »
// de l'app). `npm run pdf:ville`.
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { plansHtml, PLAN_CSS } from '../js/villeplan.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const fiches = Object.fromEntries(JSON.parse(readFileSync(new URL('data/fiches/index.json', root), 'utf8')).map((f) => [f.file, f.title]));
const dir = mkdtempSync(join(tmpdir(), 'ville-pdf-'));
const src = join(dir, 'plans.html');
writeFileSync(src, `<!doctype html><html lang="fr"><meta charset="utf-8"><style>html,body{margin:0;background:#fff}${PLAN_CSS}</style><body>${plansHtml(fiches)}</body></html>`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
  const out = new URL('data/ville-plan.pdf', root);
  writeFileSync(out, await page.pdf({
    format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '9mm', bottom: '11mm', left: '10mm', right: '10mm' },
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:\'Liberation Sans\',Arial,sans-serif;font-size:7px;color:#000;padding:0 10mm;display:flex;justify-content:space-between"><span>DEC Épreuve 1 · Plan de la ville des institutions</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  }));
  console.log(`→ ${out.pathname}`);
} finally { await browser.close(); }
