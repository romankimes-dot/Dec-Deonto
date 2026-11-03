// Plans imprimables de la ville des institutions : la maquette (js/maquette.js) vue de dessus, sur une page A4 par
// profession. Une version légère, pour visualiser : chaque institution est une tuile à sa place, avec son symbole,
// son nom (qui y siège et la fiche à relire sont dans l'info-bulle, à l'écran). Rangées 1 (en bas) à 4 : l'EC à gauche, le
// CAC à droite, le nom de la rangée dans l'allée centrale ; rangées 5 à 7 (en haut) : le quartier commun. Les tuiles
// de l'autre profession restent en gris clair, nommées seulement. Bordure verte (EC), bleue (CAC), double (commun),
// comme dans la maquette ; imprimée en noir et blanc, la page reste lisible (l'autre profession est en gris).
// Fonctions pures (chaînes HTML) : vue « Plans à imprimer » de l'app et scripts/build_ville_pdf.mjs (PDF A4, 2 pages).

import { SALLES, svgIcon, groupLabel } from './ville3d.js';
import { RANGS, MLOTS, NOMS } from './maquette.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PAGE = { w: 190, h: 248 }; // mm : zone du plan sur une feuille A4 (titre et légende en plus)
const TW = 28, TH = 18, SLOT = 30.5, ALLEE = 26, GAPY = 2.4, BAND_N = TH + 9, BOULEVARD = 9, HEAD = 9;
const BADGE = { ec: 'EC', cac: 'CAC', commun: 'commun' };

export const TITRES = { ec: 'Expert-comptable', cac: 'Commissaire aux comptes' };
const nom = (b) => NOMS[b.id] || b.court;

// Disposition en millimètres : bandes (rangées), tuiles.
export function planLayout(rive) {
  const other = rive === 'ec' ? 'cac' : 'ec', rooms = [], bands = [];
  const cx = PAGE.w / 2;
  let y = 0;
  bands.push({ kind: 'head', label: 'Commun aux deux professions', y, h: HEAD, rive: 'commun' }); y += HEAD;
  for (const r of [...RANGS].reverse()) {
    const south = r.n <= 4, lots = MLOTS.filter((l) => l.rang === r);
    const front = (l) => l.z >= Math.max(...lots.filter((k) => k.b.rive === l.b.rive).map((k) => k.z)) - 1; // devant (en bas) ou derrière (en haut)
    const deux = south && lots.some((l) => !front(l)), h = south ? (deux ? 2 * TH + 3 * GAPY : TH + 2 * GAPY) + 2 : BAND_N;
    bands.push({ kind: 'row', r, y, h, south });
    if (south) {
      for (const l of lots) {
        const s = l.b.rive === 'ec' ? -1 : 1, outer = Math.abs(l.x) > 10, back = !front(l);
        const x = s < 0 ? cx - ALLEE / 2 - (outer ? SLOT : 0) - TW : cx + ALLEE / 2 + (outer ? SLOT : 0);
        rooms.push({ lot: l, kind: l.b.rive === other ? 'ghost' : 'full', x, w: TW, y: y + 1 + (back ? GAPY : deux ? 2 * GAPY + TH : GAPY), h: TH });
      }
    } else {
      const n = lots.length, step = Math.min(SLOT + 2, (PAGE.w - 4) / n), w = Math.min(TW + 3, step - 2.5);
      lots.forEach((l, i) => rooms.push({ lot: l, kind: l.b.rive === other ? 'ghost' : 'full', x: cx + (i - (n - 1) / 2) * step - w / 2, w, y: y + 7, h: TH }));
    }
    y += h;
    if (r.n === 5) { bands.push({ kind: 'boulevard', y, h: BOULEVARD }); y += BOULEVARD; }
  }
  return { rive, rooms, bands, height: y };
}

const qui = (id) => (SALLES[id]?.groupes || []).filter((g) => !g.debout).map((g) => groupLabel(g)).join(' · ');

function roomHtml(r, fiches) {
  const { lot, kind, x, y, w, h } = r, b = lot.b;
  const box = `left:${x.toFixed(2)}mm;top:${y.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm`;
  if (b.style === 'vide') return `<div class="vp-room vide" style="${box}" title="${esc(b.role)}"></div>`;
  if (kind === 'ghost') return `<div class="vp-room ghost ${b.rive}" data-id="${lot.id}" style="${box}"><span class="ic">${svgIcon(lot.id)}</span><b>${esc(nom(b))}</b></div>`;
  const f = fiches[b.fiche] || '', tip = [qui(lot.id) && `Qui siège : ${qui(lot.id)}`, f && `Fiche : ${f}`].filter(Boolean).join(' — ');
  return `<div class="vp-room ${b.rive}" data-id="${lot.id}" style="${box}" title="${esc(tip)}"><span class="ic">${svgIcon(lot.id)}</span><b>${esc(nom(b))}</b></div>`;
}

function bandHtml(bd, rive) {
  if (bd.kind === 'head') return `<div class="vp-band head" style="top:${bd.y}mm;height:${bd.h}mm"><span class="vp-badge commun">commun</span> Le quartier commun aux deux professions</div>`;
  if (bd.kind === 'boulevard') return `<div class="vp-band boulevard" style="top:${bd.y}mm;height:${bd.h}mm"><span class="vp-badge ec">EC</span> ${esc(TITRES.ec)}<span class="sp"></span>${esc(TITRES.cac)} <span class="vp-badge cac">CAC</span></div>`;
  const { r } = bd;
  return `<div class="vp-band row ${bd.south ? 'south' : 'north'}" style="top:${bd.y}mm;height:${bd.h}mm"><span class="vp-rang"><b>${r.n}</b>${esc(r.nom)}</span></div>`;
}

