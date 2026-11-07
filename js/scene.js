// Scène de carrière en SVG, dans la direction artistique des shorts : papier, aplats, trait encre, le même
// personnage que le fil (scenes.js). Le décor évolue avec le grade et les badges y posent leurs objets
// (calques `.prop[data-badge]`, cliquables). Fonctions pures qui renvoient du texte SVG.
import { person as cast, icon as shortIcon, CAST } from './scenes.js';

const INK = '#1c1b1a';
const P = {
  paper: '#f3eee6', ground: '#e6dfd3', ink: INK, muted: '#6f675d', sun: '#ffc93c', white: '#ffffff',
  ec: CAST.ec.color, ecSoft: CAST.ec.soft, cac: CAST.cac.color, cacSoft: CAST.cac.soft, blue: CAST.boss.color, blueSoft: CAST.boss.soft,
  wood: '#d9b58a', woodDark: '#b98a5a', red: '#c2410c', gold: '#ffc93c', goldDark: '#d99a00', green: '#1e7a5f', leaf: '#2f9e6e', night: '#2b3a67',
};
const DECOR = {
  openspace: { wall: P.paper, floor: P.ground, label: 'Open space' },
  partage: { wall: '#f6f0e4', floor: '#e3d9c8', label: 'Bureau partagé' },
  perso: { wall: '#f4ede0', floor: '#d9c4a6', label: 'Bureau personnel' },
  cabinet: { wall: '#efe6d6', floor: '#c9a27a', label: 'Cabinet' },
};

