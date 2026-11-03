// Plan imprimable de la ville des institutions, par profession : une carte (SVG, noir et blanc) où chaque
// bâtiment porte un numéro, puis les annotations numérotées qui replacent les fiches, les personnes et les
// chiffres dans les bâtiments. Fonctions pures (chaînes HTML) : utilisées par l'app (vue « Plan à imprimer »,
// impression du navigateur) et par scripts/build_ville_pdf.mjs (PDF A4 dans data/).

import { VILLE, batiment } from './ville.js';
import { SALLES } from './ville3d.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plain = (s) => String(s ?? '').replace(/\*\*/g, '');

export const PLAN_CSS = `
.vp { color: #000; background: #fff; font-family: "Liberation Sans", Arial, "DejaVu Sans", sans-serif; font-size: 10pt; line-height: 1.35; }
.vp h1 { font-size: 20pt; margin: 0 0 2mm; }
.vp .sub { font-size: 10pt; color: #333; margin: 0 0 4mm; }
.vp .map { height: 236mm; width: auto; max-width: 100%; display: block; margin: 0 auto; border: 1px solid #000; }
@media screen { .vp .map { height: auto; width: 100%; } }
.vp .legend { display: flex; gap: 6mm; flex-wrap: wrap; font-size: 9pt; margin: 2mm 0 0; }
.vp .legend span { display: inline-flex; align-items: center; gap: 1.5mm; }
.vp .legend i { display: inline-block; width: 5mm; height: 3.5mm; border: 1px solid #000; }
.vp .legend i.mine { background: #000; }
.vp .legend i.other { background: #fff; border-style: dashed; }
.vp .legend i.commun { background: repeating-linear-gradient(45deg, #000 0 .6mm, #fff .6mm 1.6mm); }
.vp .notes { break-before: page; page-break-before: always; columns: 2; column-gap: 7mm; }
.vp .notes h2 { column-span: all; font-size: 14pt; margin: 0 0 3mm; border-bottom: 1.5px solid #000; padding-bottom: 1mm; }
.vp .b { break-inside: avoid; page-break-inside: avoid; margin: 0 0 3.2mm; border-left: 1.6pt solid #000; padding-left: 2.5mm; }
.vp .b.commun { border-left: 1.6pt dashed #000; }
.vp .b h3 { font-size: 10.5pt; margin: 0; display: flex; gap: 2mm; align-items: baseline; }
.vp .num { display: inline-block; min-width: 5mm; height: 5mm; line-height: 5mm; text-align: center; border-radius: 50%; background: #000; color: #fff; font-size: 8pt; font-weight: 700; }
.vp .b .type { font-size: 8pt; text-transform: uppercase; letter-spacing: .05em; color: #333; }
.vp .b p { margin: .8mm 0; }
.vp .b .fiche { font-size: 8.8pt; border: 1px solid #000; padding: .6mm 1.5mm; display: inline-block; margin: .6mm 0; }
.vp .b ul { margin: .5mm 0 0; padding-left: 4mm; }
.vp .b li { margin: .3mm 0; }
.vp .b .who { font-size: 9pt; }
.vp .b .nums { font-size: 8.8pt; color: #222; }
.vp .b .piege { font-size: 8.8pt; }
.vp .b .piege::before { content: '⚠ '; }
@media print { .vp .notes { columns: 2; } }
`;

const W = 660, H = 960, M = 14;
const rect = (b) => ({ x: b.x / 100 * W - b.w / 2, y: b.y / 100 * H - b.d / 2, w: b.w, h: b.d });

// Les bâtiments de la profession, dans l'ordre de lecture (haut → bas, gauche → droite), numérotés ; les communs
// suivent ; ceux de l'autre rive ne sont pas annotés (tracés en pointillé sur la carte).
export function planBuildings(rive) {
  const mine = VILLE.batiments.filter((b) => b.rive === rive).sort((a, b) => a.y - b.y || a.x - b.x);
  const commun = VILLE.batiments.filter((b) => b.rive === 'commun').sort((a, b) => a.y - b.y || a.x - b.x);
  return [...mine, ...commun];
}

