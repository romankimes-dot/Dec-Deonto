// Scène de carrière : le plan du cabinet, vu de dessus, comme un dessin d'architecte. Une pièce par grade ;
// les pièces ouvertes sont meublées, les suivantes hachurées avec leur condition. Les badges posent leurs objets
// sur le plan (calques `.prop[data-badge]`, cliquables, avec infobulle). Les couleurs suivent le thème par des
// variables CSS (--pl-*), avec des valeurs de repli « papier et encre ». Fonctions pures qui renvoient du SVG.

const C = {
  paper: 'var(--pl-paper, #f4efe4)', ink: 'var(--pl-ink, #1f2a44)', line: 'var(--pl-line, #6b7590)', soft: 'var(--pl-soft, #e4ddcc)',
  room: 'var(--pl-room, #fbf8f1)', locked: 'var(--pl-locked, #ebe5d6)', accent: 'var(--pl-accent, #b8552e)', gold: 'var(--pl-gold, #c99a2e)', green: 'var(--pl-green, #3b7d5a)',
};
const FONT = `font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace"`;
const S = (w = 1.2) => `stroke="${C.ink}" stroke-width="${w}" fill="none" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
const r = (x, y, w, h, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
const t = (x, y, s, txt, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" fill="${C.ink}" ${FONT} ${extra}>${txt}</text>`;
const tm = (x, y, s, txt, extra = '') => t(x, y, s, txt, `fill="${C.line}" ${extra}`);
const g = (badge, body, title) => `<g class="prop" data-badge="${badge || ''}">${title ? `<title>${title}</title>` : ''}${body}</g>`;

// ---------- Les huit pièces (une par grade), sur deux niveaux du plan ----------
// Le bâtiment occupe x 22..338, y 30..196 ; couloir central horizontal.
export const ROOMS = [
  { n: 1, name: 'Poste en open space', x: 22, y: 30, w: 70, h: 72 },
  { n: 2, name: 'Poste attitré', x: 92, y: 30, w: 70, h: 72 },
  { n: 3, name: 'Bureau partagé', x: 162, y: 30, w: 88, h: 72 },
  { n: 4, name: 'Salle des mémoires', x: 250, y: 30, w: 88, h: 72 },
  { n: 5, name: 'Bureau personnel', x: 22, y: 124, w: 88, h: 72 },
  { n: 6, name: 'Bibliothèque', x: 110, y: 124, w: 70, h: 72 },
  { n: 7, name: 'Salle d’audit', x: 180, y: 124, w: 70, h: 72 },
  { n: 8, name: 'Accueil', x: 250, y: 124, w: 88, h: 72 },
];

