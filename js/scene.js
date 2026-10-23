// Scènes de carrière en SVG : même personnage, même palette, décor qui évolue,
// et objets ajoutés selon les badges débloqués (la « salle des trophées »).
// Fonctions pures qui renvoient du texte SVG.

const P = {
  ink: '#0f172a', navy: '#1e3a8a', ordre: '#1e40af', ec: '#0e7490', cac: '#7c3aed', gold: '#d4a017', goldLight: '#fde68a',
  wood: '#c8a27a', woodDark: '#9a7350', skin: '#f1c7a3', hair: '#3b2a20', white: '#ffffff', paper: '#f8fafc', grey: '#94a3b8',
  green: '#16a34a', greenDark: '#166534', red: '#b91c1c', cork: '#d6b48a', sky: '#bfdbfe', night: '#1e293b',
};
const DECOR = {
  openspace: { wall: '#e2e8f0', floor: '#cbd5e1' },
  partage: { wall: '#e7e5e4', floor: '#d6d3d1' },
  perso: { wall: '#f1e9dc', floor: '#d9c4a6' },
  cabinet: { wall: '#ece4d4', floor: '#b88b5e' },
};

const r = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const t = (x, y, s, txt, fill = P.ink, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="Arial, sans-serif" ${extra}>${txt}</text>`;
const g = (badge, body, title) => `<g class="prop" data-badge="${badge || ''}">${title ? `<title>${title}</title>` : ''}${body}</g>`;

// ---------- Objets ----------
// Cadres muraux (posés en grille)
const FRAMES = {
  dscg: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.woodDark}" stroke-width="1.5"`) + t(x + 4, y + 12, 6, 'DSCG', P.ordre, 'font-weight="bold"'),
  cadreEntretien: (x, y) => r(x, y, 26, 19, P.paper, `stroke="${P.grey}" stroke-width="1.5"`) + t(x + 3, y + 9, 4, 'Entretien', P.ink) + t(x + 6, y + 15, 4, '2e année', P.ink),
  attestation: (x, y) => r(x, y, 26, 19, P.paper, `stroke="${P.ec}" stroke-width="1.5"`) + t(x + 3, y + 9, 4, 'Attestation', P.ec) + t(x + 3, y + 15, 4, 'fin de stage', P.ec),
  diplomeDec: (x, y) => r(x, y, 26, 19, P.goldLight, `stroke="${P.gold}" stroke-width="2"`) + t(x + 6, y + 13, 7, 'DEC', P.navy, 'font-weight="bold"'),
  certifInscription: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.ordre}" stroke-width="1.5"`) + t(x + 3, y + 9, 4, 'Tableau', P.ordre) + t(x + 3, y + 15, 4, 'de l’Ordre', P.ordre),
  diplomeExercice: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.ec}" stroke-width="1.5"`) + t(x + 2, y + 12, 4.5, 'Exercice EC', P.ec),
  diplomeCac: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.cac}" stroke-width="1.5"`) + t(x + 2, y + 12, 4.5, 'Exercice CAC', P.cac),
  grandDiplome: (x, y) => r(x, y, 26, 19, P.goldLight, `stroke="${P.ec}" stroke-width="2.5"`) + t(x + 4, y + 9, 4, 'Expert-', P.ec) + t(x + 3, y + 15, 4, 'comptable', P.ec),
  carteCacCadre: (x, y) => r(x, y, 26, 19, P.goldLight, `stroke="${P.cac}" stroke-width="2.5"`) + r(x + 6, y + 5, 14, 9, P.cac) + t(x + 8, y + 11, 4, 'CAC', P.white),
  cadre20: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.gold}" stroke-width="1.5"`) + t(x + 4, y + 13, 7, '20/20', P.red, 'font-weight="bold"'),
  checklist: (x, y) => r(x, y, 26, 19, P.white, `stroke="${P.grey}" stroke-width="1.5"`) + [0, 1, 2].map((i) => `<path d="M${x + 4} ${y + 5 + i * 5} l2 2 l3 -3" stroke="${P.green}" fill="none"/>` + r(x + 11, y + 5 + i * 5, 11, 1.5, P.grey)).join(''),
};
// Objets d'étagère (posés sur des emplacements)
const SHELF = {
  codeRouge: (x, y) => r(x, y - 16, 7, 16, P.red) + r(x + 1, y - 13, 5, 2, P.goldLight),
  codePoche: (x, y) => r(x, y - 13, 9, 13, '#be123c', 'transform="rotate(-8 ' + (x + 4) + ' ' + y + ')"') + r(x + 3, y - 15, 2, 4, P.gold),
  binderOec: (x, y) => r(x, y - 18, 8, 18, P.ordre) + r(x + 2, y - 14, 4, 6, P.white) + `<circle cx="${x + 4}" cy="${y - 5}" r="1.5" fill="${P.white}"/>`,
  trophee: (x, y) => `<path d="M${x + 3} ${y - 18} h12 v6 a6 6 0 0 1 -12 0z" fill="${P.gold}"/>` + r(x + 7, y - 7, 4, 4, P.gold) + r(x + 4, y - 3, 10, 3, P.woodDark),
  trophee16: (x, y) => `<circle cx="${x + 8}" cy="${y - 10}" r="7" fill="${P.goldLight}" stroke="${P.gold}"/>` + t(x + 3, y - 8, 6, '16', P.navy, 'font-weight="bold"'),
  balance: (x, y) => r(x + 8, y - 16, 2, 16, P.gold) + r(x + 1, y - 16, 16, 1.5, P.gold) + `<path d="M${x} ${y - 10} a4 3 0 0 0 7 0z M${x + 11} ${y - 10} a4 3 0 0 0 7 0z" fill="${P.gold}"/>`,
  bouclier: (x, y) => `<path d="M${x + 2} ${y - 18} h14 v7 q0 8 -7 11 q-7 -3 -7 -11z" fill="${P.cac}"/>` + `<path d="M${x + 6} ${y - 10} l2 3 l5 -6" stroke="${P.white}" fill="none" stroke-width="1.5"/>`,
  cadenas: (x, y) => `<path d="M${x + 4} ${y - 10} v-3 a5 5 0 0 1 10 0 v3" stroke="${P.grey}" stroke-width="2" fill="none"/>` + r(x + 2, y - 10, 14, 10, P.gold, 'rx="2"'),
  calendrier: (x, y) => r(x, y - 16, 16, 16, P.white, `stroke="${P.grey}"`) + r(x, y - 16, 16, 4, P.red) + [0, 1, 2].map((i) => `<path d="M${x + 2 + i * 5} ${y - 8} l1.5 1.5 l2.5 -2.5" stroke="${P.green}" fill="none"/>`).join(''),
  horloge: (x, y) => `<circle cx="${x + 8}" cy="${y - 9}" r="8" fill="${P.white}" stroke="${P.ink}"/>` + `<path d="M${x + 8} ${y - 9} v-5 M${x + 8} ${y - 9} h4" stroke="${P.ink}"/>`,
  dossiersEtagere: (x, y) => [P.ec, P.cac, P.ordre, P.gold].map((c, i) => r(x + i * 4, y - 15, 3.5, 15, c)).join(''),
  intercalaires: (x, y) => [P.ec, P.ec, P.cac, P.cac].map((c, i) => r(x + i * 4.5, y - 17, 4, 17, c) + r(x + i * 4.5, y - 20 + (i % 2) * 2, 3, 3, P.goldLight)).join(''),
  shelf75: (x, y) => [P.ordre, P.ec, P.cac].map((c, i) => r(x + i * 6, y - 18, 5, 18, c)).join(''),
  shelfFull: (x, y) => [P.ordre, P.ec, P.cac, P.gold].map((c, i) => r(x + i * 4.5, y - 18, 4, 18, c)).join('') + r(x, y - 20, 18, 2, P.gold),
};
// Accessoires dont l'effet n'est pas un objet posé (gérés autrement dans la scène)
export const SPECIAL_PROPS = new Set(['folder1', 'folders2', 'folders4', 'liege', 'liegeFull', 'postit', 'murIllumine']);
// Objets de bureau (posés sur le plateau)
const DESK = {
  tasse: (x, y) => r(x, y - 7, 6, 7, P.white, `stroke="${P.grey}"`) + `<path d="M${x + 6} ${y - 6} q3 1 0 4" stroke="${P.grey}" fill="none"/>` + `<path d="M${x + 2} ${y - 10} q1 -2 0 -3 M${x + 4} ${y - 10} q1 -2 0 -3" stroke="${P.grey}" fill="none" stroke-width=".6"/>`,
  tampon: (x, y) => r(x + 2, y - 9, 3, 6, P.woodDark) + r(x, y - 4, 8, 4, P.red),
  loupe: (x, y) => `<circle cx="${x + 4}" cy="${y - 6}" r="4" fill="${P.sky}" stroke="${P.ink}"/>` + `<path d="M${x + 7} ${y - 3} l4 3" stroke="${P.ink}" stroke-width="2"/>`,
  stylo: (x, y) => `<path d="M${x} ${y - 1} l12 -3" stroke="${P.green}" stroke-width="2"/>`,
  lunettes: (x, y) => `<circle cx="${x + 3}" cy="${y - 3}" r="2.5" fill="none" stroke="${P.ink}"/><circle cx="${x + 9}" cy="${y - 3}" r="2.5" fill="none" stroke="${P.ink}"/><path d="M${x + 5.5} ${y - 3} h1" stroke="${P.ink}"/>`,
  bannetteVide: (x, y) => `<path d="M${x} ${y - 5} h14 l-2 5 h-10z" fill="${P.grey}"/>` + t(x + 1, y - 6, 3.5, 'en suspens', P.ink),
  bannetteRevu: (x, y) => r(x + 1, y - 9, 12, 5, P.paper, `stroke="${P.grey}"`) + `<path d="M${x} ${y - 5} h14 l-2 5 h-10z" fill="${P.green}"/>`,
  lampe: (x, y) => r(x + 4, y - 18, 1.5, 18, P.ink) + `<path d="M${x} ${y - 18} h10 l-2 -6 h-6z" fill="${P.green}"/>`,
};
// Objets au sol
const FLOOR = {
  coffre: (x, y) => r(x, y - 22, 24, 22, '#475569', 'rx="2"') + `<circle cx="${x + 12}" cy="${y - 11}" r="4" fill="none" stroke="${P.goldLight}" stroke-width="1.5"/>`,
  coffreOuvert: (x, y) => r(x, y - 22, 24, 22, '#475569', 'rx="2"') + r(x + 3, y - 19, 18, 16, '#1f2937') + r(x + 5, y - 12, 14, 3, P.gold) + r(x + 5, y - 8, 14, 3, P.gold),
  parapluie: (x, y) => `<path d="M${x} ${y - 26} a10 8 0 0 1 20 0z" fill="${P.navy}"/>` + `<path d="M${x + 10} ${y - 26} v24 q0 3 -3 3" stroke="${P.ink}" fill="none" stroke-width="1.5"/>`,
  machineCafe: (x, y) => r(x, y - 30, 20, 30, '#334155', 'rx="2"') + r(x + 4, y - 26, 12, 6, P.ink) + r(x + 7, y - 12, 6, 7, P.white),
  mallette: (x, y) => r(x, y - 14, 24, 14, '#4b2e1e', 'rx="2"') + r(x + 8, y - 17, 8, 3, 'none', `stroke="#4b2e1e" stroke-width="1.5"`) + r(x + 11, y - 9, 2, 3, P.gold),
};