const S = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
const r = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const box = (x, y, w, h, fill, rx = 3, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${S} ${extra}/>`;
const t = (x, y, s, txt, fill = INK, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="'Bricolage Grotesque', -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="800" ${extra}>${txt}</text>`;
const tc = (x, y, s, txt, fill = INK, extra = '') => t(x, y, s, txt, fill, `text-anchor="middle" ${extra}`);
const g = (badge, body, title) => `<g class="prop" data-badge="${badge || ''}">${title ? `<title>${title}</title>` : ''}${body}</g>`;
// Icône des shorts (64 × 64) posée à (x, y) avec une taille donnée.
const ico = (name, x, y, size) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64">${shortIcon(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`;

// ---------- Cadres muraux (32 × 22, posés dans une grille) ----------
// Un cadre = carte blanche à trait encre et ombre portée, comme les pancartes des shorts.
const frame = (x, y, lines, accent = INK, bg = P.white) => box(x, y, 32, 22, bg, 3) + r(x + 1, y + 22, 30, 2, INK, 'rx="1" opacity=".9"') +
  lines.map((l, i) => tc(x + 16, y + (lines.length === 1 ? 14.5 : 9.5 + i * 8), lines.length === 1 ? 7 : 5.5, l, accent)).join('');
const FRAMES = {
  dscg: (x, y) => frame(x, y, ['DSCG'], P.blue),
  cadreEntretien: (x, y) => frame(x, y, ['Entretien', '2e année']),
  attestation: (x, y) => frame(x, y, ['Fin de', 'stage'], P.ec),
  diplomeDec: (x, y) => frame(x, y, ['DEC'], P.blue, P.sun),
  certifInscription: (x, y) => frame(x, y, ['Tableau', 'de l’Ordre'], P.blue),
  diplomeExercice: (x, y) => frame(x, y, ['Exercice', 'EC'], P.ec),
  diplomeCac: (x, y) => frame(x, y, ['Exercice', 'CAC'], P.cac),
  grandDiplome: (x, y) => frame(x, y, ['Expert-', 'comptable'], P.ec, P.ecSoft),
  carteCacCadre: (x, y) => frame(x, y, ['CAC'], P.white, P.cac),
  cadre20: (x, y) => frame(x, y, ['20/20'], P.red, P.sun),
  checklist: (x, y) => box(x, y, 32, 22, P.white, 3) + r(x + 1, y + 22, 30, 2, INK, 'rx="1"') +
    [0, 1, 2].map((i) => `<path d="M${x + 6} ${y + 6 + i * 5.5} l2 2 l3.5 -3.5" fill="none" stroke="${P.green}" stroke-width="1.6" stroke-linecap="round"/>` + r(x + 14, y + 5.5 + i * 5.5, 12, 1.8, P.muted, 'rx="1"')).join(''),
};

// ---------- Objets d'étagère (posés, base en (x, y), largeur ≤ 22) ----------
const book = (x, y, w, h, fill, label = '') => box(x, y - h, w, h, fill, 1.5) + r(x + 1.5, y - h + 3, w - 3, 2, P.sun, 'rx="1"') + (label ? tc(x + w / 2, y - h / 2 + 2, 4.5, label, P.white) : '');
const SHELF = {
  codeRouge: (x, y) => book(x + 2, y, 9, 22, P.red) + r(x + 3.5, y - 10, 6, 1.5, P.white, 'opacity=".8"'),
  codePoche: (x, y) => `<g transform="rotate(-10 ${x + 8} ${y})">${book(x + 2, y, 11, 16, P.cac)}</g>`,
  binderOec: (x, y) => box(x + 2, y - 22, 11, 22, P.blue, 1.5) + r(x + 4, y - 19, 7, 8, P.white, 'rx="1"') + tc(x + 7.5, y - 13, 4.5, 'OEC', P.blue) + `<circle cx="${x + 7.5}" cy="${y - 6}" r="1.6" fill="${P.white}"/>`,
  trophee: (x, y) => `<path d="M${x + 4} ${y - 21} h14 v6 a7 7 0 0 1 -14 0z" fill="${P.gold}" ${S}/><path d="M${x + 4} ${y - 18} q-4 0 -3 4 q1 3 4 3 M${x + 18} ${y - 18} q4 0 3 4 q-1 3 -4 3" fill="none" ${S}/>` + box(x + 9, y - 9, 4, 5, P.goldDark, 1) + box(x + 5, y - 4, 12, 4, P.woodDark, 1),
  trophee16: (x, y) => `<circle cx="${x + 11}" cy="${y - 11}" r="9" fill="${P.sun}" ${S}/>` + tc(x + 11, y - 8, 8, '16', INK) + `<path d="M${x + 7} ${y - 3} l-2 3 M${x + 15} ${y - 3} l2 3" ${S}/>`,
  balance: (x, y) => ico('scales', x, y - 22, 22),
  bouclier: (x, y) => `<path d="M${x + 3} ${y - 21} h16 v8 q0 9 -8 12 q-8 -3 -8 -12z" fill="${P.cac}" ${S}/><path d="M${x + 7.5} ${y - 12} l2.5 3 l5 -6" fill="none" stroke="${P.white}" stroke-width="2" stroke-linecap="round"/>`,
  cadenas: (x, y) => ico('padlock', x, y - 22, 22),
  calendrier: (x, y) => ico('calendar', x, y - 22, 22),
  horloge: (x, y) => `<circle cx="${x + 11}" cy="${y - 11}" r="9.5" fill="${P.white}" ${S}/><path d="M${x + 11} ${y - 11} v-6 M${x + 11} ${y - 11} h4.5" ${S}/><circle cx="${x + 11}" cy="${y - 11}" r="1.2" fill="${INK}"/>`,
  dossiersEtagere: (x, y) => [P.ecSoft, P.cacSoft, P.blueSoft, P.sun].map((c, i) => box(x + 1 + i * 5, y - 18, 4.5, 18, c, 1)).join(''),
  intercalaires: (x, y) => [P.ec, P.ec, P.cac, P.cac].map((c, i) => box(x + 1 + i * 5, y - 19, 4.5, 19, c, 1) + r(x + 1.5 + i * 5, y - 22 + (i % 2) * 2, 3.5, 3, P.sun, 'rx=".8"')).join(''),
  shelf75: (x, y) => [P.blue, P.ec, P.cac].map((c, i) => box(x + 1 + i * 7, y - 20, 6, 20, c, 1)).join(''),
  shelfFull: (x, y) => [P.blue, P.ec, P.cac, P.sun].map((c, i) => box(x + 1 + i * 5, y - 20, 4.5, 20, c, 1)).join('') + r(x, y - 22.5, 22, 2, P.goldDark, 'rx="1"'),
};
// Accessoires dont l'effet n'est pas un objet posé (gérés autrement dans la scène)
export const SPECIAL_PROPS = new Set(['folder1', 'folders2', 'folders4', 'liege', 'liegeFull', 'postit', 'murIllumine']);

// ---------- Objets de bureau (base en (x, y) sur le plateau) ----------
const DESK = {
  tasse: (x, y) => box(x, y - 9, 9, 9, P.white, 2) + `<path d="M${x + 9} ${y - 7} q4 1.5 0 5" fill="none" ${S}/><path d="M${x + 3} ${y - 12} q1.5 -2 0 -4 M${x + 6} ${y - 12} q1.5 -2 0 -4" fill="none" stroke="${P.muted}" stroke-width="1" stroke-linecap="round"/>`,
  tampon: (x, y) => box(x + 3, y - 12, 5, 8, P.woodDark, 1.5) + box(x, y - 5, 11, 5, P.red, 1.5),
  loupe: (x, y) => ico('magnifier', x - 2, y - 16, 16),
  stylo: (x, y) => `<path d="M${x} ${y - 1} l14 -4" stroke="${P.green}" stroke-width="3" stroke-linecap="round"/><path d="M${x} ${y - 1} l14 -4" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".5"/>`,
  lunettes: (x, y) => `<circle cx="${x + 3.5}" cy="${y - 3.5}" r="3.2" fill="${P.white}" ${S}/><circle cx="${x + 11.5}" cy="${y - 3.5}" r="3.2" fill="${P.white}" ${S}/><path d="M${x + 6.7} ${y - 3.5} h1.6" ${S}/>`,
  bannetteVide: (x, y) => `<path d="M${x} ${y - 7} h16 l-2.5 7 h-11z" fill="${P.blueSoft}" ${S}/>` + tc(x + 8, y - 9, 4, 'en suspens', P.muted),
  bannetteRevu: (x, y) => box(x + 2, y - 11, 12, 5, P.white, 1) + `<path d="M${x} ${y - 7} h16 l-2.5 7 h-11z" fill="${P.ecSoft}" ${S}/>` + tc(x + 8, y - 13, 4, 'revu', P.green),
  lampe: (x, y) => `<path d="M${x + 5} ${y} v-18 q0 -4 4 -4 h4" fill="none" ${S}/><path d="M${x + 9} ${y - 26} h12 l3 7 h-15z" fill="${P.ec}" ${S}/>` + box(x + 1, y - 2, 9, 2.5, INK, 1),
};
// ---------- Objets au sol (base en (x, y)) ----------
const FLOOR = {
  coffre: (x, y) => box(x, y - 24, 26, 24, '#4b5563', 3) + `<circle cx="${x + 13}" cy="${y - 12}" r="5" fill="none" stroke="${P.sun}" stroke-width="2"/><circle cx="${x + 13}" cy="${y - 12}" r="1.5" fill="${P.sun}"/>`,
  coffreOuvert: (x, y) => box(x, y - 24, 26, 24, '#4b5563', 3) + r(x + 3, y - 21, 20, 18, INK, 'rx="2"') + r(x + 5, y - 13, 16, 3.5, P.sun, 'rx="1"') + r(x + 5, y - 8, 16, 3.5, P.sun, 'rx="1"'),
  parapluie: (x, y) => `<path d="M${x} ${y - 28} a11 9 0 0 1 22 0z" fill="${P.blue}" ${S}/><path d="M${x + 11} ${y - 28} v25 q0 3.5 -3.5 3.5" fill="none" ${S}/>`,
  machineCafe: (x, y) => box(x, y - 32, 22, 32, '#374151', 3) + r(x + 4, y - 28, 14, 7, INK, 'rx="1.5"') + `<circle cx="${x + 16}" cy="${y - 18}" r="1.6" fill="${P.red}"/>` + box(x + 7, y - 13, 8, 8, P.white, 2),
  mallette: (x, y) => box(x, y - 16, 26, 16, '#5b3a22', 3) + `<path d="M${x + 9} ${y - 16} v-3 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 v3" fill="none" ${S}/>` + r(x + 11, y - 10, 4, 3, P.sun, 'rx=".8"'),
};

// Plante : grandit avec le record de série (3, 10, 20, 30, 50).
function plant(best, x, y) {
  if (best < 3) return '';
  const h = best >= 50 ? 74 : best >= 30 ? 56 : best >= 20 ? 46 : best >= 10 ? 34 : 20;
  const n = best >= 50 ? 7 : best >= 20 ? 5 : best >= 10 ? 4 : 2;
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const ly = y - 16 - (h * (i + 1)) / (n + 1); const side = i % 2 ? 1 : -1;
    leaves.push(`<ellipse cx="${x + side * 9}" cy="${ly}" rx="10" ry="4.5" fill="${i % 2 ? P.leaf : P.green}" ${S} transform="rotate(${side * -22} ${x + side * 9} ${ly})"/>`);
  }
  const flowers = best >= 30 ? [-7, 6, 0].map((dx, i) => `<circle cx="${x + dx}" cy="${y - 16 - h + i * 7}" r="3.2" fill="${P.cac}" ${S}/>`).join('') : '';
  const pot = `<path d="M${x - 10} ${y - 16} h20 l-2.5 16 h-15z" fill="${P.cac}" ${S}/>` + r(x - 11, y - 18, 22, 4, P.cacSoft, `rx="1.5" ${S}`);
  return g('ser-3', `<path d="M${x} ${y - 16} v-${h}" fill="none" stroke="${P.green}" stroke-width="2.5" stroke-linecap="round"/>${leaves.join('')}${flowers}${pot}`, `Plante : record de série ${best}`);
}