// ---------- Symboles d'architecte ----------
const desk = (x, y, w = 30, h = 14) => r(x, y, w, h, S()) + `<circle cx="${x + w / 2}" cy="${y + h + 8}" r="5" ${S()}/>` + `<path d="M${x + w / 2 - 5} ${y + h + 8} h10" ${S(0.8)}/>`;
const shelves = (x, y, w, h = 8) => r(x, y, w, h, S()) + Array.from({ length: Math.floor(w / 6) }, (_, i) => `<path d="M${x + 6 + i * 6} ${y} v${h}" ${S(0.6)}/>`).join('');
const table = (x, y, w, h) => r(x, y, w, h, S()) + [[x - 6, y + h / 2], [x + w + 6, y + h / 2]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="4" ${S()}/>`).join('');
const door = (x, y, len = 16, dir = 1) => `<path d="M${x} ${y} v${-len * dir}" ${S(1.6)}/><path d="M${x} ${y - len * dir} a${len} ${len} 0 0 ${dir > 0 ? 1 : 0} ${len} ${len * dir}" ${S(0.7)} stroke-dasharray="2 2"/>`;
const windowSym = (x, y, w) => `<path d="M${x} ${y} h${w}" stroke="${C.paper}" stroke-width="3"/><path d="M${x} ${y - 1.5} h${w} M${x} ${y + 1.5} h${w}" ${S(0.7)}/>`;

// ---------- Objets de badge : symboles posés dans les pièces ouvertes ----------
// Chaque objet = un petit symbole de plan avec un code court (ce qu'un architecte écrirait en légende).
const sym = {
  frame: (x, y, code, color = C.ink) => r(x, y, 18, 8, `fill="${C.room}" ${S()}`) + t(x + 9, y + 6, 5.2, code, `text-anchor="middle" font-weight="700" fill="${color}"`),
  book: (x, y, color) => r(x, y, 6, 10, `fill="${color}" ${S(0.8)}`),
  round: (x, y, color) => `<circle cx="${x + 5}" cy="${y + 5}" r="5" fill="${color}" ${S(0.9)}/>`,
  square: (x, y, color) => r(x, y, 10, 10, `fill="${color}" ${S(0.9)}`) + `<path d="M${x} ${y} l10 10 M${x + 10} ${y} l-10 10" ${S(0.6)}/>`,
  cross: (x, y) => `<circle cx="${x + 5}" cy="${y + 5}" r="5" ${S(0.9)}/><path d="M${x + 5} ${y} v10 M${x} ${y + 5} h10" ${S(0.7)}/>`,
};
// Catalogue : nom d'objet → [famille de symbole, code ou couleur]
const PROPS = {
  // cadres (au mur)
  dscg: ['frame', 'DSCG'], cadreEntretien: ['frame', 'ENT.'], attestation: ['frame', 'STAGE'], diplomeDec: ['frame', 'DEC', C.gold], certifInscription: ['frame', 'OEC'],
  diplomeExercice: ['frame', 'EX.EC', C.green], diplomeCac: ['frame', 'EX.CAC', C.accent], grandDiplome: ['frame', 'E-C', C.gold], carteCacCadre: ['frame', 'CAC', C.accent], cadre20: ['frame', '20/20', C.accent], checklist: ['frame', 'CTRL'],
  // étagère (livres et objets posés)
  codeRouge: ['book', C.accent], codePoche: ['book', C.accent], binderOec: ['book', C.ink], trophee: ['round', C.gold], trophee16: ['round', C.gold], balance: ['cross'], bouclier: ['round', C.accent],
  cadenas: ['square', C.soft], calendrier: ['square', C.room], horloge: ['cross'], dossiersEtagere: ['book', C.soft], intercalaires: ['book', C.green], shelf75: ['book', C.ink], shelfFull: ['book', C.gold],
  // bureau (petits objets)
  tasse: ['round', C.room], tampon: ['square', C.accent], loupe: ['cross'], stylo: ['book', C.green], lunettes: ['cross'], bannetteVide: ['square', C.room], bannetteRevu: ['square', C.green], lampe: ['round', C.gold],
  // sol (gros objets)
  coffre: ['square', C.ink], coffreOuvert: ['square', C.gold], parapluie: ['round', C.ink], machineCafe: ['square', C.accent], mallette: ['square', C.soft],
};
export const PROP_NAMES = new Set(Object.keys(PROPS));
// Accessoires dont l'effet n'est pas un objet posé (gérés autrement dans la scène)
export const SPECIAL_PROPS = new Set(['folder1', 'folders2', 'folders4', 'liege', 'liegeFull', 'postit', 'murIllumine']);

// Mobilier fixe des pièces ouvertes
function furniture(room, grade) {
  const { n, x, y, w, h } = room; const out = [];
  if (n === 1 || n === 2) out.push(desk(x + 10, y + 14, 34, 14), windowSym(x + 12, y, w - 24));
  if (n === 3) out.push(desk(x + 8, y + 12, 30, 14), desk(x + 50, y + 12, 30, 14), windowSym(x + 14, y, w - 28));
  if (n === 4) out.push(table(x + 22, y + 22, 44, 22), r(x + 6, y + 10, 76, 3, `fill="${C.soft}" ${S(0.7)}`), tm(x + w / 2, y + 8, 4.2, 'tableau blanc', 'text-anchor="middle"'));
  if (n === 5) out.push(desk(x + 26, y + 16, 36, 16), windowSym(x + 16, y, w - 32), `<circle cx="${x + w - 12}" cy="${y + h - 12}" r="5" ${S(0.8)}/>`);
  if (n === 6) out.push(shelves(x + 6, y + 6, w - 12), shelves(x + 6, y + h - 14, w - 12), r(x + 20, y + 28, 30, 16, S()));
  if (n === 7) out.push(table(x + 14, y + 20, 42, 20));
  if (n === 8) out.push(r(x + 8, y + 10, 40, 10, S()), tm(x + 28, y + 17.5, 4.2, 'comptoir', 'text-anchor="middle"'), `<circle cx="${x + 66}" cy="${y + 24}" r="4" ${S(0.8)}/><circle cx="${x + 76}" cy="${y + 24}" r="4" ${S(0.8)}/>`);
  if (grade >= 5 && n === 5) out.push(r(x + 8, y + 50, 16, 14, S()), tm(x + 16, y + 59, 3.8, 'biblio', 'text-anchor="middle"'));
  return out.join('');
}

// Emplacements d'objets par pièce (cadres le long du mur haut, objets posés dans la pièce)
function slotsFor(room) {
  const { x, y, w, h } = room; const frames = []; const items = [];
  for (let i = 0; i < Math.floor((w - 8) / 21); i++) frames.push([x + 5 + i * 21, y + h - 11]);
  for (let row = 0; row < 2; row++) for (let i = 0; i < Math.floor((w - 10) / 14); i++) items.push([x + 6 + i * 14, y + 30 + row * 14]);
  return { frames, items };
}

// Plante : symbole « végétal » dont le nombre de feuilles suit le record de série.
function plant(best, x, y) {
  if (best < 3) return '';
  const n = best >= 50 ? 8 : best >= 30 ? 6 : best >= 20 ? 5 : best >= 10 ? 4 : 3;
  const rad = best >= 30 ? 9 : best >= 10 ? 7 : 5.5;
  const leaves = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<ellipse cx="${x + Math.cos(a) * rad * 0.6}" cy="${y + Math.sin(a) * rad * 0.6}" rx="${rad * 0.55}" ry="${rad * 0.28}" transform="rotate(${(a * 180) / Math.PI} ${x + Math.cos(a) * rad * 0.6} ${y + Math.sin(a) * rad * 0.6})" fill="${C.green}" ${S(0.6)}/>`; }).join('');
  return g('ser-3', `<circle cx="${x}" cy="${y}" r="${rad + 3}" ${S(0.8)} stroke-dasharray="2 1.5"/>${leaves}<circle cx="${x}" cy="${y}" r="1.4" fill="${C.ink}"/>`, `Plante : record de série ${best}`);
}