function plant(best, x, y) {
  if (best < 3) return '';
  const pot = `<path d="M${x - 8} ${y - 14} h16 l-2 14 h-12z" fill="#b45309"/>`;
  const h = best >= 50 ? 70 : best >= 30 ? 52 : best >= 20 ? 44 : best >= 10 ? 32 : 18;
  const leaves = [];
  const n = best >= 50 ? 7 : best >= 20 ? 5 : best >= 10 ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const ly = y - 14 - (h * (i + 1)) / (n + 1);
    const side = i % 2 ? 1 : -1;
    leaves.push(`<path d="M${x} ${ly} q${side * 12} -6 ${side * 16} 2 q${side * -8} 4 ${side * -16} -2z" fill="${i % 2 ? P.green : P.greenDark}"/>`);
  }
  const flowers = best >= 30 ? [-6, 5, 0].map((dx, i) => `<circle cx="${x + dx}" cy="${y - 14 - h + i * 6}" r="3" fill="#f472b6"/>`).join('') : '';
  const title = `Plante : record de série ${best}`;
  return g('ser-3', `${r(x - 1, y - 14 - h, 2, h, P.greenDark)}${leaves.join('')}${flowers}${pot}`, title);
}

function person(grade) {
  const x = 176, y = 96;
  const jacket = grade <= 2 ? '#3b82f6' : grade <= 4 ? P.navy : P.ink;
  const tie = grade >= 8 ? P.gold : grade === 7 ? P.cac : grade >= 5 ? P.ordre : null;
  const smile = grade >= 5 ? `M${x - 5} ${y + 4} q5 5 10 0` : `M${x - 4} ${y + 5} q4 3 8 0`;
  return `<g class="person">
    ${r(x - 16, 104, 32, 52, '#334155', 'rx="6"')}
    <path d="M${x - 17} 152 v-30 q0 -12 17 -12 q17 0 17 12 v30z" fill="${jacket}"/>
    <path d="M${x - 5} 110 l5 10 l5 -10z" fill="${P.white}"/>
    ${tie ? `<path d="M${x - 2} 112 h4 l1 14 l-3 4 l-3 -4z" fill="${tie}"/>` : ''}
    ${grade >= 7 ? r(x + 8, 120, 6, 4, P.cac, 'rx="1"') : ''}
    <circle cx="${x}" cy="${y}" r="12" fill="${P.skin}"/>
    <path d="M${x - 12} ${y - 2} q2 -14 12 -13 q11 0 12 12 q-6 -6 -12 -5 q-7 -1 -12 6z" fill="${P.hair}"/>
    <circle cx="${x - 4.5}" cy="${y}" r="3.2" fill="none" stroke="${P.ink}" stroke-width="1"/>
    <circle cx="${x + 4.5}" cy="${y}" r="3.2" fill="none" stroke="${P.ink}" stroke-width="1"/>
    <path d="M${x - 1.3} ${y} h2.6" stroke="${P.ink}" stroke-width="1"/>
    <path d="${smile}" stroke="${P.ink}" fill="none" stroke-width="1"/>
    ${r(x - 24, 140, 16, 7, jacket, 'rx="3"')}${r(x + 8, 140, 16, 7, jacket, 'rx="3"')}
  </g>`;
}