function mapSvg(rive, numbered) {
  const num = new Map(numbered.map((b, i) => [b.id, i + 1]));
  const other = rive === 'ec' ? 'cac' : 'ec';
  const zone = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  let s = `<svg class="map" viewBox="${-M} ${-M} ${W + 2 * M} ${H + 2 * M}" xmlns="http://www.w3.org/2000/svg" font-family="Liberation Sans, Arial, sans-serif">
  <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><rect width="2" height="6" fill="#000"/></pattern>
  <pattern id="river" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><path d="M0 4 Q2 2 4 4 T8 4" stroke="#000" stroke-width=".8" fill="none"/></pattern></defs>
  ${zone(0, 0, W, H, '#fff', 'stroke="#000" stroke-width="2"')}
  ${zone(0, 0, W, H * .11, '#f2f2f2')}${zone(0, H * .78, W, H * .22, '#f2f2f2')}
  ${zone(W * .45, H * .11, W * .10, H * .67, 'url(#river)')}
  ${[.11, .28, .5, .78].map((p) => zone(0, H * p - 5, W, 10, '#ddd')).join('')}
  <text x="8" y="22" font-size="15" font-weight="700" letter-spacing="2">QUARTIER INTERNATIONAL</text>
  <text x="8" y="${H * .78 + 24}" font-size="15" font-weight="700" letter-spacing="2">QUARTIER JUDICIAIRE ET AUTRES AUTORITÉS</text>
  <text x="8" y="${H * .11 + 24}" font-size="15" font-weight="700" letter-spacing="2">RIVE EC · L’ORDRE</text>
  <text x="${W - 8}" y="${H * .11 + 24}" font-size="15" font-weight="700" letter-spacing="2" text-anchor="end">RIVE CAC · H2A ET COMPAGNIE</text>
  <text x="${W / 2}" y="${H * .5 + 24}" font-size="13" text-anchor="middle" transform="rotate(-90 ${W / 2} ${H * .45})">FLEUVE</text>`;
  for (const b of VILLE.batiments) {
    const r = rect(b), n = num.get(b.id), faded = b.rive === other;
    const fill = b.style === 'vide' ? '#fff' : b.rive === 'commun' ? 'url(#hatch)' : faded ? '#fff' : '#000';
    const stroke = faded ? 'stroke-dasharray="5 4" stroke="#555"' : b.style === 'vide' ? 'stroke-dasharray="6 4" stroke="#000"' : 'stroke="#000"';
    s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" ${stroke} stroke-width="1.5"/>`;
    if (n) s += `<circle cx="${r.x + 11}" cy="${r.y + 11}" r="10" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="${r.x + 11}" y="${r.y + 15}" font-size="12" font-weight="700" text-anchor="middle">${n}</text>`;
    const lx = r.x + r.w / 2, ly = r.y + r.h + 14;
    s += `<text x="${lx}" y="${ly}" font-size="${faded ? 10 : 12}" font-weight="${faded ? 400 : 700}" fill="${faded ? '#555' : '#000'}" text-anchor="middle">${esc(plain(b.court))}</text>`;
  }
  return `${s}</svg>`;
}

function noteHtml(b, n, fiches) {
  const salle = SALLES[b.id];
  const who = salle ? salle.groupes.map((g) => `${g.n > 1 ? `${g.n} × ` : ''}${plain(g.label)}`).join(' · ') : '';
  const ficheTitle = fiches?.[b.fiche] || b.fiche;
  const twin = b.jumeau && batiment(b.jumeau);
  return `<div class="b ${b.rive}"><h3><span class="num">${n}</span><span>${esc(plain(b.nom))}</span></h3>
    <div class="type">${esc(plain(b.type))}${twin ? ` · jumeau : ${esc(plain(twin.court))}` : ''}</div>
    <p>${md(b.role)}</p>
    <div class="fiche">Fiche : ${esc(ficheTitle)}</div>
    ${who ? `<p class="who"><strong>Qui :</strong> ${esc(who)}</p>` : ''}
    ${b.chiffres?.length ? `<p class="nums">${b.chiffres.map((c) => esc(plain(c))).join(' · ')}</p>` : ''}
    <ul>${b.pancartes.slice(0, 3).map((p) => `<li><strong>${md(p.qui)}</strong> : ${md(p.fait.length > 190 ? `${p.fait.slice(0, 188)}…` : p.fait)}</li>`).join('')}</ul>
    ${b.pieges?.[0] ? `<p class="piege">${md(b.pieges[0])}</p>` : ''}</div>`;
}

// Page complète d'une profession : carte numérotée, légende, annotations. `fiches` : titre par fichier.
export function planHtml(rive, fiches = {}) {
  const numbered = planBuildings(rive);
  const titre = rive === 'ec' ? 'Expert-comptable' : 'Commissaire aux comptes';
  return `<div class="vp">
    <h1>La ville des institutions · ${esc(titre)}</h1>
    <p class="sub">Plan de la ville : les bâtiments de la profession en noir et numérotés, les bâtiments communs hachurés, ceux de l’autre profession en pointillé. Chaque numéro renvoie à une annotation qui replace la fiche, les personnes et les chiffres dans le bâtiment.</p>
    ${mapSvg(rive, numbered)}
    <div class="legend"><span><i class="mine"></i>${esc(titre)}</span><span><i class="commun"></i>Commun aux deux professions</span><span><i class="other"></i>Autre profession (non annoté)</span></div>
    <div class="notes"><h2>Annotations · ${esc(titre)}</h2>${numbered.map((b, i) => noteHtml(b, i + 1, fiches)).join('')}</div>
  </div>`;
}