const hatchId = 'pl-hatch';

// badgeProps : liste [badgeId, propName, titre] des badges débloqués ayant un objet.
// opts.gates : { n: 'texte de condition' } pour les pièces fermées ; opts.xp, opts.name pour le cartouche.
export function renderScene(grade, opts = {}) {
  const { badgeProps = [], bestStreak = 0, night = false, coverage = 0, stickers = 0, glow = false, name = '', gates = {}, xp = null, date = new Date() } = opts;
  const open = ROOMS.filter((rm) => rm.n <= grade);
  // Répartition des objets : cadres sur les murs des pièces ouvertes, autres objets dans les pièces, dans l'ordre
  const frameSlots = open.flatMap((rm) => slotsFor(rm).frames);
  const itemSlots = open.flatMap((rm) => slotsFor(rm).items);
  let fi = 0, ii = 0; const placed = [];
  const put = (badge, prop, title) => {
    const def = PROPS[prop]; if (!def) return;
    if (def[0] === 'frame') { const s = frameSlots[fi++]; if (s) placed.push(g(badge, sym.frame(s[0], s[1], def[1], def[2]), title)); return; }
    const s = itemSlots[ii++]; if (!s) return;
    placed.push(g(badge, sym[def[0]](s[0], s[1], def[1]), title));
  };
  const GRADE_PROPS = [[1, 'dscg', 'Diplôme DSCG'], [2, 'dossiersEtagere', 'Planning de formation'], [3, 'cadreEntretien', 'Entretien de 2e année'], [4, 'attestation', 'Attestation de fin de stage'], [5, 'diplomeDec', 'Diplôme d’expertise comptable'], [6, 'certifInscription', 'Inscription au tableau'], [7, 'mallette', 'Mallette d’audit']];
  for (const [n, prop, title] of GRADE_PROPS) if (grade >= n) put('', prop, title);
  for (const [badge, prop, title] of badgeProps) put(badge, prop, title);

  // Pièces
  const rooms = ROOMS.map((rm) => {
    const isOpen = rm.n <= grade; const cur = rm.n === grade;
    const fill = isOpen ? C.room : `url(#${hatchId})`;
    const label = t(rm.x + 4, rm.y + 9.5, rm.w >= 88 ? 6.2 : 5.6, `${String(rm.n).padStart(2, '0')} · ${rm.name.toUpperCase()}`, `font-weight="700" ${isOpen ? '' : `fill="${C.line}"`}`);
    const sub = isOpen ? '' : tm(rm.x + 4, rm.y + 18, 4.8, (gates[rm.n] || 'verrouillée').toUpperCase());
    const body = isOpen ? furniture(rm, grade) : `<path d="M${rm.x + rm.w - 16} ${rm.y + rm.h - 6} l5 -5 M${rm.x + rm.w - 11} ${rm.y + rm.h - 6} l5 -5" ${S(0.8)}/>`;
    const curMark = cur && grade < 8 ? r(rm.x + 1.5, rm.y + 1.5, rm.w - 3, rm.h - 3, `fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-dasharray="4 2.5"`) : '';
    return `<g class="room ${isOpen ? 'open' : 'locked'}">${r(rm.x, rm.y, rm.w, rm.h, `fill="${fill}"`)}${isOpen ? r(rm.x, rm.y, rm.w, rm.h, `fill="${C.locked}" opacity="0"`) : r(rm.x, rm.y, rm.w, rm.h, `fill="${C.locked}" opacity=".55"`)}${body}${label}${sub}${curMark}</g>`;
  }).join('');

  // Murs porteurs, couloir, portes
  const walls = `<path d="M22 30 h316 v166 h-316z" ${S(2.2)}/><path d="M22 102 h316 M22 124 h316 M92 30 v72 M162 30 v72 M250 30 v166 M110 124 v72 M180 124 v72" ${S(1.4)}/>
    ${tm(180, 116, 4.6, 'COULOIR', 'text-anchor="middle" letter-spacing="2"')}
    ${door(60, 102, 14, 1)}${door(130, 102, 14, 1)}${door(206, 102, 14, 1)}${door(294, 102, 14, 1)}${door(66, 124, 14, -1)}${door(146, 124, 14, -1)}${door(216, 124, 14, -1)}
    ${door(338, 160, 16, 1)}${tm(346, 150, 4.2, 'ENTRÉE', 'transform="rotate(90 346 150)"')}`;
  // Plaque sur la porte (grade 8)
  const plaque = grade >= 8 ? g('anec-A24', r(306, 170, 28, 10, `fill="${C.gold}" ${S(0.9)}`) + t(320, 177, 4.2, name ? name.toUpperCase().slice(0, 9) : 'CABINET', `text-anchor="middle" font-weight="700"`), 'Plaque sur la porte') : '';
  // Tableau de liège (autocollants) : panneau d'affichage dans le couloir
  const cork = stickers ? g('cov-tags-all', r(26, 108, 60, 10, `fill="${C.soft}" ${S(0.8)}`) + Array.from({ length: Math.min(23, Math.ceil(stickers / 2)) }, (_, i) => `<circle cx="${29 + i * 2.5}" cy="${113}" r=".9" fill="${C.accent}"/>`).join(''), `${stickers} autocollants de sous-thème`) : '';
  // Dossiers clients (couverture) : archives dans le couloir
  const pile = coverage > 0 ? Math.min(8, 1 + Math.floor(coverage * 7)) : 0;
  const pileSvg = pile ? g('cov-25', Array.from({ length: pile }, (_, i) => r(250 - 10 - i * 9, 108, 7, 10, `fill="${i % 2 ? C.soft : C.room}" ${S(0.7)}`)).join(''), `Dossiers clients : ${Math.round(coverage * 100)} % des annales vues`) : '';
  // Cotes et cartouche
  const dim = `<path d="M22 206 h316 M22 202 v8 M338 202 v8" ${S(0.7)}/>${tm(180, 215, 4.4, `${open.length} PIÈCE${open.length > 1 ? 'S' : ''} OUVERTE${open.length > 1 ? 'S' : ''} SUR 8`, 'text-anchor="middle" letter-spacing="1"')}
    <path d="M346 30 v166 M342 30 h8 M342 196 h8" ${S(0.7)}/>`;
  const d = date instanceof Date ? date : new Date(date);
  const cart = `<g class="cartouche">${r(22, 222, 316, 14, `fill="${C.room}" ${S(0.9)}`)}<path d="M120 222 v14 M226 222 v14 M292 222 v14" ${S(0.7)}/>
    ${t(27, 231.5, 5.4, 'PLAN DU CABINET', 'font-weight="700" letter-spacing="1"')}${tm(125, 231.5, 5, `GRADE ${grade} / 8${xp !== null ? ` · ${xp} PTS` : ''}`)}${tm(231, 231.5, 5, 'ÉCH. 1:50')}${tm(297, 231.5, 5, d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }))}</g>`;
  const title = t(22, 20, 7.2, 'CABINET D’EXPERTISE COMPTABLE', 'font-weight="700" letter-spacing="1.5"') + tm(338, 20, 5, night ? 'RELEVÉ DE NUIT' : 'RELEVÉ', 'text-anchor="end" letter-spacing="1"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 244" class="plan" role="img" aria-label="Plan du cabinet : grade ${grade}, ${open.length} pièces ouvertes sur 8">
    <defs><pattern id="${hatchId}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 v6" stroke="${C.line}" stroke-width=".7" opacity=".6"/></pattern>
      <pattern id="pl-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0 H0 V10" fill="none" stroke="${C.line}" stroke-width=".3" opacity=".35"/></pattern></defs>
    ${r(0, 0, 360, 244, `fill="${C.paper}"`)}${r(0, 0, 360, 244, 'fill="url(#pl-grid)"')}
    ${glow ? r(22, 30, 316, 166, `fill="${C.gold}" opacity=".12"`) : ''}
    ${title}${rooms}${walls}${cork}${pileSvg}${placed.join('')}${plaque}${plant(bestStreak, 325, 180)}${dim}${cart}
  </svg>`;
}