function decorLayer(grade, decor, night) {
  const D = DECOR[decor];
  const out = [r(0, 0, 360, 178, D.wall), r(0, 178, 360, 62, D.floor), r(0, 176, 360, 3, P.woodDark, 'opacity=".4"')];
  if (decor === 'openspace') {
    for (const x of [30, 150, 270]) out.push(r(x, 4, 60, 3, P.white, 'opacity=".9"'));
    out.push(r(0, 136, 120, 4, '#94a3b8'), `<circle cx="40" cy="118" r="7" fill="#cbd5e1"/>`, r(32, 124, 16, 14, '#cbd5e1', 'rx="3"'), r(60, 120, 24, 16, '#94a3b8'));
  }
  if (decor === 'partage') {
    out.push(r(160, 20, 84, 52, P.white, `stroke="${P.grey}" stroke-width="2"`));
    if (grade >= 4) out.push(`<path d="M168 50 l12 -12 l12 8 l14 -14 M170 62 h30 M210 58 h24" stroke="${P.ordre}" fill="none" stroke-width="1.2"/>`, t(214, 34, 6, 'Mémoire', P.cac));
    out.push(r(0, 150, 60, 6, P.wood), `<circle cx="28" cy="128" r="8" fill="#cbd5e1"/>`, r(20, 136, 16, 14, '#cbd5e1', 'rx="3"'));
  }
  if (decor === 'perso' || decor === 'cabinet') {
    const sky = night ? P.night : P.sky;
    out.push(r(160, 16, 84, 56, sky, `stroke="${P.white}" stroke-width="4"`), r(200, 16, 3, 56, P.white), r(160, 42, 84, 3, P.white));
    if (night) out.push(`<circle cx="226" cy="30" r="6" fill="${P.goldLight}"/>`);
    else out.push(r(168, 52, 14, 20, '#93c5fd'), r(185, 46, 12, 26, '#a5b4fc'), r(214, 56, 22, 16, '#93c5fd'));
  }
  if (decor === 'cabinet') {
    out.push(r(118, 52, 34, 126, P.woodDark), r(121, 56, 28, 118, P.wood), `<circle cx="145" cy="118" r="2" fill="${P.gold}"/>`);
  }
  return out.join('');
}

