// PDF des fiches à imprimer, noir et blanc : couverture et légende, sommaire paginé, une page de garde par
// partie (schémas, fiches EC, fiches CAC), chaque fiche sur une page impaire (recto, ou moitié gauche d'une
// nouvelle feuille en 2 par feuille) pour y coller un onglet, numéros de page en pied.
// Usage : npm run pdf  →  data/fiches-a-imprimer.pdf (A4) et data/fiches-a-imprimer-2-par-feuille.pdf
// (pages A5, deux côte à côte sur A4 paysage, à 100 %). À relancer après toute modification d'une fiche.
// Besoin : Playwright (Chromium), pdftotext (poppler-utils), pypdf (imposition 2 par feuille).
//
// Mise en page itérative : des marqueurs invisibles (§…§, blanc, 1 pt) bornent chaque fiche et chaque bloc
// (tableau, comparatif, arbre, échelle, frise, étapes). Après chaque rendu, pdftotext -bbox donne leur page et
// leur hauteur ; un bloc qui déborde de quelques lignes sur la page suivante est réduit (zoom), un bloc court
// qui commencerait en bas de page passe à la page suivante, une fiche dont la dernière page n'aurait que
// quelques lignes est resserrée. On recommence jusqu'à stabilité, puis on ajoute les pages « Notes » qui
// placent chaque fiche sur une page impaire et on remplit le sommaire.
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
  { title: 'Les schémas', sub: 'Dans l’ordre du parcours de révision', intro: 'Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision. À lire dans cet ordre.', fiches: visuels, prof: '', label: (f, j, n) => `Schéma ${j + 1} / ${n}${f.n < 99 ? ` · étape ${f.n} du parcours` : ''}` },
  { title: 'Fiches de référence : expert-comptable', sub: 'Exercice, déontologie, qualité, responsabilité', intro: 'Le détail des règles de l’expert-comptable, à consulter au besoin après les schémas. Trait simple à gauche sur toute la fiche.', fiches: synth.filter((f) => /-ec-/.test(f.file)), prof: 'ec', label: (f, j, n) => `Fiche EC ${j + 1} / ${n} · expert-comptable` },
  { title: 'Fiches de référence : commissaire aux comptes', sub: 'Exercice, déontologie, contrôle, responsabilité', intro: 'Le détail des règles du commissaire aux comptes, à consulter au besoin après les schémas. Trait double à gauche sur toute la fiche.', fiches: synth.filter((f) => /-cac-/.test(f.file)), prof: 'cac', label: (f, j, n) => `Fiche CAC ${j + 1} / ${n} · commissaire aux comptes` },
].filter((p) => p.fiches.length);
let k = 0; for (const p of PARTS) for (const f of p.fiches) f.id = `F${String(++k).padStart(2, '0')}`;
const total = k;
// Sections qui commencent chacune sur une page impaire, dans l'ordre du document.
const SECTIONS = ['C', 'T', ...PARTS.flatMap((p, i) => [`P${i + 1}`, ...p.fiches.map((f) => f.id)])];