export const PLAN_CSS = `
.vp-page { width: 190mm; color: #000; background: #fff; font-family: "Liberation Sans", Arial, "Helvetica Neue", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.vp-page + .vp-page { break-before: page; page-break-before: always; }
.vp-head { margin-bottom: 3mm; }
.vp-head h1 { font-size: 15pt; margin: 0; line-height: 1.15; }
.vp-head p { font-size: 8pt; margin: 1mm 0 0; color: #333; }
.vp-sheet { position: relative; width: 190mm; }
.vp-band { position: absolute; left: 0; width: 190mm; box-sizing: border-box; }
.vp-band.row { border-top: .25mm solid #bbb; }
.vp-band.row.south::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: .6mm; margin-left: -.3mm; background: #000; }
.vp-band.head { display: flex; align-items: center; gap: 2mm; font-size: 9pt; font-weight: 700; border-bottom: .5mm solid #000; }
.vp-band.boulevard { display: flex; align-items: center; gap: 2mm; font-size: 9pt; font-weight: 700; border-top: .6mm solid #000; border-bottom: .25mm solid #bbb; background: #f2f2f2; padding: 0 2mm; }
.vp-band.boulevard .sp { flex: 1; }
.vp-rang { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 23mm; display: flex; flex-direction: column; align-items: center; gap: .6mm; padding: 1.2mm 1mm; border-radius: 2mm; background: #000; color: #fff; font-size: 7.5pt; font-weight: 700; text-align: center; line-height: 1.15; z-index: 2; }
.vp-band.north .vp-rang { top: 1mm; transform: translate(-50%, 0); width: auto; flex-direction: row; gap: 1.5mm; padding: .6mm 2.5mm .6mm .8mm; border-radius: 3mm; white-space: nowrap; }
.vp-rang b { display: inline-flex; width: 4.4mm; height: 4.4mm; border-radius: 50%; background: #fff; color: #000; align-items: center; justify-content: center; font-size: 8pt; }
.vp-room { position: absolute; box-sizing: border-box; padding: .8mm 1.2mm; border-radius: 1.6mm; background: #fff; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: .5mm; cursor: pointer; z-index: 1; }
.vp-room.ec { border: .7mm solid #1E6B3A; } .vp-room.cac { border: .7mm solid #0072B2; } .vp-room.ec .ic { color: #1E6B3A; } .vp-room.cac .ic { color: #0072B2; } .vp-room.commun { border: 1.2mm double #000; padding: .9mm 1.2mm; }
.vp-room .ic svg { width: 5.2mm; height: 5.2mm; display: block; }
.vp-room b { font-size: 8.6pt; line-height: 1.12; }
.vp-room small { font-size: 5.6pt; line-height: 1.2; color: #333; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.vp-room i { font-size: 5.2pt; color: #555; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.vp-room.vide { border: .5mm dashed #999; background: none; cursor: auto; }
.vp-room.ghost { background: #f3f3f3; color: #777; justify-content: center; }
.vp-room.ghost.ec, .vp-room.ghost.cac { border-color: #aaa; } .vp-room.ghost .ic { color: #999; } .vp-room.ghost b { font-weight: 600; font-size: 6.8pt; }
.vp-room.ghost .ic svg { width: 3.6mm; height: 3.6mm; opacity: .6; }
.vp-badge { display: inline-block; font-size: 7pt; font-weight: 800; padding: .3mm 1.2mm; border-radius: .8mm; }
.vp-badge.ec { background: #1E6B3A; color: #fff; border: .4mm solid #1E6B3A; } .vp-badge.cac { background: #0072B2; color: #fff; border: .4mm solid #0072B2; } .vp-badge.commun { border: .9mm double #000; padding: 0 1mm; }
.vp-legend { margin-top: 3mm; font-size: 7.5pt; display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; align-items: center; }
@media screen { .vp-room:hover { outline: .6mm solid #2563eb; } }
`;

// Une page (A4 portrait) pour une profession. `fiches` : titre de chaque fiche, par nom de fichier.
export function planHtml(rive, fiches = {}) {
  const L = planLayout(rive), titre = TITRES[rive], other = rive === 'ec' ? 'cac' : 'ec';
  return `<section class="vp-page" data-rive="${rive}">
    <div class="vp-head"><h1>La ville des institutions · ${esc(titre)}</h1><p>La maquette vue de dessus. En bas, les rangées 1 à 4 : l’EC à gauche, le CAC à droite, le nom de la rangée au milieu. En haut, le quartier commun. En gris : le ${esc(TITRES[other].toLowerCase())}.</p></div>
    <div class="vp-sheet" style="height:${L.height.toFixed(2)}mm">${L.bands.map((bd) => bandHtml(bd, rive)).join('')}${L.rooms.map((r) => roomHtml(r, fiches)).join('')}</div>
    <div class="vp-legend"><span><span class="vp-badge ec">EC</span> bordure verte</span><span><span class="vp-badge cac">CAC</span> bordure bleue</span><span><span class="vp-badge commun">commun</span> bordure double</span><span>Dans l’app, toucher une tuile ouvre l’institution en 3D</span></div>
  </section>`;
}
// Les deux pages, EC puis CAC.
export const plansHtml = (fiches = {}) => planHtml('ec', fiches) + planHtml('cac', fiches);