// Le personnage du fil, derrière le bureau (buste 164 × 240 redimensionné).
function person(x, y, h) {
  const w = (h * 164) / 240;
  return cast('ec').replace(/^<svg class="pers" viewBox="0 0 164 240" aria-hidden="true">/, `<svg class="person" x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" viewBox="0 0 164 240" aria-hidden="true">`);
}

function decorLayer(grade, decor, night) {
  const D = DECOR[decor];
  const out = [r(0, 0, 360, 240, D.wall), `<circle cx="228" cy="118" r="74" fill="${P.ecSoft}"/>`, r(0, 176, 360, 64, D.floor), `<path d="M0 176 h360" stroke="${INK}" stroke-width="1.2" opacity=".18"/>`];
  if (decor === 'openspace') {
    // Rampe de néons et un collègue de dos, au fond
    out.push(`<path d="M150 6 h120" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`, ...[160, 206, 252].map((x) => box(x, 7, 14, 4, P.sun, 1.5)));
    out.push(box(138, 30, 22, 18, P.white, 2), r(147, 48, 4, 10, INK), box(130, 58, 40, 5, P.wood, 1.5));
  }
  if (decor === 'partage') {
    out.push(box(150, 14, 110, 58, P.white, 3), r(152, 72, 106, 3, INK, 'rx="1"'));
    out.push(`<path d="M164 56 l16 -16 l14 10 l18 -20 l12 6" fill="none" stroke="${P.blue}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`, `<path d="M164 64 h34 M206 62 h40" stroke="${P.cac}" stroke-width="1.6" stroke-linecap="round"/>`);
    if (grade >= 4) out.push(box(226, 20, 28, 12, P.sun, 2), tc(240, 29, 6, 'Mémoire'));
  }
  if (decor === 'perso' || decor === 'cabinet') {
    out.push(box(150, 12, 110, 66, night ? P.night : P.blueSoft, 4), `<path d="M205 12 v66 M150 45 h110" stroke="${INK}" stroke-width="1.8"/>`);
    if (night) out.push(`<circle cx="236" cy="30" r="7" fill="${P.sun}"/>`, `<circle cx="172" cy="24" r="1.2" fill="${P.white}"/>`, `<circle cx="186" cy="34" r="1" fill="${P.white}"/>`);
    else out.push(`<circle cx="234" cy="30" r="9" fill="${P.sun}" ${S}/>`, `<path d="M156 70 q12 -14 24 -2 q10 -18 22 -2" fill="none" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>`);
    out.push(r(146, 78, 118, 4, P.white, `rx="1.5" ${S}`));
  }
  return out.join('');
}