const mk = (id) => `<span class="mk">§${id}§</span>`;
function html(cls) {
  const toc = PARTS.map((p, i) => `<h3>Partie ${i + 1} · ${esc(p.title)} <span class="pg">p. <span data-pg="P${i + 1}"></span></span></h3><ol>${p.fiches.map((f) => `<li><span class="tick"></span><span class="t">${esc(f.title)}</span><span class="dots"></span><span class="p" data-pg="${f.id}"></span></li>`).join('')}</ol>`).join('');
  const parts = PARTS.map((p, i) => `<section class="part" data-sec="P${i + 1}">${mk(`P${i + 1}`)}<div class="num">${i + 1}</div><h2>${esc(p.title)}</h2><p><strong>${esc(p.sub)}</strong></p><p>${esc(p.intro)}</p><ol>${p.fiches.map((f) => `<li>${esc(f.title)} <span class="muted">· p. <span data-pg="${f.id}"></span></span></li>`).join('')}</ol></section>`
    + p.fiches.map((f, j) => `<article class="fiche print-fiche ${p.prof}" data-sec="${f.id}" data-kind="${p.prof || 'schema'}">${mk(f.id)}<div class="print-label"><span>${esc(p.label(f, j, p.fiches.length))}</span><span>Partie ${i + 1}</span></div><div class="fiche-body">${renderMarkdown(readFileSync(join(ROOT, 'data/fiches', f.file), 'utf8'))}</div>${mk(`E${f.id.slice(1)}`)}</article>`).join('')).join('');
  return `<!doctype html><html lang="fr" data-theme="light" class="${cls}"><head><meta charset="utf-8"><base href="${pathToFileURL(ROOT).href}/"><title>DEC Épreuve 1 · Fiches à imprimer</title>
<link rel="stylesheet" href="css/app.css"><link rel="stylesheet" href="scripts/print.css"></head><body>
<section class="cover" data-sec="C">${mk('C')}<div class="kicker">DEC · Épreuve 1</div><h1>Réglementation professionnelle et déontologie de l’expert-comptable et du commissaire aux comptes</h1><div class="rule"></div>
<p><strong>Fiches à imprimer : ${total} fiches en ${PARTS.length} parties.</strong></p><p>Chaque fiche commence sur une page impaire : imprimez seulement celles que vous voulez, collez un onglet sur la première page. Marge droite large pour annoter ; pages « Notes » pour compléter.</p>
<div class="legend"><h3>Expert-comptable ou commissaire aux comptes : lire sans couleur</h3><ul>
<li><span class="sw ec"></span><strong>Trait simple</strong> à gauche : expert-comptable. Sur toute une fiche de référence EC, sur les passages des schémas propres à l’EC, sur la colonne EC des comparatifs.</li>
<li><span class="sw cac"></span><strong>Trait double</strong> : commissaire aux comptes, aux mêmes endroits.</li>
<li><span class="fpill ec">EC</span> <span class="fpill cac">CAC</span> : la règle vise cette profession (encadré simple ou double). <span class="fpill trap">piège</span> : erreur fréquente à l’examen. <span class="fpill check">à vérifier</span> : point à confirmer.</li>
<li>Arbres : cadre <strong>épais</strong> = question ; <strong>✓</strong> = conclusion ; <strong>✗</strong> en pointillés = interdit ou piège. Échelles : plus la barre est longue, plus le niveau est élevé.</li></ul></div></section>
<section class="toc" data-sec="T">${mk('T')}<h2>Sommaire</h2><p class="hint">Cochez la case quand la fiche est apprise.</p>${toc}</section>
${parts}</body></html>`;
}

