// Plans imprimables de la ville des institutions, un par profession, dessinés comme un plan d'appartement : les rues
// sont les couloirs, les bâtiments les pièces (murs pleins, porte ouvrant sur la rue, mobilier = les sièges du
// conseil), le fleuve sépare les deux rives. La disposition est celle de la visite 3D (js/ville3d.js) : même rue,
// même côté, même ordre. Dans chaque pièce : symbole de façade, fiche à relire, qui y siège, chiffres, ce qui s'y
// fait, piège. Les pièces de l'autre profession restent en pointillé, nommées seulement.
// Fonctions pures (chaînes HTML) : vue « Plans à imprimer » de l'app et scripts/build_ville_pdf.mjs (PDF A4, 2 pages).

import { SALLES, STREETS, LOTS, SYMBOLES, svgIcon } from './ville3d.js';
import { batiment } from './ville.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const plain = (s) => String(s ?? '').replace(/\*\*/g, '');
const RIVER_STREETS = new Set(['tutelle', 'nat', 'sup', 'reg']);
const PAGE = { w: 190, h: 248 }; // mm : zone du plan sur une feuille A4 (en-tête et légende en plus)
const STRIP = 6, GAP = 1.6, RIVER_W = 10, HC = 4.6, HG = 7.5, LINE = 2.2;

export const TITRES = { ec: 'Expert-comptable', cac: 'Commissaire aux comptes' };

// Disposition en millimètres : pièces, couloirs (rues), fleuve.
export function planLayout(rive) {
  const other = rive === 'ec' ? 'cac' : 'ec';
  const kind = (l) => (l.b.rive === other ? 'ghost' : 'full');
  const byX = (a, b) => a.x - b.x;
  const rows = STREETS.map((st) => {
    const ls = LOTS.filter((l) => l.st === st);
    const n = ls.filter((l) => l.side === 'n').sort(byX), s = ls.filter((l) => l.side === 's').sort(byX);
    const t = (arr) => (arr.some((l) => kind(l) === 'full') ? 'full' : arr.length ? 'ghost' : null);
    return { st, n, s, tn: t(n), ts: t(s), river: RIVER_STREETS.has(st.id) };
  });
  const fulls = rows.reduce((k, r) => k + (r.tn === 'full') + (r.ts === 'full'), 0);
  const ghosts = rows.reduce((k, r) => k + (r.tn === 'ghost') + (r.ts === 'ghost'), 0);
  const HR = Math.min(28, (PAGE.h - ghosts * HG - rows.length * HC) / fulls);
  const H = (t) => (t === 'full' ? HR : t === 'ghost' ? HG : 0);
  const W = PAGE.w - STRIP, mainW = Math.round((W - RIVER_W) * 0.66), otherW = W - RIVER_W - mainW;
  const cols = rive === 'ec'
    ? { main: [STRIP, STRIP + mainW], river: [STRIP + mainW, STRIP + mainW + RIVER_W], other: [STRIP + mainW + RIVER_W, PAGE.w] }
    : { other: [STRIP, STRIP + otherW], river: [STRIP + otherW, STRIP + otherW + RIVER_W], main: [STRIP + otherW + RIVER_W, PAGE.w] };
  const rooms = [], corridors = [];
  const pack = (arr, [a, b], side, edge, rowH) => {
    if (!arr.length) return;
    const wt = (l) => (kind(l) === 'full' ? 1 : 0.5), sum = arr.reduce((k, l) => k + wt(l), 0), free = b - a - GAP * (arr.length - 1);
    let x = a;
    for (const l of arr) {
      const w = free * wt(l) / sum, h = kind(l) === 'full' ? rowH : HG;
      rooms.push({ lot: l, kind: kind(l), side, x, w, h, y: side === 'n' ? edge - h : edge });
      x += w + GAP;
    }
  };
  const place = (r, arr, side, edge, rowH) => {
    if (r.river) { pack(arr.filter((l) => l.b.rive !== other), cols.main, side, edge, rowH); pack(arr.filter((l) => l.b.rive === other), cols.other, side, edge, rowH); }
    else pack(arr, [STRIP, PAGE.w], side, edge, rowH);
  };
  let y = 0;
  for (const r of rows) {
    r.y0 = y; const yc = y + H(r.tn);
    place(r, r.n, 'n', yc, H(r.tn));
    corridors.push({ st: r.st, y: yc, river: r.river });
    place(r, r.s, 's', yc + HC, H(r.ts));
    r.y1 = yc + HC + H(r.ts); y = r.y1;
  }
  const rv = rows.filter((r) => r.river);
  return { rive, rooms, corridors, rows, cols, height: y, river: { x0: cols.river[0], x1: cols.river[1], y0: rv[0].y0, y1: rv[rv.length - 1].y1 }, HR };
}