// Emplacements fixes, remplis dans l'ordre
const FRAME_SLOTS = []; for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) FRAME_SLOTS.push([10 + col * 37, 10 + row * 28]);
const SHELF_SLOTS = []; for (const y of [64, 106, 148]) for (let i = 0; i < 3; i++) SHELF_SLOTS.push([282 + i * 23, y]);
const DESK_SLOTS = [[288, 160], [308, 160], [132, 160], [154, 160], [176, 160], [268, 160]];
const FLOOR_SLOTS = [[14, 224], [48, 224], [82, 224], [114, 224], [316, 224]];

// Objets apportés par chaque grade (toujours présents à partir de ce grade)
const GRADE_PROPS = [
  [1, 'frame', 'dscg', 'Diplôme DSCG'], [2, 'shelf', 'dossiersEtagere', 'Planning de formation'], [3, 'frame', 'cadreEntretien', 'Entretien de 2e année'],
  [4, 'frame', 'attestation', 'Attestation de fin de stage'], [5, 'frame', 'diplomeDec', 'Diplôme d’expertise comptable'], [6, 'frame', 'certifInscription', 'Inscription au tableau'],
  [7, 'floor', 'mallette', 'Mallette d’audit'],
];

// badgeProps : liste [badgeId, propName, titre] des badges débloqués ayant un objet
export function renderScene(grade, opts = {}) {
  const { decor = 'openspace', badgeProps = [], bestStreak = 0, night = false, coverage = 0, stickers = 0, glow = false, name = '' } = opts;
  const frames = [], shelf = [], desk = [], floor = [];
  for (const [n, where, prop, title] of GRADE_PROPS) if (grade >= n) ({ frame: frames, shelf, desk, floor }[where]).push(['', prop, title]);
  for (const [badge, prop, title] of badgeProps) {
    if (FRAMES[prop]) frames.push([badge, prop, title]);
    else if (SHELF[prop]) shelf.push([badge, prop, title]);
    else if (DESK[prop]) desk.push([badge, prop, title]);
    else if (FLOOR[prop]) floor.push([badge, prop, title]);
  }
  const place = (items, slots, lib) => items.slice(0, slots.length).map(([b, p, title], i) => g(b, lib[p](slots[i][0], slots[i][1]), title)).join('');

  // Dossiers sur le bureau selon la couverture
  const pile = coverage >= 1 ? Math.min(6, 1 + Math.floor(coverage * 5)) : 0;
  const pileSvg = pile ? g('cov-25', Array.from({ length: pile }, (_, i) => box(130 - i * 0.6, 160 - 4 * (i + 1), 26, 4, [P.ecSoft, P.cacSoft, P.blueSoft, P.sun, P.white, P.ecSoft][i], 1)).join(''), 'Dossiers clients') : '';
  // Tableau de liège avec autocollants
  const cork = box(10, 124, 106, 42, '#e3c08f', 3) + r(13, 127, 100, 36, '#d6ad78', 'rx="2"') +
    Array.from({ length: Math.min(46, stickers) }, (_, i) => `<circle cx="${19 + (i % 12) * 8}" cy="${133 + Math.floor(i / 12) * 8.5}" r="3" fill="${[P.ec, P.cac, P.sun, P.leaf, P.red, P.blue][i % 6]}" stroke="${INK}" stroke-width="1"/>`).join('');
  // Plaque de cabinet
  const plaque = grade >= 8 ? g('anec-A24', box(146, 86, 60, 16, P.sun, 2) + tc(176, 93, 4.8, 'Expert-comptable') + tc(176, 99.5, 4.2, name || 'Cabinet', P.muted), 'Plaque sur la porte') : '';
  // Bureau, écran, personnage
  const deskSvg = box(126, 160, 196, 10, P.wood, 3) + r(134, 170, 10, 52, P.woodDark, `rx="2" ${S}`) + r(304, 170, 10, 52, P.woodDark, `rx="2" ${S}`) + `<ellipse cx="224" cy="226" rx="104" ry="5" fill="${INK}" opacity=".08"/>`;
  const monitor = box(148, 116, 50, 36, '#2b3a67', 3) + r(152, 120, 42, 28, grade >= 5 ? '#334a8a' : '#3b4a6b', 'rx="1.5"') + tc(173, 137, 7, grade >= 7 ? 'H2A ✓' : 'DEC 1', P.white) +
    r(169, 152, 8, 6, INK, 'rx="1"') + box(160, 157, 26, 3, INK, 1.5);
  const postit = badgeProps.some(([b]) => b === 'ser-3') ? g('ser-3', `<g transform="rotate(-6 196 122)">${box(190, 116, 11, 11, P.sun, 1)}${tc(195.5, 124.5, 7, '3')}</g>`, 'Trois sur trois') : '';
  const kicker = tc(226, 236, 7, DECOR[decor].label, P.muted, 'opacity=".85"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" role="img" aria-label="Scène de carrière : grade ${grade}">
    ${decorLayer(grade, decor, night)}
    ${glow ? r(0, 0, 360, 176, P.sun, 'opacity=".22"') : ''}
    ${place(frames, FRAME_SLOTS, FRAMES)}
    ${g('cov-tags-all', cork, `${stickers} autocollants de sous-thème`)}
    ${box(278, 20, 74, 4, P.wood, 1.5)}${[64, 106, 148].map((y) => box(278, y, 74, 4, P.wood, 1.5)).join('')}
    ${place(shelf, SHELF_SLOTS, SHELF)}
    ${plaque}
    ${person(228, 176, 128)}
    ${deskSvg}${monitor}${postit}${pileSvg}
    ${place(desk, DESK_SLOTS, DESK)}
    ${place(floor, FLOOR_SLOTS, FLOOR)}
    ${plant(bestStreak, 342, 224)}
    ${kicker}
    ${night ? r(0, 0, 360, 240, P.night, 'opacity=".28" pointer-events="none"') : ''}
  </svg>`;
}

export const PROP_NAMES = new Set([...Object.keys(FRAMES), ...Object.keys(SHELF), ...Object.keys(DESK), ...Object.keys(FLOOR)]);