// Disposition : emplacements fixes, remplis dans l'ordre
const FRAME_SLOTS = []; for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) FRAME_SLOTS.push([12 + col * 33, 10 + row * 22]);
const SHELF_SLOTS = []; for (const y of [58, 98, 136]) for (let i = 0; i < 4; i++) SHELF_SLOTS.push([266 + i * 21, y]);
const DESK_SLOTS = [[152, 150], [252, 150], [272, 150], [196, 150], [210, 150], [282, 150], [232, 150]];
const FLOOR_SLOTS = [[14, 212], [44, 212], [74, 212], [290, 214], [96, 212]];

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
  const pileSvg = pile ? g('cov-25', Array.from({ length: pile }, (_, i) => r(158 - i * 0.5, 150 - 3 * (i + 1), 22, 3, [P.ec, P.cac, P.ordre, P.gold, P.paper, P.green][i], 'rx=".5"')).join(''), 'Dossiers clients') : '';
  // Tableau de liège avec autocollants
  const cork = r(12, 102, 98, 38, P.cork, `stroke="${P.woodDark}" stroke-width="2"`) +
    Array.from({ length: Math.min(46, stickers) }, (_, i) => `<circle cx="${17 + (i % 12) * 8}" cy="${108 + Math.floor(i / 12) * 8.5}" r="3" fill="${[P.ec, P.cac, P.gold, P.green, P.red, P.ordre][i % 6]}"/>`).join('');
  const plaque = grade >= 8 ? g('anec-A24', r(123, 86, 24, 12, P.gold, 'rx="1"') + t(125, 91, 3.5, 'Expert-comptable', P.ink) + t(125, 96, 3.5, name || 'Cabinet', P.ink), 'Plaque sur la porte') : '';
  const desk_ = r(150, 150, 150, 8, P.woodDark, 'rx="2"') + r(156, 158, 6, 46, P.woodDark) + r(288, 158, 6, 46, P.woodDark) + r(150, 156, 150, 3, P.wood);
  const monitor = r(224, 112, 44, 30, P.ink, 'rx="2"') + r(227, 115, 38, 24, grade >= 5 ? '#1e3a8a' : '#334155') + r(243, 142, 6, 8, P.ink) + r(236, 148, 20, 2, P.ink) +
    t(231, 128, 5, grade >= 7 ? 'H2A ✓' : 'DEC 1', P.white);
  const postit = badgeProps.some(([b]) => b === 'ser-3') ? g('ser-3', r(258, 112, 9, 9, '#fde047') + t(260, 119, 6, '3', P.ink), 'Trois sur trois') : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" role="img" aria-label="Scène de carrière : grade ${grade}">
    ${decorLayer(grade, decor, night)}
    ${glow ? r(0, 0, 360, 178, P.goldLight, 'opacity=".35"') : ''}
    ${place(frames, FRAME_SLOTS, FRAMES)}
    ${g('cov-tags-all', cork, `${stickers} autocollants de sous-thème`)}
    ${r(262, 22, 88, 3, P.woodDark)}${[58, 98, 136].map((y) => r(262, y, 88, 3, P.woodDark)).join('')}
    ${place(shelf, SHELF_SLOTS, SHELF)}
    ${plaque}
    ${person(grade)}
    ${desk_}${monitor}${postit}${pileSvg}
    ${place(desk, DESK_SLOTS, DESK)}
    ${place(floor, FLOOR_SLOTS, FLOOR)}
    ${plant(bestStreak, 330, 222)}
    ${night ? r(0, 0, 360, 240, P.night, 'opacity=".25" pointer-events="none"') : ''}
  </svg>`;
}

export const PROP_NAMES = new Set([...Object.keys(FRAMES), ...Object.keys(SHELF), ...Object.keys(DESK), ...Object.keys(FLOOR)]);