// Mobilier de la pièce : les sièges du conseil ou de la juridiction, vus de dessus.
function furniture(id) {
  const salle = SALLES[id]; if (!salle) return '';
  const seated = salle.groupes.filter((g) => !g.debout).reduce((k, g) => k + g.n, 0), standing = salle.groupes.filter((g) => g.debout).reduce((k, g) => k + g.n, 0);
  if (!seated) return '';
  const dot = (x, y) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r=".85" fill="#000"/>`;
  let s = '';
  if (salle.layout === 'table') {
    s += '<ellipse cx="14" cy="11" rx="8.5" ry="5" fill="none" stroke="#000" stroke-width=".5"/>';
    for (let i = 0; i < Math.min(seated, 26); i++) { const a = -Math.PI / 2 + (i / Math.min(seated, 26)) * Math.PI * 2; s += dot(14 + Math.cos(a) * 10.6, 11 + Math.sin(a) * 6.8); }
  } else if (salle.layout === 'rangs') {
    s += '<rect x="9" y="1" width="10" height="2.4" fill="none" stroke="#000" stroke-width=".5"/>' + dot(14, 2.2);
    for (let i = 0; i < Math.min(seated - 1, 60); i++) s += dot(2.2 + (i % 12) * 2.15, 6 + Math.floor(i / 12) * 3.3);
  } else {
    const n = Math.min(seated, 7), wd = Math.max(10, n * 3.4);
    s += `<rect x="${(14 - wd / 2).toFixed(2)}" y="7" width="${wd.toFixed(2)}" height="${salle.layout === 'tribunal' ? 3 : 4}" fill="none" stroke="#000" stroke-width=".5"/>`;
    for (let i = 0; i < n; i++) s += dot(14 + (i - (n - 1) / 2) * 3.4, 4.6);
  }
  for (let i = 0; i < Math.min(standing, 3); i++) s += `<circle cx="${26.5}" cy="${15 + i * 2.6}" r=".85" fill="none" stroke="#000" stroke-width=".4"/>`;
  return `<svg class="furn" viewBox="0 0 28 22" aria-hidden="true">${s}</svg>`;
}

function roomHtml(r, fiches) {
  const { lot, kind, x, y, w, h } = r, b = lot.b;
  const box = `left:${x.toFixed(2)}mm;top:${y.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm`;
  if (kind === 'ghost') return `<div class="vp-room ghost" data-id="${lot.id}" style="${box}"><div class="hd">${svgIcon(lot.id)}<span>${esc(plain(b.court))}</span></div></div>`;
  const furn = w >= 44 ? furniture(lot.id) : '';
  const salle = SALLES[lot.id];
  const qui = salle ? salle.groupes.map((g) => `${plain(g.label)}${g.n > 1 ? ` ×${g.n}` : ''}`).join(' · ') : '';
  const twin = b.jumeau && batiment(b.jumeau);
  // Budget de lignes : fiche, qui, piège, ce qui s'y fait, puis 2e ligne de « qui », chiffres, et le reste pour le contenu.
  let budget = Math.floor((h - 1.9 - 3.1) / LINE);
  const take = (n) => { const t = Math.max(0, Math.min(n, budget)); budget -= t; return t; };
  const L = { fi: take(1), qui: qui ? take(1) : 0, pg: b.pieges?.length ? take(1) : 0, pc: take(1) };
  if (qui && budget >= 3) L.qui += take(1);
  L.ch = b.chiffres?.length && budget >= 2 ? take(1) : 0;
  L.pc += take(budget);
  const clamp = (n) => `style="-webkit-line-clamp:${n}"`;
  const fiche = fiches[b.fiche] || b.fiche;
  const sym = w >= 50 ? ` · ${esc(SYMBOLES[lot.id][1])}` : '';
  const pc = b.pancartes.map((p) => `<b>${esc(plain(p.qui))}</b> : ${md(p.fait)}`).join(' ▪ ');
  return `<div class="vp-room ${furn ? 'has-furn' : ''} ${r.side}" data-id="${lot.id}" style="${box}">
    <div class="hd">${svgIcon(lot.id)}<span>${esc(plain(b.nom))}</span>${twin && w >= 40 ? `<small>en face : ${esc(plain(twin.court))}</small>` : ''}</div>
    ${furn}
    <div class="txt">
      ${L.fi ? `<div class="fi cl" ${clamp(1)}>Fiche : ${esc(fiche)}${sym}</div>` : ''}
      ${L.qui ? `<div class="qui cl" ${clamp(L.qui)}><b>Qui :</b> ${esc(qui)}</div>` : ''}
      ${L.ch ? `<div class="ch cl" ${clamp(1)}>${b.chiffres.map((c) => esc(plain(c))).join(' · ')}</div>` : ''}
      ${L.pc ? `<div class="pc cl" ${clamp(L.pc)}>${pc}</div>` : ''}
      ${L.pg ? `<div class="pg cl" ${clamp(1)}>${md(b.pieges[0])}</div>` : ''}
    </div></div>`;
}

function underSvg(L) {
  const { river: R, corridors, rows } = L, Hh = L.height.toFixed(2);
  let s = `<svg class="vp-under" viewBox="0 0 ${PAGE.w} ${Hh}" style="width:${PAGE.w}mm;height:${Hh}mm" aria-hidden="true">
    <defs><pattern id="vp-wave-${L.rive}" width="4" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5 Q1 .5 2 1.5 T4 1.5" fill="none" stroke="#000" stroke-width=".22"/></pattern></defs>
    <rect x="${R.x0}" y="${R.y0.toFixed(2)}" width="${R.x1 - R.x0}" height="${(R.y1 - R.y0).toFixed(2)}" fill="url(#vp-wave-${L.rive})"/>
    <text x="${(R.x0 + R.x1) / 2}" y="${((R.y0 + R.y1) / 2).toFixed(2)}" font-size="2.6" font-weight="700" letter-spacing=".9" text-anchor="middle" transform="rotate(-90 ${(R.x0 + R.x1) / 2} ${((R.y0 + R.y1) / 2).toFixed(2)})" fill="#000" style="paint-order:stroke" stroke="#fff" stroke-width="1.4">FLEUVE</text>`;
  for (const c of corridors) {
    const y = c.y, m = y + HC / 2;
    s += `<rect x="${STRIP}" y="${y.toFixed(2)}" width="${PAGE.w - STRIP}" height="${HC}" fill="#ececec"/>`;
    s += `<line x1="${STRIP}" y1="${m.toFixed(2)}" x2="${PAGE.w}" y2="${m.toFixed(2)}" stroke="#888" stroke-width=".2" stroke-dasharray="1.6 1.2"/>`;
    if (c.river) s += `<line x1="${R.x0}" y1="${y.toFixed(2)}" x2="${R.x1}" y2="${y.toFixed(2)}" stroke="#000" stroke-width=".45"/><line x1="${R.x0}" y1="${(y + HC).toFixed(2)}" x2="${R.x1}" y2="${(y + HC).toFixed(2)}" stroke="#000" stroke-width=".45"/>`;
    const name = plain(c.st.nom).toUpperCase(), cx = c.river ? (R.x0 + R.x1) / 2 : (STRIP + PAGE.w) / 2, tw = name.length * 1.32 + 3;
    s += `<rect x="${(cx - tw / 2).toFixed(2)}" y="${(m - 1.45).toFixed(2)}" width="${tw.toFixed(2)}" height="2.9" rx="1.4" fill="#000"/><text x="${cx.toFixed(2)}" y="${(m + 0.72).toFixed(2)}" font-size="2" font-weight="700" letter-spacing=".25" text-anchor="middle" fill="#fff">${esc(name)}</text>`;
  }
  // Bandeau des quartiers, à gauche.
  const band = (y0, y1, t) => { const cy = ((y0 + y1) / 2).toFixed(2); return `<line x1="${STRIP - 1.4}" y1="${(y0 + 0.6).toFixed(2)}" x2="${STRIP - 1.4}" y2="${(y1 - 0.6).toFixed(2)}" stroke="#000" stroke-width=".3"/><text x="2.2" y="${cy}" font-size="2.3" font-weight="700" letter-spacing=".5" text-anchor="middle" transform="rotate(-90 2.2 ${cy})">${t}</text>`; };
  const rv = rows.filter((r) => r.river);
  s += band(rows[0].y0, rows[0].y1, 'INTERNATIONAL') + band(rv[0].y0, rv[rv.length - 1].y1, L.rive === 'ec' ? 'RIVE EC  ·  RIVE CAC' : 'RIVE EC  ·  RIVE CAC') + band(rows[rows.length - 2].y0, rows[rows.length - 1].y1, 'JUSTICE');
  return `${s}</svg>`;
}

// Portes : sur le mur côté rue, battant ouvert vers la rue (comme sur un plan d'appartement).
function overSvg(L) {
  const Hh = L.height.toFixed(2);
  let s = `<svg class="vp-over" viewBox="0 0 ${PAGE.w} ${Hh}" style="width:${PAGE.w}mm;height:${Hh}mm" aria-hidden="true">`;
  for (const r of L.rooms) {
    const dw = r.kind === 'full' ? 3.2 : 2.4, x1 = r.x + Math.min(r.w * 0.5, 4.5), x2 = x1 + dw, sw = r.kind === 'full' ? 0.9 : 0.6, st = r.kind === 'full' ? 0.32 : 0.22;
    if (r.side === 'n') {
      const yb = r.y + r.h;
      s += `<line x1="${x1.toFixed(2)}" y1="${yb.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${yb.toFixed(2)}" stroke="#fff" stroke-width="${sw}"/>`;
      s += `<line x1="${x1.toFixed(2)}" y1="${yb.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${(yb + dw).toFixed(2)}" stroke="#000" stroke-width="${st}"/><path d="M${x1.toFixed(2)} ${(yb + dw).toFixed(2)} A${dw} ${dw} 0 0 0 ${x2.toFixed(2)} ${yb.toFixed(2)}" fill="none" stroke="#000" stroke-width="${st * 0.7}" stroke-dasharray=".6 .4"/>`;
    } else {
      const yt = r.y;
      s += `<line x1="${x1.toFixed(2)}" y1="${yt.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${yt.toFixed(2)}" stroke="#fff" stroke-width="${sw}"/>`;
      s += `<line x1="${x1.toFixed(2)}" y1="${yt.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${(yt - dw).toFixed(2)}" stroke="#000" stroke-width="${st}"/><path d="M${x1.toFixed(2)} ${(yt - dw).toFixed(2)} A${dw} ${dw} 0 0 1 ${x2.toFixed(2)} ${yt.toFixed(2)}" fill="none" stroke="#000" stroke-width="${st * 0.7}" stroke-dasharray=".6 .4"/>`;
    }
  }
  return `${s}</svg>`;
}

export const PLAN_CSS = `
.vp-page { width: 190mm; color: #000; background: #fff; font-family: "Liberation Sans", Arial, "Helvetica Neue", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.vp-page + .vp-page { break-before: page; page-break-before: always; }
.vp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; margin-bottom: 2.4mm; }
.vp-head h1 { font-size: 13pt; margin: 0; line-height: 1.1; }
.vp-head p { font-size: 6.5pt; margin: .8mm 0 0; color: #222; max-width: 158mm; line-height: 1.3; }
.vp-head svg { width: 11mm; height: 11mm; flex-shrink: 0; }
.vp-sheet { position: relative; width: 190mm; }
.vp-sheet > svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.vp-sheet > svg.vp-over { z-index: 2; }
.vp-room { position: absolute; box-sizing: border-box; border: .55mm solid #000; background: #fff; padding: .8mm 1.1mm; overflow: hidden; font-size: 5.3pt; line-height: 1.24; cursor: pointer; z-index: 1; }
.vp-room.ghost { border: .25mm dashed #555; color: #444; background: repeating-linear-gradient(45deg, #fff 0 1.2mm, #eee 1.2mm 1.5mm); padding: .6mm .8mm; }
.vp-room .hd { display: flex; gap: .9mm; align-items: center; font-weight: 700; font-size: 6.5pt; line-height: 1.15; white-space: nowrap; overflow: hidden; height: 3.1mm; }
.vp-room.ghost .hd { font-size: 5.4pt; font-weight: 600; white-space: normal; height: auto; }
.vp-room .hd span { overflow: hidden; text-overflow: ellipsis; }
.vp-room .hd svg { width: 3.3mm; height: 3.3mm; flex-shrink: 0; }
.vp-room .hd small { font-weight: 400; font-size: 5pt; margin-left: auto; padding-left: 1mm; }
.vp-room .txt { margin-top: .2mm; }
.vp-room.has-furn .txt { padding-right: 16mm; }
.vp-room .cl { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.vp-room .fi { font-style: italic; }
.vp-room .ch { font-variant-numeric: tabular-nums; }
.vp-room .pg::before { content: '⚠ '; }
.vp-room .furn { position: absolute; right: .9mm; width: 15mm; height: 11.8mm; }
.vp-room.n .furn { top: 4mm; } .vp-room.s .furn { bottom: 1mm; }
.vp-legend { margin-top: 2.4mm; font-size: 6pt; display: flex; flex-wrap: wrap; gap: 1mm 5mm; align-items: center; }
.vp-legend i { display: inline-block; width: 5mm; height: 3mm; vertical-align: -.6mm; margin-right: 1mm; box-sizing: border-box; }
.vp-legend i.full { border: .5mm solid #000; } .vp-legend i.ghost { border: .25mm dashed #555; }
@media screen { .vp-room:hover { outline: .6mm solid #2563eb; } }
`;

const compass = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="none" stroke="#000" stroke-width=".8"/><path d="M12 5.5l2.6 7.5H9.4z" fill="#000"/><path d="M12 20.5l-2.6-7.5h5.2z" fill="none" stroke="#000" stroke-width=".6"/><text x="12" y="3.6" font-size="4.2" font-weight="700" text-anchor="middle" font-family="Arial">N</text></svg>';

// Une page (A4 portrait) pour une profession. `fiches` : titre de chaque fiche, par nom de fichier.
export function planHtml(rive, fiches = {}) {
  const L = planLayout(rive), titre = TITRES[rive], other = rive === 'ec' ? 'commissaire aux comptes' : 'expert-comptable';
  return `<section class="vp-page" data-rive="${rive}">
    <div class="vp-head"><div><h1>Plan de la ville · ${esc(titre)}</h1><p>Chaque rue est un niveau, du monde (au nord) à la justice (au sud). Rive EC à gauche du fleuve, rive CAC à droite : les jumeaux se font face de part et d’autre du pont. Murs pleins : les lieux du ${esc(titre.toLowerCase())} et les lieux communs ; tirets : ceux du ${esc(other)}. Les symboles sont ceux des façades de la visite 3D.</p></div>${compass}</div>
    <div class="vp-sheet" style="height:${L.height.toFixed(2)}mm">${underSvg(L)}${L.rooms.map((r) => roomHtml(r, fiches)).join('')}${overSvg(L)}</div>
    <div class="vp-legend"><span><i class="full"></i>${esc(titre)} et lieux communs</span><span><i class="ghost"></i>Autre profession</span><span>● siège · ○ debout · ellipse : table du conseil · barre : banc des juges</span><span>⚠ piège qui revient</span></div>
  </section>`;
}
// Les deux pages, EC puis CAC.
export const plansHtml = (fiches = {}) => planHtml('ec', fiches) + planHtml('cac', fiches);