// Préparation dans la page (exécutée par Chromium avant chaque rendu) : classes des tableaux, passages EC / CAC
// des schémas, blocs numérotés et bornés, réglages de la passe (réductions, sauts, pages Notes, sommaire).
function prepare(state) {
  const EC = /\bEC\b|expert-comptable|experts-comptables|\bl[’']Ordre\b|de l[’']Ordre\b|\bCROEC\b|\bNPMQ\b|contrôle de qualité/i;
  const CAC = /\bCAC\b|commissaire|\bH2A\b|\bCNCC\b|\bCRCC\b|contrôle d[’']activité|\bEIP\b|\bNEP\b/i;
  const profOf = (t) => (EC.test(t) && !CAC.test(t) ? 'ec' : CAC.test(t) && !EC.test(t) ? 'cac' : '');
  // Tableaux : courts → jamais coupés ; larges → plus petits ; colonne propre à une profession → trait.
  document.querySelectorAll('.fiche-body table').forEach((t) => {
    const head = [...(t.tHead?.rows[0]?.cells || [])];
    if (t.rows.length <= 9) t.classList.add('short');
    if (head.length >= 5) t.classList.add('wide');
    head.forEach((th, c) => {
      const p = profOf(th.textContent); if (!p) return;
      for (const r of t.rows) r.cells[c]?.classList.add(`col-${p}`);
    });
  });
  // Schémas : un passage (titre et ce qui suit jusqu'au titre suivant de même niveau ou supérieur) qui ne
  // concerne qu'une profession porte son trait dans la marge.
  document.querySelectorAll('article[data-kind="schema"] .fiche-body').forEach((body) => {
    for (const tag of ['h3', 'h4']) {
      [...body.querySelectorAll(`:scope > ${tag}, :scope > .sec-wrap > ${tag}`)].forEach((h) => {
        if (h.closest('.sec-ec, .sec-cac')) return;
        const p = profOf(h.textContent); if (!p) return;
        const wrap = document.createElement('div'); wrap.className = `sec-wrap sec-${p}`;
        const stop = tag === 'h3' ? ['H2', 'H3'] : ['H2', 'H3', 'H4'];
        const nodes = [h]; let n = h.nextElementSibling;
        while (n && !stop.includes(n.tagName)) { nodes.push(n); n = n.nextElementSibling; }
        h.before(wrap); nodes.forEach((x) => wrap.appendChild(x));
      });
    }
  });
  // Élément de liste qui commence par la pastille {EC} ou {CAC} → il porte le trait.
  document.querySelectorAll('.fiche-body li').forEach((li) => {
    const first = li.firstElementChild;
    if (!first?.classList.contains('fpill') || !(first.classList.contains('ec') || first.classList.contains('cac'))) return;
    if (!li.textContent.trim().startsWith(first.textContent)) return;
    li.classList.add(first.classList.contains('ec') ? 'li-ec' : 'li-cac');
  });
  document.querySelectorAll('.fiche-body .node').forEach((nd) => {
    const first = nd.firstElementChild;
    if (first?.classList.contains('fpill') && nd.textContent.trim().startsWith(first.textContent)) {
      if (first.classList.contains('ec')) nd.classList.add('node-ec'); else if (first.classList.contains('cac')) nd.classList.add('node-cac');
    }
  });
  // Blocs bornés par des marqueurs.
  let b = 0;
  document.querySelectorAll('.fiche-body .table-wrap, .fiche-body .vs, .fiche-body .arbre, .fiche-body .echelle, .fiche-body .frise, .fiche-body .etapes').forEach((el) => {
    const id = `B${++b}`; const w = document.createElement('div'); w.className = 'blk';
    const s = state.blocks[id]; if (s?.fit) w.classList.add(`fit${s.fit}`); if (s?.avoid) w.classList.add('avoid');
    el.before(w);
    w.insertAdjacentHTML('beforeend', `<span class="mk">§S${b}§</span>`); w.appendChild(el); w.insertAdjacentHTML('beforeend', `<span class="mk">§Z${b}§</span>`);
  });
  document.querySelectorAll('article[data-sec]').forEach((a) => { const t = state.tight[a.dataset.sec]; if (t) a.classList.add(`tight${t}`); });
  for (const id of state.blanks) document.querySelector(`[data-sec="${id}"]`)?.insertAdjacentHTML('beforebegin', '<section class="notes-page"><h2>Notes</h2><div class="ruled"></div></section>');
  document.querySelectorAll('[data-pg]').forEach((s) => { s.textContent = state.pages[s.dataset.pg] ?? '00'; });
  return b;
}

// Positions des marqueurs : { id: { page, y } } (y en points depuis le haut de la page), première occurrence.
function markers(file) {
  const out = execFileSync('pdftotext', ['-bbox', '-enc', 'UTF-8', file, '-'], { encoding: 'utf8', maxBuffer: 256 << 20 });
  const at = {}; let page = 0;
  for (const m of out.matchAll(/<page |<word xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">[^<]*?§([A-Z]\d*)§[^<]*<\/word>/g)) {
    if (m[0] === '<page ') { page++; continue; }
    at[m[2]] ??= { page, y: Number(m[1]) };
  }
  return { at, pages: page };
}

const mm = (v) => (parseFloat(v) * 72) / 25.4;
const FORMATS = [
  { out: 'fiches-a-imprimer.pdf', cls: 'a4', format: 'A4', pageH: 841.89, margin: { top: '13mm', bottom: '15mm', left: '18mm', right: '26mm' }, pad: '18mm', font: 10 },
  { out: 'fiches-a-imprimer-2-par-feuille.pdf', cls: 'a5', format: 'A5', pageH: 595.28, margin: { top: '9mm', bottom: '11mm', left: '11mm', right: '15mm' }, pad: '11mm', font: 9, twoUp: true },
];
const MAX_FIT = 3; const MAX_TIGHT = 2; const MAX_PASSES = 14;

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = mkdtempSync(join(tmpdir(), 'fiches-pdf-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const F of FORMATS) {
    const top = mm(F.margin.top); const H = F.pageH - mm(F.margin.bottom) - top;
    const frac = (y) => (y - top) / H; // position verticale dans la zone utile, de 0 (haut) à 1 (bas)
    const render = async (state, file) => {
      const src = join(dir, 'fiches.html'); writeFileSync(src, html(F.cls));
      await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
      await page.evaluate(prepare, state);
      await page.evaluate(() => document.fonts.ready);
      writeFileSync(file, await page.pdf({
        format: F.format, printBackground: true, displayHeaderFooter: true, margin: F.margin,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font-family:'Liberation Sans',Arial,sans-serif;font-size:${F.font}px;color:#000;padding:0 ${F.pad};display:flex;justify-content:space-between"><span>DEC Épreuve 1 · Déontologie EC / CAC</span><span>page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      }));
      return markers(file);
    };
    const state = { blocks: {}, tight: {}, blanks: [], pages: {} };
    const work = join(dir, 'pass.pdf');
    const fiches = PARTS.flatMap((p) => p.fiches);
    let m; let passes = 0;
    // 1. Placement : une correction au plus par fiche et par passe (tout ce qui suit en dépend), jusqu'à stabilité.
    for (;;) {
      m = await render(state, work); passes++;
      const fixes = new Map();
      const ficheAt = (pos) => fiches.filter((f) => m.at[f.id] && (m.at[f.id].page < pos.page || (m.at[f.id].page === pos.page && m.at[f.id].y <= pos.y))).pop();
      const blocks = Object.keys(m.at).filter((x) => /^S\d+$/.test(x)).sort((a, b) => m.at[a].page - m.at[b].page || m.at[a].y - m.at[b].y);
      for (const id of blocks) {
        const n = id.slice(1); const s = m.at[id]; const e = m.at[`Z${n}`];
        const f = ficheAt(s);
        if (!e || !f || fixes.has(f.id) || e.page !== s.page + 1) continue; // sur une page, ou plus de deux : rien
        const key = `B${n}`; const bs = state.blocks[key] || {};
        const head = 1 - frac(s.y); const tail = frac(e.y);
        if (tail <= 0.3 && (bs.fit || 0) < MAX_FIT && !bs.avoid) fixes.set(f.id, () => { state.blocks[key] = { ...bs, fit: (bs.fit || 0) + 1 }; });
        else if (!bs.avoid && head + tail < 0.97 && head <= 0.45) fixes.set(f.id, () => { state.blocks[key] = { ...bs, avoid: true }; });
      }
      for (const f of fiches) {
        if (fixes.has(f.id)) continue;
        const s = m.at[f.id]; const e = m.at[`E${f.id.slice(1)}`]; const t = state.tight[f.id] || 0;
        if (s && e && e.page > s.page && frac(e.y) <= 0.2 && t < MAX_TIGHT) fixes.set(f.id, () => { state.tight[f.id] = t + 1; });
      }
      if (!fixes.size || passes >= MAX_PASSES) break;
      fixes.forEach((fn) => fn());
    }
    // 2. Pages « Notes » pour que chaque section commence sur une page impaire, puis numéros du sommaire.
    const starts = SECTIONS.map((id) => m.at[id]?.page);
    if (process.env.PDF_DEBUG) writeFileSync(process.env.PDF_DEBUG, readFileSync(work));
    if (starts.some((x) => !x)) throw new Error(`${F.out} : marqueurs de section introuvables : ${SECTIONS.filter((id) => !m.at[id]).join(", ")}`);
    let pos = 1;
    SECTIONS.forEach((id, i) => {
      const len = (i + 1 < SECTIONS.length ? starts[i + 1] : m.pages + 1) - starts[i];
      if (pos % 2 === 0) { state.blanks.push(id); pos++; }
      state.pages[id] = pos; pos += len;
    });
    const flat = join(dir, 'final.pdf');
    const fin = await render(state, flat);
    for (const id of SECTIONS) if (fin.at[id]?.page !== state.pages[id]) throw new Error(`${F.out} : ${id} attendu p. ${state.pages[id]}, trouvé p. ${fin.at[id]?.page}`);
    const OUT = join(ROOT, 'data', F.out);
    if (F.twoUp) execFileSync('python3', ['-I', join(ROOT, 'scripts', 'impose_2up.py'), flat, OUT], { stdio: 'inherit' });
    else writeFileSync(OUT, readFileSync(flat));
    const bl = Object.values(state.blocks);
    console.log(`${F.out} : ${fin.pages} pages${F.twoUp ? ` sur ${Math.ceil(fin.pages / 2)} feuilles` : ''}, ${passes} passes, ${bl.filter((x) => x.fit).length} blocs réduits, ${bl.filter((x) => x.avoid).length} déplacés, ${Object.keys(state.tight).length} fiches resserrées, ${state.blanks.length} pages Notes, ${(readFileSync(OUT).length / 1024).toFixed(0)} Ko`);
  }
  writeFileSync(join(ROOT, 'data', 'fiches-a-imprimer.pdf.sha256'), `${inputsHash(ROOT)}\n`);
} finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
