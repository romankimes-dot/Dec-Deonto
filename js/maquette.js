// La maquette des institutions : la ville posée sur une table, comme une maquette d'architecte, vue de trois quarts
// par une caméra fixe orientée nord (elle ne tourne jamais). La ville est un tableau à double entrée : une rangée par
// niveau (1 Régional, au premier plan, à 7 International, au fond), trois colonnes (expert-comptable à gauche,
// commun au centre, commissaire aux comptes à droite), séparées par des lignes tracées sur la maquette. Les jumeaux
// sont sur la même rangée, de part et d'autre de l'allée commune.
// On glisse pour déplacer la maquette, on pince (ou + / −) pour zoomer, on touche un bâtiment pour s'en approcher ;
// « Entrer » ouvre sa salle, présentée elle aussi en maquette : la tribune au fond, une estrade par groupe, chacun
// reconnaissable à un accessoire (toque du magistrat, mallette du fonctionnaire, écharpe de l'élu…), les présents
// non membres dans une galerie à droite. Rien ne repose sur la couleur seule : chaque étiquette dit « EC », « CAC »
// ou « commun », chaque rangée a son numéro, chaque rôle son accessoire et son nom.
// three.js est passé en paramètre (js/vendor/three.module.min.js dans l'app, inclus dans la page autonome).

import { VILLE, batiment } from './ville.js';
import { SALLES, SYMBOLES, svgIcon, groupLabel, compositionItems } from './ville3d.js';

// Palette sûre pour les daltoniens (Okabe et Ito) : bleu et orange se distinguent aussi par leur luminosité.
export const PAL = { ec: '#0072B2', cac: '#E69F00', commun: '#7A7A7A' };
const BADGE = { ec: 'EC', cac: 'CAC', commun: 'commun' };
export const RANGS = [
  { id: 'reg', n: 1, nom: 'Régional' },
  { id: 'nat', n: 2, nom: 'National' },
  { id: 'sup', n: 3, nom: 'Supervision' },
  { id: 'tut', n: 4, nom: 'Tutelle et normes' },
  { id: 'jur', n: 5, nom: 'Juridictions' },
  { id: 'resp', n: 6, nom: 'Responsabilités et signalements' },
  { id: 'intl', n: 7, nom: 'International' },
];
// Qui est où : par rangée, par colonne, du centre vers l'extérieur pour les rives (le premier est le plus proche de
// l'allée commune, donc en face de son jumeau).
export const PLAN = {
  reg: { ec: ['croec', 'chreg', 'cavec'], cac: ['crcc'] },
  nat: { ec: ['cnoec', 'chnat'], cac: ['cncc'] },
  sup: { ec: ['terrain'], cac: ['h2a', 'sanctions', 'amf'] },
  tut: { ec: ['bercy'], cac: ['chancellerie', 'anc'] },
  jur: { commun: ['ca', 'ce', 'cass'], cac: ['ta', 'ccomptes'] },
  resp: { commun: ['tj', 'tcorr', 'parquet', 'tracfin'] },
  intl: { commun: ['ifac', 'iesba', 'iaasb', 'iaesb', 'aceu'], cac: ['ue'] },
};
const SLOT = 6.2, ROW = 12, BW = 4.6, BD = 3.6, ZX = 22, NORD = 4.5 - 0.5;
const rowZ = (n) => (4 - n) * ROW - (n > 4 ? 5 : 0); // un boulevard sépare les deux quartiers
const ZB = (rowZ(4) + rowZ(5)) / 2; // limite entre le quartier des deux professions (sud) et le quartier commun (nord)
// Deux quartiers. Au premier plan (rangées 1 à 4), l'expert-comptable à gauche et le commissaire aux comptes à
// droite, face à face de part et d'autre de la ligne centrale. Au fond (rangées 5 à 7), le quartier commun aux deux
// professions ; les rares institutions propres au CAC qui s'y trouvent sont rangées à droite de leur rangée.
export const COLONNES = [
  { id: 'ec', titre: 'Expert-comptable', x: -11, nord: false },
  { id: 'cac', titre: 'Commissaire aux comptes', x: 11, nord: false },
  { id: 'commun', titre: 'Commun aux deux professions', x: 0, nord: true },
];
export const MLOTS = [];
for (const r of RANGS) {
  const P = PLAN[r.id], nord = r.n > 4, row = nord ? [...(P.commun || []), ...(P.cac || []), ...(P.ec || [])] : null;
  const put = (id, x, col) => { const b = batiment(id); MLOTS.push({ id, b, rang: r, col, nord, x, z: rowZ(r.n) - 1.2, h: b.style === 'vide' ? 0.15 : 2.4 + Math.min(2.2, b.h * 0.018) }); };
  if (nord) row.forEach((id, i) => put(id, (i - (row.length - 1) / 2) * SLOT, batiment(id).rive));
  else for (const side of ['ec', 'cac']) (P[side] || []).forEach((id, i) => put(id, (side === 'ec' ? -1 : 1) * (4.6 + i * SLOT), side));
}
// Une étiquette sur deux est posée un peu plus en avant, pour que deux voisines ne se recouvrent pas.
for (const r of RANGS) MLOTS.filter((l) => l.rang === r).sort((a, b) => a.x - b.x).forEach((l, i) => { l.alt = i % 2; });
export const mlot = (id) => MLOTS.find((l) => l.id === id);
// Pour les plans imprimables (js/villeplan.js) : les rangées du fond (7) au premier plan (1), une pièce par bâtiment.
export const PLAN_RANGS = [...RANGS].reverse().map((r) => ({ id: r.id, nom: `${r.n} · ${r.nom}`, z: rowZ(r.n) }));
export const PLAN_LOTS = MLOTS.map((l) => ({ id: l.id, b: l.b, st: PLAN_RANGS.find((s) => s.id === l.rang.id), side: 'n', x: l.x }));

// Rôles : nom affiché et accessoire (la forme qui distingue sans la couleur).
export const ROLES = {
  magistrat: ['Magistrat', 'toque noire et rabat blanc', '#1f2937'],
  fonctionnaire: ['Fonctionnaire', 'mallette', '#6b7280'],
  elu_ec: ['Élu expert-comptable', 'écharpe', PAL.ec],
  elu_cac: ['Élu commissaire aux comptes', 'écharpe', PAL.cac],
  eip: ['CAC d’EIP', 'écharpe', '#D55E00'],
  pro: ['Professionnel', 'porte-documents', '#009E73'],
  qualifie: ['Personnalité qualifiée', 'livre', '#CC79A7'],
  durabilite: ['Qualifié durabilité', 'livre', '#009E73'],
  ancien_cac: ['Ancien CAC', 'cheveux gris', '#56B4E9'],
  ministre: ['Ministre', 'écharpe tricolore', '#1e3a8a'],
  gouvernement: ['Représentant du gouvernement', 'dossier, debout', '#334155'],
  agent: ['Agent', 'casquette', '#56B4E9'],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const badge = (rive) => `<span class="mq-badge ${rive}">${BADGE[rive]}</span>`;
const twinKey = (a, b) => [a, b].sort().join('|');

export const MAQUETTE_CSS = `
.mq { --st: env(safe-area-inset-top, 0px); --sb: env(safe-area-inset-bottom, 0px); --ec: ${PAL.ec}; --cac: ${PAL.cac}; --cm: ${PAL.commun}; position: relative; height: min(calc(100dvh - 150px), 760px); min-height: 440px; overflow: hidden; background: #e9edf2; color: var(--text, #0f172a); touch-action: none; user-select: none; -webkit-user-select: none; outline: none; font: 14px/1.35 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; overscroll-behavior: none; }
.mq.mq-full { position: fixed; inset: 0; height: auto; min-height: 0; z-index: 15; }
.mq [hidden] { display: none !important; }
.mq canvas.mq-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.mq-fade { position: absolute; inset: 0; background: #e9edf2; opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 5; }
.mq-fade.on { opacity: 1; }
.mq-layer { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.mq-lb { position: absolute; left: 0; top: 0; will-change: transform; white-space: nowrap; display: flex; align-items: center; gap: 5px; padding: 4px 8px 4px 5px; border-radius: 8px; background: #fff; color: #0f172a; border: 1.5px solid #cbd5e1; box-shadow: 0 1px 4px rgba(0,0,0,.15); font-weight: 700; font-size: 14px; pointer-events: auto; cursor: pointer; }
.mq-lb svg { width: 16px; height: 16px; flex-shrink: 0; }
.mq-lb.sel { background: #0f172a; color: #fff; border-color: #0f172a; }
.mq-lb.compact { font-size: 11.5px; padding: 3px 4px; gap: 1px; flex-direction: column; max-width: var(--mw, 80px); white-space: normal; text-align: center; line-height: 1.1; } .mq-lb.compact .nm { white-space: normal; } .mq-lb.compact .mq-badge { display: none; } .mq-lb.compact svg { width: 14px; height: 14px; }
.mq-lb.compact.ec { border: 2px solid var(--ec); } .mq-lb.compact.cac { border: 2px dashed #a86d00; } .mq-lb.compact.commun { border: 3px double #6b7280; }
.mq-lb.chip { padding: 3px; border-width: 2.5px; border-radius: 50%; box-shadow: none; }
.mq-lb.chip svg { width: 14px; height: 14px; }
.mq-row.short span, .mq-colh.short .t { display: none; }
.mq-colh.short { padding: 3px; }
.mq-lb .two span, .mq-lb .two small { white-space: normal; max-width: 230px; }
.mq-lb.chip .nm, .mq-lb.chip .mq-badge { display: none; }
.mq-lb.chip.ec { border: 2.5px solid var(--ec); } .mq-lb.chip.cac { border: 2.5px dashed #a86d00; } .mq-lb.chip.commun { border: 4px double #6b7280; }
.mq-lb .two { display: flex; flex-direction: column; line-height: 1.15; }
.mq-lb .two small { font-weight: 500; font-size: 11.5px; color: #475569; }
.mq-lb.sel .two small { color: #cbd5e1; }
.mq-lb.stem::after { content: ''; position: absolute; left: 50%; top: 100%; width: 2px; height: var(--stem, 0px); margin-left: -1px; background: #475569; }
.mq-badge { display: inline-flex; align-items: center; justify-content: center; font: 800 10.5px/1 inherit; padding: 3px 5px; border-radius: 4px; letter-spacing: .02em; flex-shrink: 0; }
.mq-badge.ec { background: var(--ec); color: #fff; border: 1.5px solid var(--ec); }
.mq-badge.cac { background: #fff; color: #7a4f00; border: 1.5px dashed #a86d00; }
.mq-badge.commun { background: #e5e7eb; color: #374151; border: 1.5px double #6b7280; border-width: 3px; padding: 1px 4px; }
.mq-row { position: absolute; left: 0; top: 0; z-index: 2; will-change: transform; pointer-events: none; display: flex; align-items: center; gap: 5px; padding: 3px 10px 3px 3px; border-radius: 999px; background: rgba(15,23,42,.9); color: #fff; font-weight: 700; font-size: 12.5px; white-space: nowrap; }
.mq-row b { display: inline-flex; width: 26px; height: 26px; border-radius: 50%; background: #fff; color: #0f172a; align-items: center; justify-content: center; font-size: 12px; }
.mq-colh { position: absolute; top: 0; left: 0; z-index: 2; will-change: transform; pointer-events: none; display: flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,.95); border: 1px solid #cbd5e1; font-weight: 700; font-size: 12px; white-space: nowrap; }
.mq-ui { position: absolute; left: max(10px, env(safe-area-inset-left, 0px)); right: max(10px, env(safe-area-inset-right, 0px)); top: calc(8px + var(--st)); z-index: 3; display: flex; flex-direction: column; gap: 6px; }
.mq-top { display: flex; gap: 6px; align-items: stretch; }
.mq-where { flex: 1; min-width: 0; display: flex; gap: 8px; align-items: center; padding: 5px 6px 5px 10px; min-height: 46px; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff; }
.mq-where > svg { width: 22px; height: 22px; flex-shrink: 0; }
.mq-where .tx { flex: 1; min-width: 0; line-height: 1.25; }
.mq-where b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 15px; line-height: 1.2; }
.mq-where small { display: block; color: #475569; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mq-btn { font: 600 13.5px/1.1 inherit; min-height: 44px; min-width: 44px; padding: 6px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; }
.mq-btn.primary { background: #0f172a; border-color: #0f172a; color: #fff; }
.mq-btn.on { background: #0f172a; border-color: #0f172a; color: #fff; }
.mq-btn.sm { min-height: 38px; padding: 4px 10px; font-size: 13px; }
.mq-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.mq-drawer { position: relative; overflow: auto; touch-action: pan-y; overscroll-behavior: contain; max-height: 42vh; padding: 10px 12px; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff; }
.mq-drawer .x { position: sticky; top: 0; float: right; margin: -4px -4px 0 6px; }
.mq-drawer p { margin: 6px 0; }
.mq-drawer h5 { margin: 10px 0 4px; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: #475569; }
.mq-cmp { width: 100%; border-collapse: collapse; font-size: 13px; }
.mq-cmp th, .mq-cmp td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; text-align: left; }
.mq-cmp td:first-child { font-weight: 700; width: 26%; }
.mq-list { list-style: none; margin: 0; padding: 0; }
.mq-list li { border-top: 1px solid #e2e8f0; }
.mq-list li:first-child { border-top: 0; }
.mq-list button { width: 100%; display: flex; gap: 10px; align-items: center; text-align: left; padding: 10px 4px; min-height: 52px; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.mq-list button svg { width: 28px; height: 28px; flex-shrink: 0; }
.mq-list .tx { flex: 1; min-width: 0; }
.mq-list .tx b { display: block; font-size: 14.5px; }
.mq-list .tx small { display: block; color: #475569; font-size: 12.5px; }
.mq-list .seen { font-weight: 800; color: #0f172a; }
.mq-ghead { display: flex; align-items: center; gap: 8px; margin: 14px 0 4px; padding-bottom: 6px; border-bottom: 3px solid #0f172a; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; }
.mq-fig { width: 34px; height: 34px; flex-shrink: 0; }
.mq-zoom { position: absolute; right: max(12px, env(safe-area-inset-right, 0px)); bottom: calc(18px + var(--sb)); z-index: 3; display: flex; flex-direction: column; gap: 8px; }
.mq-zoom .mq-btn { width: 48px; height: 48px; font-size: 22px; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.mq-rkey { position: absolute; left: max(10px, env(safe-area-inset-left, 0px)); bottom: calc(14px + var(--sb)); z-index: 2; display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; font-weight: 600; pointer-events: none; }
.mq-rkey span { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 8px; background: rgba(255,255,255,.92); border: 1px solid #cbd5e1; }
.mq-rkey i { width: 16px; height: 10px; display: inline-block; } .mq-rkey i.t { background: #94a3b8; } .mq-rkey i.e { background: #e2e8f0; border: 1px solid #94a3b8; } .mq-rkey i.g { border: 1.5px dashed #334155; }
.mq-hint { position: absolute; left: 50%; bottom: calc(20px + var(--sb)); transform: translateX(-50%); z-index: 2; padding: 6px 12px; border-radius: 999px; background: rgba(15,23,42,.85); color: #fff; font-size: 12.5px; font-weight: 600; pointer-events: none; white-space: nowrap; transition: opacity .4s; }
.mq-sheet { position: absolute; inset: 8px; z-index: 4; overflow: auto; touch-action: pan-y; overscroll-behavior: contain; border-radius: 14px; border: 1px solid #cbd5e1; background: #fff; padding: 0 14px 14px; }
.mq-sheet-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; position: sticky; top: 0; background: #fff; padding: 10px 0 8px; z-index: 1; }
.mq-seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
.mq-seg button { font: 600 13px/1 inherit; min-height: 38px; padding: 6px 10px; border: 0; background: #fff; color: #0f172a; cursor: pointer; }
.mq-seg button.on { background: #0f172a; color: #fff; }
`;

// Petit personnage dessiné en SVG (pour les listes) : même silhouette et même accessoire qu'en 3D.
export function figureSvg(role) {
  const c = ROLES[role]?.[2] || '#64748b', acc = {
    magistrat: '<rect x="11" y="2" width="10" height="5" rx="1" fill="#111827"/><rect x="14" y="15" width="4" height="4" fill="#fff"/>',
    fonctionnaire: '<rect x="22" y="20" width="7" height="6" rx="1" fill="#374151"/>',
    elu_ec: '<path d="M10 14 L22 26" stroke="#fff" stroke-width="3"/>', elu_cac: '<path d="M10 14 L22 26" stroke="#fff" stroke-width="3"/>', eip: '<path d="M10 14 L22 26" stroke="#fff" stroke-width="3"/>',
    ministre: '<path d="M10 14 L22 26" stroke="#ef4444" stroke-width="3"/><path d="M12 13 L24 25" stroke="#fff" stroke-width="1.5"/>',
    pro: '<rect x="20" y="16" width="7" height="9" fill="#fff" stroke="#111827"/>', qualifie: '<rect x="11" y="18" width="10" height="6" fill="#fff" stroke="#111827"/>', durabilite: '<rect x="11" y="18" width="10" height="6" fill="#fff" stroke="#111827"/>',
    ancien_cac: '', gouvernement: '<rect x="20" y="17" width="8" height="7" fill="#fde68a" stroke="#111827"/>', agent: '<rect x="10" y="3" width="12" height="3" fill="#111827"/><rect x="18" y="5" width="7" height="2" fill="#111827"/>',
  }[role] || '';
  const hair = role === 'ancien_cac' ? '#cbd5e1' : '#f1c7a3';
  return `<svg class="mq-fig" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 30 Q8 13 16 13 Q24 13 24 30 Z" fill="${c}"/><circle cx="16" cy="9" r="5" fill="${hair === '#cbd5e1' ? '#f1c7a3' : hair}"/>${role === 'ancien_cac' ? '<path d="M11 8 Q16 2 21 8" stroke="#cbd5e1" stroke-width="3" fill="none"/>' : ''}${acc}</svg>`;
}

export function startMaquette(root, THREE, opts = {}) {
  root.classList.add('mq'); root.classList.toggle('mq-full', !!opts.full); root.tabIndex = 0;
  root.innerHTML = `<canvas class="mq-gl"></canvas><div class="mq-layer" id="mq-layer"></div>
    <div class="mq-ui"><div class="mq-top"><div class="mq-where" id="mq-where"></div><button type="button" class="mq-btn" data-a="menu" aria-label="Menu">☰</button>${opts.onQuit ? '<button type="button" class="mq-btn" data-a="quit" aria-label="Quitter">✕</button>' : ''}</div>
    <div class="mq-tabs" id="mq-tabs"></div><div class="mq-drawer" id="mq-drawer" hidden></div></div>
    <div class="mq-zoom"><button type="button" class="mq-btn" data-a="zin" aria-label="Zoomer">+</button><button type="button" class="mq-btn" data-a="zout" aria-label="Dézoomer">−</button><button type="button" class="mq-btn" data-a="home" aria-label="Vue d’ensemble">⌂</button><button type="button" class="mq-btn" data-a="legend" aria-label="Légende">?</button></div>
    <div class="mq-hint" id="mq-hint">Glissez pour vous déplacer</div>
    <div class="mq-rkey" id="mq-rkey" hidden><span><i class="t"></i>tribune : préside</span><span><i class="e"></i>estrade : membres</span><span><i class="g"></i>galerie : présents, sans siéger</span></div><div class="mq-sheet" id="mq-sheet" hidden></div><div class="mq-fade" id="mq-fade"></div>`;
  const $ = (s) => root.querySelector(s);
  const rkey = $('#mq-rkey'), canvas = $('.mq-gl'), layer = $('#mq-layer'), whereEl = $('#mq-where'), tabsEl = $('#mq-tabs'), drawer = $('#mq-drawer'), sheet = $('#mq-sheet'), fadeEl = $('#mq-fade'), hintEl = $('#mq-hint');
  // Ni défilement de la page, ni « tirer pour recharger », ni zoom de page : seuls les tiroirs défilent.
  root.addEventListener('touchmove', (e) => { const sc = e.target.closest('.mq-drawer, .mq-sheet'); if (!sc || sc.scrollHeight <= sc.clientHeight) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) root.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const PITCH = 50 * Math.PI / 180, FOV = 42, TANF = Math.tan(FOV * Math.PI / 360);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 600);
  let W = 1, H = 1, dirty = true, uiTop = 120;
  const resize = () => { W = root.clientWidth || 1; H = root.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); uiTop = $('.mq-ui').getBoundingClientRect().bottom - root.getBoundingClientRect().top; dirty = true; };
  const ro = new ResizeObserver(resize); ro.observe(root);

  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const matCache = new Map();
  const std = (c, extra) => { const k = c + JSON.stringify(extra || {}); if (!matCache.has(k)) matCache.set(k, keep(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...extra }))); return matCache.get(k); };
  const BOX = keep(new THREE.BoxGeometry(1, 1, 1));
  const box = (sc, w, h, d, x, y, z, mat, shadow = true) => { const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; sc.add(m); return m; };
  const canvasTex = (c) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const drawIcon = (x, id, X, Y, size, color, lw = 2.2) => { const svg = svgIcon(id); const d = svg.match(/d="([^"]+)"/)?.[1]; if (!d) return; x.save(); x.translate(X, Y); x.scale(size / 24, size / 24); x.lineWidth = lw; x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(new Path2D(d)); x.restore(); };
  const lights = (sc, span) => {
    sc.add(new THREE.HemisphereLight(0xffffff, 0xb6bfcc, 1.25));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.6); sun.position.set(span * 0.45, span * 0.9, span * 0.6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: span * 4 }); sc.add(sun, sun.target); return sun;
  };

  // ---------- Étiquettes HTML : nettes, jamais masquées ; si deux se recouvrent, l'une s'écarte, reliée par un trait.
  const vP = new THREE.Vector3();
  const mkLabel = (html, pos, o = {}) => { const el = document.createElement('div'); el.className = 'mq-lb'; el.innerHTML = html; el.hidden = true; layer.appendChild(el); return { el, pos, ...o }; };
  function place(list, loose = false) {
    const cands = [];
    for (const it of list) {
      if (it.off) { if (!it.el.hidden) it.el.hidden = true; continue; }
      vP.copy(it.pos).project(camera);
      const sx = (vP.x + 1) / 2 * W, sy = (1 - vP.y) / 2 * H;
      if (vP.z > 1 || sx < -60 || sx > W + 60 || sy < uiTop - 10 || sy > H + 40) { if (!it.el.hidden) it.el.hidden = true; continue; }
      if (it.el.hidden) it.el.hidden = false;
      const hh = it.el.offsetHeight || 26; cands.push({ it, sx, sy: it.below ? sy + hh : sy, w: it.el.offsetWidth || 90, h: hh });
    }
    cands.sort((a, b) => b.sy - a.sy);
    const boxes = [];
    for (const c of cands) {
      let y = c.sy; c.sx = clamp(c.sx, c.w / 2 + 4, W - c.w / 2 - 4);
      for (let g = 0; g < (loose ? 0 : 10); g++) { const hit = boxes.find((b) => c.sx - c.w / 2 < b.x1 + 3 && c.sx + c.w / 2 > b.x0 - 3 && y - c.h < b.y1 + 2 && y > b.y0 - 2); if (!hit) break; y = hit.y0 - 2; }
      boxes.push({ x0: c.sx - c.w / 2, x1: c.sx + c.w / 2, y0: y - c.h, y1: y });
      c.it.el.style.transform = `translate3d(${(c.sx - c.w / 2).toFixed(1)}px,${(y - c.h).toFixed(1)}px,0)`;
      const stem = c.sy - y; c.it.el.classList.toggle('stem', stem > 3); if (stem > 3) c.it.el.style.setProperty('--stem', `${stem.toFixed(0)}px`);
    }
  }
  const hideAll = (list) => { for (const it of list) it.el.hidden = true; };

  // ---------- La maquette de la ville
  const city = new THREE.Scene(); city.background = new THREE.Color('#e9edf2');
  lights(city, 50);
  const SX = 36, SZ = 54, GUT = ZX + 9;
  box(city, 400, 1, 400, 0, -1.6, 0, std('#d8cdb8'), false); // la table
  box(city, SX * 2 + 2, 1.2, SZ * 2 + 2, 0, -0.6, 0, std('#f8fafc'), false); // le socle
  const zoneTex = (kind, base) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(15,23,42,.07)'; x.lineWidth = 2; x.beginPath();
    if (kind === 'ec') for (let i = 0; i <= 128; i += 32) { x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); }
    else if (kind === 'cac') for (let r = 0; r < 8; r++) { const y = r * 16; x.moveTo(0, y); x.lineTo(128, y); for (let i = (r % 2) * 16; i <= 128; i += 32) { x.moveTo(i, y); x.lineTo(i, y + 16); } }
    else for (let i = -128; i <= 128; i += 42) { x.moveTo(i, 0); x.lineTo(i + 128, 128); x.moveTo(i + 128, 0); x.lineTo(i, 128); }
    x.stroke(); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const ground = (x0, x1, z0, z1, mat, y = 0.01) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; city.add(m); return m; };
  ground(-SX, SX, -SZ, SZ, std('#f8fafc'), 0.005);
  const z1 = rowZ(1) + 6.5, zN = rowZ(7) - 6.5;
  for (const [kind, x0, x1, za, zb, base] of [['ec', -ZX, 0, ZB, z1, '#e1edf7'], ['cac', 0, ZX, ZB, z1, '#f8eedd'], ['commun', -ZX, ZX, zN, ZB - 1.5, '#f1efea']]) { const t = zoneTex(kind, base); t.repeat.set((x1 - x0) / 6, (zb - za) / 6); ground(x0, x1, za, zb, keep(new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }))); }
  // Les lignes du tableau : entre les colonnes, entre les rangées.
  const ink = std('#334155');
  // Les lignes : la ligne centrale entre EC et CAC (épaisse), les bords, et une ligne fine entre les rangées.
  box(city, 0.34, 0.07, z1 - ZB, 0, 0.035, (z1 + ZB) / 2, ink, false);
  for (const x of [-ZX, ZX]) { box(city, 0.18, 0.06, z1 - ZB, x, 0.03, (z1 + ZB) / 2, ink, false); box(city, 0.18, 0.06, ZB - 1.5 - zN, x, 0.03, (ZB - 1.5 + zN) / 2, ink, false); }
  for (const z of [z1, ZB, ZB - 1.5, zN]) box(city, ZX * 2, 0.07, 0.2, 0, 0.035, z, ink, false);
  for (const r of RANGS) if (r.n !== 4 && r.n !== 7) box(city, ZX * 2, 0.05, 0.12, 0, 0.03, rowZ(r.n) - 6, std('#94a3b8'), false);
  ground(-ZX, ZX, ZB - 1.5, ZB, std('#cbd5e1'), 0.015);
  // Allée devant chaque rangée, et numéro de rangée peint dans la marge gauche.
  const pathMat = std('#ffffff');
  for (const r of RANGS) {
    ground(-ZX, ZX, rowZ(r.n) + 2.6, rowZ(r.n) + 4.2, pathMat, 0.02);
  }
  // Arbres en boule le long du bord : la touche « maquette ».
  { const trunk = std('#8b6b4a'), leaf = std('#7fb069'), G = keep(new THREE.SphereGeometry(0.9, 14, 10)), T = keep(new THREE.CylinderGeometry(0.12, 0.15, 0.8, 6));
    for (let z = -SZ + 3; z <= SZ - 3; z += 6) for (const x of [ZX + 3.5]) { const t = new THREE.Mesh(T, trunk); t.position.set(x, 0.4, z); city.add(t); const l = new THREE.Mesh(G, leaf); l.position.set(x, 1.3, z); l.castShadow = true; city.add(l); } }

  // Bâtiments. Profession = forme : EC, toit à deux pans ; CAC, couronne de verre ; commun, colonnade et fronton
  // (dôme pour l'international). La façade (côté caméra) porte le symbole et le badge écrit.
  const facadeTex = (lot) => {
    const c = document.createElement('canvas'), Wp = 256, Hp = Math.round(256 * lot.h / BW); c.width = Wp; c.height = Hp; const x = c.getContext('2d');
    x.fillStyle = lot.b.rive === 'ec' ? '#d6e6f3' : lot.b.rive === 'cac' ? '#f6e2bd' : '#ece8e0'; x.fillRect(0, 0, Wp, Hp);
    x.fillStyle = 'rgba(15,23,42,.10)'; for (let yy = 10; yy < Hp - 60; yy += 26) for (let xx = 14; xx < Wp - 14; xx += 30) x.fillRect(xx, yy, 14, 16);
    const r = Math.min(Wp * 0.26, Hp * 0.32), cx = Wp / 2, cy = Hp * 0.42;
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.lineWidth = 6; x.strokeStyle = PAL[lot.b.rive]; x.stroke();
    drawIcon(x, lot.id, cx - r * 0.62, cy - r * 0.62, r * 1.24, '#0f172a', 2.4);
    const txt = BADGE[lot.b.rive].toUpperCase(); x.font = '800 30px -apple-system, Arial, sans-serif'; const tw = x.measureText(txt).width + 18, by = Math.min(Hp - 40, cy + r + 10);
    x.fillStyle = lot.b.rive === 'ec' ? PAL.ec : '#fff'; x.fillRect(cx - tw / 2, by, tw, 34); if (lot.b.rive !== 'ec') { x.setLineDash(lot.b.rive === 'cac' ? [8, 5] : []); x.lineWidth = 4; x.strokeStyle = lot.b.rive === 'cac' ? '#a86d00' : '#6b7280'; x.strokeRect(cx - tw / 2, by, tw, 34); x.setLineDash([]); }
    x.fillStyle = lot.b.rive === 'ec' ? '#fff' : '#0f172a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cx, by + 18);
    return canvasTex(c);
  };
  const PRISM = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.lineTo(-0.5, 0); return keep(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5)); })();
  const COL = keep(new THREE.CylinderGeometry(0.16, 0.18, 1, 10)), DOME = keep(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2));
  const pick = [], blabels = [];
  for (const lot of MLOTS) {
    const { x, z, h, b } = lot, fz = z + BD / 2;
    box(city, BW + 0.8, 0.12, BD + 0.8, x, 0.06, z, std('#ffffff'), false);
    if (b.style === 'vide') {
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, c]) => new THREE.Vector3(x + a * BW / 2, 0.14, z + c * BD / 2));
      const ln = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), keep(new THREE.LineDashedMaterial({ color: '#0f172a', dashSize: 0.5, gapSize: 0.35 }))); ln.computeLineDistances(); city.add(ln);
      box(city, 0.14, 1.6, 0.14, x, 0.8, fz - 0.3, std('#475569'));
      const mats = [std('#fff'), std('#fff'), std('#fff'), std('#fff'), keep(new THREE.MeshStandardMaterial({ map: facadeTex({ ...lot, h: 2.4 }), roughness: 0.9 })), std('#fff')];
      const board = new THREE.Mesh(BOX, mats); board.scale.set(BW * 0.8, 1.9, 0.12); board.position.set(x, 2.1, fz - 0.3); board.castShadow = true; board.userData.id = lot.id; city.add(board); pick.push(board);
      const hit = box(city, BW, 0.3, BD, x, 0.15, z, std('#ffffff', { transparent: true, opacity: 0 }), false); hit.userData.id = lot.id; pick.push(hit);
    } else {
      const wall = std(b.rive === 'ec' ? '#d6e6f3' : b.rive === 'cac' ? '#f6e2bd' : '#ece8e0'), front = keep(new THREE.MeshStandardMaterial({ map: facadeTex(lot), roughness: 0.9 }));
      const m = new THREE.Mesh(BOX, [wall, wall, std('#f1f5f9'), wall, front, wall]); m.scale.set(BW, h, BD); m.position.set(x, h / 2 + 0.12, z); m.castShadow = m.receiveShadow = true; m.userData.id = lot.id; city.add(m); pick.push(m);
      const top = h + 0.12;
      if (b.rive === 'ec') { const roof = new THREE.Mesh(PRISM, std('#2f6f9f')); roof.scale.set(BW + 0.4, 1.5, BD + 0.4); roof.position.set(x, top, z); roof.castShadow = true; city.add(roof); }
      else if (b.rive === 'cac') { box(city, BW + 0.2, 0.18, BD + 0.2, x, top + 0.09, z, std('#b7791f')); box(city, BW * 0.6, 0.9, BD * 0.6, x, top + 0.63, z, std('#fcd38d', { transparent: true, opacity: 0.9, roughness: 0.3 })); }
      else if (lot.rang.id === 'intl') { const d = new THREE.Mesh(DOME, std('#e5e7eb')); d.scale.setScalar(1.35); d.position.set(x, top, z); d.castShadow = true; city.add(d); }
      else { const stone = std('#fafaf9'); for (const k of [-0.38, -0.13, 0.13, 0.38]) { const c = new THREE.Mesh(COL, stone); c.scale.set(1, h, 1); c.position.set(x + k * BW, h / 2 + 0.12, fz + 0.3); c.castShadow = true; city.add(c); } box(city, BW + 0.4, 0.3, 0.8, x, top + 0.05, fz + 0.2, stone); const ped = new THREE.Mesh(PRISM, stone); ped.scale.set(BW + 0.4, 0.9, 0.7); ped.position.set(x, top + 0.2, fz + 0.2); city.add(ped); }
      box(city, 1.1, 1.5, 0.06, x, 0.87, fz + 0.03, std('#334155'), false);
    }
    const it = mkLabel(`${badge(b.rive)}<span style="display:inline-flex">${svgIcon(lot.id)}</span><span class="nm">${esc(b.court)}</span>`, new THREE.Vector3(x, 0.2, z + BD / 2 + 0.6), { lot, below: true });
    it.el.dataset.id = lot.id; it.el.classList.add(b.rive); blabels.push(it);
  }
  // Repères du tableau, collés aux bords de l'écran : numéro et nom de chaque rangée à gauche, titre des colonnes en haut.
  const rowTags = RANGS.map((r) => { const el = document.createElement('div'); el.className = 'mq-row'; el.innerHTML = `<b>${r.n}</b><span>${esc(r.nom)}</span>`; root.appendChild(el); return { el, r }; });
  const colTags = COLONNES.map((c) => { const el = document.createElement('div'); el.className = 'mq-colh'; el.innerHTML = `${badge(c.id)}<span class="t">${esc(c.titre)}</span>`; root.appendChild(el); return { el, c }; });
  // Surbrillance : anneau autour du bâtiment choisi, trait vers son jumeau.
  const selRing = new THREE.Mesh(keep(new THREE.RingGeometry(3.5, 3.75, 48).rotateX(-Math.PI / 2)), std('#0f172a')); selRing.position.y = 0.16; selRing.visible = false; city.add(selRing);
  const twinLine = new THREE.Mesh(BOX, std('#0f172a')); twinLine.visible = false; city.add(twinLine);
  // Parcours : arcs numérotés au-dessus de la maquette.
  const tourGroup = new THREE.Group(); city.add(tourGroup); let tourTags = [];

  // ---------- Salles (maquettes intérieures, construites à la première visite)
  const rooms = new Map();
  const ROBE = keep(new THREE.CylinderGeometry(0.3, 0.42, 1.05, 12)), HEAD = keep(new THREE.SphereGeometry(0.24, 14, 10));
  function figure(role) {
    const g = new THREE.Group(), c = ROLES[role]?.[2] || '#64748b';
    const body = new THREE.Mesh(ROBE, std(c)); body.position.y = 0.53; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(HEAD, std('#f1c7a3')); head.position.y = 1.3; head.castShadow = true; g.add(head);
    const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
    if (role === 'magistrat') { add(keep(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12)), std('#111827'), 0, 1.6, 0); add(BOX, std('#ffffff'), 0, 0.92, 0.31).scale.set(0.16, 0.22, 0.04); }
    else if (role === 'fonctionnaire') add(BOX, std('#374151'), 0.42, 0.35, 0.05).scale.set(0.12, 0.32, 0.42);
    else if (['elu_ec', 'elu_cac', 'eip', 'ministre'].includes(role)) { const s = add(BOX, std(role === 'ministre' ? '#ef4444' : '#ffffff'), 0, 0.72, 0.3, 0, 0.75); s.scale.set(0.12, 0.95, 0.04); }
    else if (role === 'qualifie' || role === 'durabilite') add(BOX, std('#ffffff'), 0, 0.72, 0.36, -0.5).scale.set(0.34, 0.26, 0.06);
    else if (role === 'pro') add(BOX, std('#ffffff'), 0.34, 0.62, 0.22, 0, 0.2).scale.set(0.24, 0.32, 0.04);
    else if (role === 'gouvernement') add(BOX, std('#fde68a'), 0.36, 0.62, 0.2).scale.set(0.06, 0.32, 0.4);
    else if (role === 'agent') { add(keep(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12)), std('#111827'), 0, 1.48, 0); add(BOX, std('#111827'), 0, 1.46, 0.26).scale.set(0.3, 0.04, 0.18); }
    else if (role === 'ancien_cac') add(keep(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), std('#d1d5db'), 0, 1.33, 0);
    return g;
  }
  function buildRoom(lot) {
    if (rooms.has(lot.id)) return rooms.get(lot.id);
    const salle = SALLES[lot.id] || { groupes: [] }, b = lot.b;
    const mem = salle.groupes.filter((g) => !g.debout), hors = salle.groupes.filter((g) => g.debout);
    const head = mem[0]?.n === 1 ? mem[0] : null, rest = head ? mem.slice(1) : mem;
    const SP = 1.15, plat = (g) => { const cols = Math.min(g.n, 8), rows = Math.ceil(g.n / cols); return { g, cols, rows, w: cols * SP + 0.9, d: rows * SP + 0.9 }; };
    // Une colonne d'estrades, de la tribune (au fond) vers l'avant ; deux petits groupes partagent une ligne.
    const plats = rest.map(plat), lines = []; let cur = [], cw = 0;
    for (const p of plats) { if (cur.length) { lines.push(cur); cur = []; cw = 0; } cur.push(p); cw += p.w; }
    if (cur.length) lines.push(cur);
    let z = head ? 7 : 1.4; const placed = [];
    for (const ln of lines) { const tw = ln.reduce((a, p) => a + p.w, 0) + (ln.length - 1) * 2; let x = -tw / 2; const dmax = Math.max(...ln.map((p) => p.d)); for (const p of ln) { placed.push({ ...p, cx: x + p.w / 2, cz: z + p.d / 2 }); x += p.w + 2; } z += dmax + 3.4; }
    const galZ = z + 0.4; if (hors.length) z += 4.2;
    const RW = Math.max(12, ...lines.map((ln) => ln.reduce((a, p) => a + p.w, 0) + (ln.length - 1) * 2 + 2), hors.reduce((a, g) => a + g.n * 1.2 + 2.5, 0) + 1), RD = Math.max(11, z + 0.8), x0 = -RW / 2, z0 = -RD / 2, cxHall = 0;
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#e9edf2');
    lights(sc, Math.max(RW, RD) * 0.75);
    box(sc, 400, 1, 400, 0, -1.6, 0, std('#d8cdb8'), false);
    box(sc, RW + 1, 1.2, RD + 1, 0, -0.6, 0, std('#f8fafc'), false);
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(RW, RD)), std(b.rive === 'ec' ? '#e1edf7' : b.rive === 'cac' ? '#f8eedd' : '#f1efea')); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; sc.add(floor);
    const wallM = std('#cbd5e1'); box(sc, RW, 0.8, 0.2, 0, 0.4, z0, wallM); box(sc, 0.2, 0.8, RD, x0, 0.4, 0, wallM); box(sc, 0.2, 0.8, RD, -x0, 0.4, 0, wallM);
    const people = [], labels = [], groups = [];
    const add = (g, x, zz, y = 0.2) => { const f = figure(g.role); f.position.set(x, y, zz); f.rotation.y = Math.PI; sc.add(f); people.push({ mesh: f, g, x, z: zz }); };
    // Étiquette posée devant son groupe (dans l'allée), pas au-dessus des autres.
    const tag = (g, x, zz) => {
      const r = ROLES[g.role] || ['Membre', '', '#64748b'];
      const it = mkLabel(`${figureSvg(g.role).replace('mq-fig', 'mq-fig" style="width:22px;height:22px')}<span class="two"><span>${esc(groupLabel(g))}</span><small>${esc(r[0])}${g.debout ? ' · présent, non membre' : ''}</small></span>`, new THREE.Vector3(x, 0.3, zz), { g, below: true });
      labels.push(it); groups.push(g); it.el.dataset.g = String(groups.length - 1);
    };
    const dais = (w, d, x, zz, h, col) => { box(sc, w, h, d, x, h / 2, zz, std(col)); box(sc, w + 0.1, 0.04, d + 0.1, x, h + 0.02, zz, std('#ffffff')); };
    if (head) { dais(4.2, 2.8, cxHall, z0 + 2.1, 0.6, '#94a3b8'); box(sc, 3, 0.9, 0.5, cxHall, 0.6 + 0.45, z0 + 3.0, std('#8b6b4a')); add(head, cxHall, z0 + 1.8, 0.6); tag(head, cxHall, z0 + 3.9); }
    for (const p of placed) {
      const pcx = cxHall + p.cx, pcz = z0 + p.cz; dais(p.w, p.d, pcx, pcz, 0.2, '#e2e8f0');
      for (let k = 0; k < p.g.n; k++) { const r = Math.floor(k / p.cols), inRow = Math.min(p.cols, p.g.n - r * p.cols), c = k % p.cols; add(p.g, pcx + (c - (inRow - 1) / 2) * SP, pcz - p.d / 2 + 0.45 + SP / 2 + r * SP); }
      tag(p.g, pcx, pcz + p.d / 2 + 0.25);
    }
    if (hors.length) {
      // La galerie : ceux qui sont là sans siéger, au premier plan, derrière une rambarde.
      box(sc, RW - 1, 0.45, 0.1, 0, 0.23, z0 + galZ - 0.2, std('#64748b'));
      { const pts = [[x0 + 0.6, galZ + 0.2], [-x0 - 0.6, galZ + 0.2], [-x0 - 0.6, RD - 0.6], [x0 + 0.6, RD - 0.6], [x0 + 0.6, galZ + 0.2]].map(([a, c]) => new THREE.Vector3(a, 0.05, z0 + c)); const ln = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), keep(new THREE.LineDashedMaterial({ color: '#334155', dashSize: 0.4, gapSize: 0.3 }))); ln.computeLineDistances(); sc.add(ln); }
      let gx = x0 + 2.2; for (const g of hors) { for (let k = 0; k < g.n; k++) add(g, gx + k * 1.2, z0 + galZ + 1.1); tag(g, gx + (g.n - 1) * 0.6, z0 + galZ + 2.1); gx += g.n * 1.2 + 2.5; }
    }
    const room = { scene: sc, people, labels, groups, RW, RD, home: { x: 0, z: 1, d: 30 } };
    rooms.set(lot.id, room); return room;
  }

  // ---------- Caméra : orientation nord fixe, plongée 50°, champ fixe. Elle ne fait que glisser et zoomer.
  const S = { scene: 'city', lot: null, room: null, sel: null, group: null, tab: null, tour: null, visited: new Set(),
    cam: { x: 0, z: 6, d: 0 }, anim: null, bounds: { x0: -SX, x1: SX, z0: -SZ, z1: SZ } };
  const fitW = (w) => w / (2 * TANF * (W / H));
  const VUES = { ec: { x: -16, z: rowZ(2.5) + 2, w: 34 }, cac: { x: 11, z: rowZ(2.5) + 2, w: 26 }, face: { x: 0, z: rowZ(2.5) + 2, w: 2 * ZX + 3 }, commun: { x: 0, z: rowZ(6) + 4, w: 38 }, tout: { x: -4, z: (rowZ(1) + rowZ(7)) / 2, w: 2 * ZX + 16 } };
  const cityHome = (v = S.vue || 'face') => ({ x: VUES[v].x, z: VUES[v].z, d: clamp(fitW(VUES[v].w), 30, D_MAX) });
  const D_MIN = 9, D_MAX = 320;
  function applyCam() {
    const c = S.cam; c.x = clamp(c.x, S.bounds.x0, S.bounds.x1); c.z = clamp(c.z, S.bounds.z0, S.bounds.z1); c.d = clamp(c.d, D_MIN, D_MAX);
    camera.position.set(c.x, Math.sin(PITCH) * c.d, c.z + Math.cos(PITCH) * c.d); camera.lookAt(c.x, 0, c.z); dirty = true;
  }
  function glide(to, dur = 0.8) { S.anim = { from: { ...S.cam }, to: { x: to.x ?? S.cam.x, z: to.z ?? S.cam.z, d: to.d ?? S.cam.d }, t0: performance.now(), dur: dur * 1000 }; }
  const zoomBy = (k) => glide({ d: clamp(S.cam.d * k, D_MIN, D_MAX) }, 0.35);

  // ---------- Interface
  const tabBtn = (id, txt) => `<button type="button" class="mq-btn sm ${S.tab === id ? 'on' : ''}" data-a="tab" data-t="${id}">${txt}</button>`;
  const closeBtn = '<button type="button" class="mq-btn sm x" data-a="close-drawer" aria-label="Fermer">✕</button>';
  const twinHtml = (b) => {
    const t = b.jumeau && batiment(b.jumeau); if (!t) return '<p>Pas de jumeau : cette institution est commune aux deux professions, ou propre à l’une sans équivalent.</p>';
    const rows = VILLE.jumeaux?.[twinKey(b.id, t.id)] || [], e = b.rive === 'ec' ? b : t, c = b.rive === 'ec' ? t : b;
    return `${rows.length ? `<table class="mq-cmp"><tr><th></th><th>${badge('ec')} ${esc(e.court)}</th><th>${badge('cac')} ${esc(c.court)}</th></tr>${rows.map(([k, x, y]) => `<tr><td>${esc(k)}</td><td>${md(x)}</td><td>${md(y)}</td></tr>`).join('')}</table>` : ''}
      <h5>Qui siège chez le jumeau</h5><div class="cp-b" style="cursor:auto;padding:4px 10px">${compositionItems(t.id)}</div><p><button type="button" class="mq-btn sm" data-a="go" data-id="${t.id}">Aller chez ${esc(t.court)}</button></p>`;
  };
  function setUI() {
    let where, tabs = '', body = null;
    if (S.scene === 'room') {
      const b = S.lot.b, R = S.room;
      const mem = (SALLES[S.lot.id]?.groupes || []).filter((g) => !g.debout), tot = mem.length > 1 && mem.every((g) => !g.approx) ? `${mem.reduce((a, g) => a + g.n, 0)} membres · ` : '';
      where = `${badge(b.rive)}<div class="tx"><b>${esc(b.nom)}</b><small>${tot}rangée ${S.lot.rang.n} · ${esc(S.lot.rang.nom)}</small></div><button type="button" class="mq-btn sm" data-a="exit">Sortir</button>`;
      tabs = tabBtn('qui', 'Qui siège') + tabBtn('quoi', 'Ce qu’on y fait') + tabBtn('jumeau', 'Jumeau') + (opts.onFiche ? `<button type="button" class="mq-btn sm" data-a="fiche" data-f="${esc(b.fiche)}">Fiche</button>` : '');
      if (S.group) { const g = S.group, r = ROLES[g.role] || ['', '']; body = `${closeBtn}<p style="display:flex;gap:8px;align-items:center">${figureSvg(g.role)}<span><b>${esc(g.qui)}</b><br><small>${esc(r[0])} · ${esc(r[1])}${g.debout ? ' · présent, non membre' : ''}</small></span></p><p>${md(g.fait)}</p>`; }
      else if (S.tab === 'qui') body = `${closeBtn}<ul class="mq-list">${R.groups.map((g, i) => `<li><button type="button" data-a="group" data-i="${i}">${figureSvg(g.role)}<span class="tx"><b>${esc(groupLabel(g))}</b><small>${esc((ROLES[g.role] || ['Membre'])[0])} · ${esc((ROLES[g.role] || ['', ''])[1])}${g.debout ? ' · présent, non membre' : ''}</small></span></button></li>`).join('')}</ul>`;
      else if (S.tab === 'quoi') body = `${closeBtn}<p>${md(b.role)}</p>${b.pancartes.map((p) => `<h5>${esc(p.qui)}</h5><p>${md(p.fait)}</p>`).join('')}${b.pieges?.length ? `<h5>Pièges</h5>${b.pieges.map((p) => `<p>⚠ ${md(p)}</p>`).join('')}` : ''}`;
      else if (S.tab === 'jumeau') body = closeBtn + twinHtml(b);
    } else if (S.sel) {
      const l = S.sel, b = l.b;
      where = `${badge(b.rive)}<div class="tx"><b>${esc(b.nom)}</b><small>Rangée ${l.rang.n} · ${esc(l.rang.nom)} · ${esc(b.type)}</small></div><button type="button" class="mq-btn sm primary" data-a="enter">Entrer</button>`;
      tabs = tabBtn('role', 'À quoi ça sert') + tabBtn('jumeau', b.jumeau ? `Jumeau : ${esc(batiment(b.jumeau).court)}` : 'Jumeau') + (opts.onFiche ? `<button type="button" class="mq-btn sm" data-a="fiche" data-f="${esc(b.fiche)}">Fiche</button>` : '');
      if (S.tab === 'role') body = `${closeBtn}<p>${md(b.role)}</p>${b.chiffres?.length ? `<p><small>${b.chiffres.map(esc).join(' · ')}</small></p>` : ''}<p><small>Symbole : ${esc(SYMBOLES[l.id][1])}.</small></p>${b.pieges?.length ? b.pieges.map((p) => `<p>⚠ ${md(p)}</p>`).join('') : ''}`;
      else if (S.tab === 'jumeau') body = closeBtn + twinHtml(b);
    } else {
      where = `<div class="tx"><b>La ville des institutions</b><small>Touchez un bâtiment pour l’ouvrir</small></div><button type="button" class="mq-btn sm" data-a="list">Aller à</button>`;
      const v = S.vue || 'face', sb = (id, t) => `<button type="button" data-a="vue" data-v="${id}" class="${v === id ? 'on' : ''}">${t}</button>`;
      tabs = `<div class="mq-seg">${sb('ec', 'EC')}${sb('face', 'EC ↔ CAC')}${sb('cac', 'CAC')}${sb('commun', 'Commun')}</div><button type="button" class="mq-btn sm" data-a="tours">Parcours</button>`;
    }
    if (S.tour) {
      const t = S.tour, [id, txt] = t.etapes[t.i];
      body = `<p style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:0"><b>${esc(t.titre)}</b><small>étape ${t.i + 1} / ${t.etapes.length}</small></p><p><b>${t.i + 1}. ${esc(batiment(id).court)}</b> : ${md(txt)}</p><p style="display:flex;gap:6px"><button type="button" class="mq-btn sm" data-a="tour-prev" ${t.i ? '' : 'disabled'}>‹ Précédent</button><button type="button" class="mq-btn sm primary" data-a="tour-next">${t.i + 1 < t.etapes.length ? 'Suivant ›' : 'Terminer'}</button><button type="button" class="mq-btn sm" data-a="tour-stop">Quitter</button></p>`;
      tabs = '';
    }
    rkey.hidden = S.scene !== 'room'; whereEl.innerHTML = where; tabsEl.innerHTML = tabs; tabsEl.hidden = !tabs;
    drawer.hidden = body == null; if (body != null) { drawer.innerHTML = body; drawer.scrollTop = 0; }
    requestAnimationFrame(() => { uiTop = $('.mq-ui').getBoundingClientRect().bottom - root.getBoundingClientRect().top; dirty = true; });
  }
  const hint = (txt) => { hintEl.textContent = txt; hintEl.style.opacity = '1'; clearTimeout(hint.t); hint.t = setTimeout(() => { hintEl.style.opacity = '0'; }, 3500); };

  function select(lot, fly = true) {
    S.sel = lot; S.tab = null;
    for (const it of blabels) it.el.classList.toggle('sel', it.lot === lot);
    selRing.visible = !!lot; twinLine.visible = false;
    if (lot) {
      selRing.position.set(lot.x, 0.16, lot.z);
      const t = lot.b.jumeau && mlot(lot.b.jumeau);
      if (t) { const dx = t.x - lot.x, dz = t.z - lot.z, L = Math.hypot(dx, dz); twinLine.scale.set(Math.max(0.01, L - 7.4), 0.05, 0.12); twinLine.position.set((lot.x + t.x) / 2, 0.17, (lot.z + t.z) / 2); twinLine.rotation.y = -Math.atan2(dz, dx); twinLine.visible = L > 7.8; }
      if (fly) glide({ x: lot.x, z: lot.z + 1, d: Math.min(S.cam.d, Math.max(26, fitW(16))) });
    }
    setUI();
  }
  function fadeSwap(fn) { fadeEl.classList.add('on'); setTimeout(() => { fn(); fadeEl.classList.remove('on'); }, 260); }
  function enter(lot) {
    fadeSwap(() => {
      if (S.room) { hideAll(S.room.labels); for (const it of S.room.labels) it.el.classList.remove('sel'); } else S.cityCam = { ...S.cam };
      S.scene = 'room'; S.lot = lot; S.room = buildRoom(lot); S.group = null; S.tab = null; S.visited.add(lot.id); S.tour = null; clearTour();
      hideAll(blabels); for (const t of rowTags.concat(colTags)) t.el.hidden = true;
      S.bounds = { x0: -S.room.RW / 2, x1: S.room.RW / 2, z0: -S.room.RD / 2, z1: S.room.RD / 2 };
      S.room.home.d = Math.max(fitW(S.room.RW * 1.12), S.room.RD * 1.3, 14);
      S.cam = { ...S.room.home }; S.anim = null; applyCam(); setUI(); hint('Touchez un groupe pour savoir ce qu’il fait');
    });
  }
  function exit() {
    fadeSwap(() => {
      hideAll(S.room.labels); for (const it of S.room.labels) it.el.classList.remove('sel');
      const lot = S.lot; S.scene = 'city'; S.room = null; S.group = null; S.tab = null; S.bounds = { x0: -SX, x1: SX, z0: -SZ, z1: SZ };
      for (const t of rowTags.concat(colTags)) t.el.hidden = false;
      S.cam = S.cityCam || { x: lot.x, z: lot.z + 1, d: 30 }; S.anim = null; applyCam(); select(lot, false);
    });
  }
  function focusGroup(i) {
    const R = S.room, g = R.groups[i]; S.group = g; S.tab = null;
    for (const it of R.labels) it.el.classList.toggle('sel', it.g === g);
    const ps = R.people.filter((p) => p.g === g), cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length;
    glide({ x: cx, z: cz + 1, d: clamp(8 + ps.length * 0.25, 11, 22) }); setUI();
  }
  // Parcours : arcs numérotés au-dessus des bâtiments, la caméra passe d'étape en étape.
  function clearTour() { tourGroup.clear(); for (const t of tourTags) t.el.remove(); tourTags = []; }
  function startTour(pid) {
    const p = (VILLE.parcours || []).find((x) => x.id === pid); if (!p) return;
    closeSheet(); S.tour = { titre: p.titre, etapes: p.etapes, i: 0 }; clearTour();
    const lots = p.etapes.map(([id]) => mlot(id)), mat = std('#0f172a');
    for (let i = 0; i < lots.length - 1; i++) {
      const a = lots[i], b = lots[i + 1], A = new THREE.Vector3(a.x, a.h + 2.4, a.z), B = new THREE.Vector3(b.x, b.h + 2.4, b.z), M = A.clone().lerp(B, 0.5); M.y += 3 + A.distanceTo(B) * 0.12;
      tourGroup.add(new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 32, 0.12, 6)), mat));
      const cone = new THREE.Mesh(keep(new THREE.ConeGeometry(0.4, 0.9, 10)), mat); const dir = B.clone().sub(M).normalize(); cone.position.copy(B).addScaledVector(dir, -0.4); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); tourGroup.add(cone);
    }
    tourTags = lots.map((l, i) => { const it = mkLabel(`<span style="font-size:12px">étape</span><b style="display:inline-flex;min-width:22px;height:22px;border-radius:6px;background:#0f172a;color:#fff;align-items:center;justify-content:center">${i + 1}</b>`, new THREE.Vector3(l.x, l.h + 3.4, l.z)); it.el.style.padding = '2px 3px 2px 7px'; return it; });
    tourGo();
  }
  function tourGo() { const t = S.tour, l = mlot(t.etapes[t.i][0]), n = mlot((t.etapes[t.i + 1] || t.etapes[t.i])[0]); select(l, false); const dx = Math.abs(n.x - l.x), dz = Math.abs(n.z - l.z); glide({ x: (l.x + n.x) / 2, z: (l.z + n.z) / 2 + 3, d: Math.max(fitW(dx + 18), (dz + 20) * 1.5, 55) }); setUI(); }

  // ---------- Feuilles : Aller à, Parcours, Légende
  const closeSheet = () => { sheet.hidden = true; };
  const sheetHead = (t) => `<div class="mq-sheet-head"><strong>${t}</strong><button type="button" class="mq-btn sm" data-a="close-sheet">Fermer</button></div>`;
  const lotRow = (l) => `<li><button type="button" data-a="go" data-id="${l.id}"><span>${svgIcon(l.id)}</span><span class="tx"><b>${esc(l.b.court)}${S.visited.has(l.id) ? ' <span class="seen">· vu</span>' : ''}</b><small>Rangée ${l.rang.n} · ${esc(SYMBOLES[l.id][1])}</small></span></button></li>`;
  function openList() {
    sheet.innerHTML = sheetHead(`Aller à · ${S.visited.size} / ${MLOTS.length} visités`) + COLONNES.map((c) => `<div class="mq-ghead">${badge(c.id)}${esc(c.titre)}</div><ul class="mq-list">${RANGS.flatMap((r) => (PLAN[r.id][c.id] || []).map(mlot)).map(lotRow).join('')}</ul>`).join('');
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openMenu() {
    sheet.innerHTML = sheetHead('Menu') + `<ul class="mq-list"><li><button type="button" data-a="list"><span class="tx"><b>Aller à un bâtiment</b><small>La liste, par profession</small></span></button></li><li><button type="button" data-a="tours"><span class="tx"><b>Parcours</b><small>Suivre un dossier de bâtiment en bâtiment</small></span></button></li><li><button type="button" data-a="legend"><span class="tx"><b>Légende</b><small>Colonnes, rangées, rôles, symboles</small></span></button></li></ul>`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openTours() {
    sheet.innerHTML = sheetHead('Parcours') + `<p><small>Un dossier passe de bâtiment en bâtiment ; les flèches numérotées le montrent sur la maquette. Refaites-le ensuite de mémoire.</small></p><ul class="mq-list">${(VILLE.parcours || []).map((p) => `<li><button type="button" data-a="tour" data-p="${p.id}"><span>${svgIcon(p.etapes[0][0])}</span><span class="tx"><b>${esc(p.titre)}</b><small>${p.etapes.map(([id], i) => `${i + 1}. ${esc(batiment(id).court)}`).join(' → ')}</small></span></button></li>`).join('')}</ul>`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openLegend() {
    sheet.innerHTML = sheetHead('Légende') + `<div class="mq-ghead">Les colonnes</div><ul class="mq-list">${COLONNES.map((c) => `<li><button type="button" style="cursor:auto">${badge(c.id)}<span class="tx"><b>${esc(c.titre)}</b><small>${c.id === 'ec' ? 'toit à deux pans, badge plein' : c.id === 'cac' ? 'couronne de verre, badge en pointillé' : 'colonnade (dôme à l’international), badge à double trait'}</small></span></button></li>`).join('')}</ul>
      <div class="mq-ghead">Les rangées, du premier plan au fond</div><ul class="mq-list">${RANGS.map((r) => `<li><button type="button" data-a="row" data-n="${r.n}"><b style="display:inline-flex;width:26px;height:26px;border-radius:50%;background:#0f172a;color:#fff;align-items:center;justify-content:center;flex-shrink:0">${r.n}</b><span class="tx"><b>${esc(r.nom)}</b><small>${Object.values(PLAN[r.id]).flat().map((id) => esc(batiment(id).court)).join(' · ')}</small></span></button></li>`).join('')}</ul>
      <div class="mq-ghead">Les rôles dans les salles</div><ul class="mq-list">${Object.entries(ROLES).map(([k, [n, a]]) => `<li><button type="button" style="cursor:auto">${figureSvg(k)}<span class="tx"><b>${esc(n)}</b><small>${esc(a)}</small></span></button></li>`).join('')}</ul>
      <div class="mq-ghead">Les symboles des façades</div>${COLONNES.map((c) => `<p style="margin:10px 0 0">${badge(c.id)} <b>${esc(c.titre)}</b></p><ul class="mq-list">${MLOTS.filter((l) => l.col === c.id).map(lotRow).join('')}</ul>`).join('')}`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }

  // ---------- Commandes
  root.addEventListener('click', (e) => {
    const lb = e.target.closest('.mq-lb'); if (lb && lb.dataset.id) { const l = mlot(lb.dataset.id); if (S.sel === l) enter(l); else select(l); return; }
    if (lb && lb.dataset.g != null && S.room) return focusGroup(Number(lb.dataset.g));
    const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a;
    if (a === 'menu') openMenu(); else if (a === 'list') openList(); else if (a === 'tours') openTours(); else if (a === 'legend') openLegend(); else if (a === 'close-sheet') closeSheet();
    else if (a === 'go') { closeSheet(); const l = mlot(t.dataset.id); if (S.scene === 'room') { exit(); setTimeout(() => select(l), 300); } else select(l); }
    else if (a === 'row') { closeSheet(); glide({ x: 0, z: rowZ(Number(t.dataset.n)) + 1, d: 60 }); }
    else if (a === 'enter' && S.sel) enter(S.sel); else if (a === 'exit') exit();
    else if (a === 'tab') { S.tab = S.tab === t.dataset.t ? null : t.dataset.t; S.group = null; if (S.room) for (const it of S.room.labels) it.el.classList.remove('sel'); setUI(); }
    else if (a === 'close-drawer') { S.tab = null; S.group = null; if (S.room) for (const it of S.room.labels) it.el.classList.remove('sel'); setUI(); }
    else if (a === 'group') focusGroup(Number(t.dataset.i));
    else if (a === 'tour') startTour(t.dataset.p);
    else if (a === 'tour-next') { if (S.tour.i + 1 < S.tour.etapes.length) { S.tour.i++; tourGo(); } else { S.tour = null; clearTour(); setUI(); } }
    else if (a === 'tour-prev') { if (S.tour.i) { S.tour.i--; tourGo(); } }
    else if (a === 'tour-stop') { S.tour = null; clearTour(); setUI(); }
    else if (a === 'vue') { S.vue = t.dataset.v; select(null, false); glide(cityHome(S.vue)); }
    else if (a === 'zin') zoomBy(0.7); else if (a === 'zout') zoomBy(1.43);
    else if (a === 'home') { if (S.scene === 'room') { S.group = null; setUI(); glide(S.room.home); } else { select(null, false); S.vue = 'tout'; setUI(); glide(cityHome('tout')); } }
    else if (a === 'fiche') opts.onFiche?.(t.dataset.f);
    else if (a === 'quit') opts.onQuit?.();
  });
  // Glisser : la maquette suit le doigt, sans inertie ; pincer : zoom ; toucher bref : choisir.
  const ray = new THREE.Raycaster(), ptrs = new Map(); let gest = null;
  const worldPerPx = () => 2 * S.cam.d * Math.tan(FOV * Math.PI / 360) / H;
  canvas.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    S.anim = null;
    if (ptrs.size === 1) gest = { id: e.pointerId, x0: e.clientX, y0: e.clientY, cx: S.cam.x, cz: S.cam.z, t: performance.now(), moved: false };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), cd: S.cam.d, moved: true }; }
    hintEl.style.opacity = '0';
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p || !gest) return; p.x = e.clientX; p.y = e.clientY;
    if (gest.pinch) { if (ptrs.size < 2) return; const [a, b] = [...ptrs.values()]; S.cam.d = gest.cd * gest.d0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)); applyCam(); return; }
    if (e.pointerId !== gest.id) return;
    const dx = e.clientX - gest.x0, dy = e.clientY - gest.y0; if (!gest.moved && Math.hypot(dx, dy) < 8) return; gest.moved = true;
    const k = worldPerPx(); S.cam.x = gest.cx - dx * k; S.cam.z = gest.cz - dy * k / Math.sin(PITCH); applyCam();
  });
  const endPtr = (e) => {
    const g = gest; ptrs.delete(e.pointerId);
    if (ptrs.size === 0) gest = null; else if (g?.pinch && ptrs.size === 1) { const [[id, p]] = [...ptrs.entries()]; gest = { id, x0: p.x, y0: p.y, cx: S.cam.x, cz: S.cam.z, t: performance.now(), moved: true }; }
    if (e.type !== 'pointerup' || !g || g.pinch || g.moved || g.id !== e.pointerId) return;
    const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (S.scene === 'room') { const ms = S.room.people.map((p) => p.mesh), hit = ray.intersectObjects(ms, true)[0]; if (!hit) return; let o = hit.object; while (o.parent && !ms.includes(o)) o = o.parent; const p = S.room.people.find((q) => q.mesh === o); if (p) focusGroup(S.room.groups.indexOf(p.g)); return; }
    const hit = ray.intersectObjects(pick, false)[0]; if (hit) { const l = mlot(hit.object.userData.id); if (S.sel === l) enter(l); else select(l); }
  };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); S.anim = null; S.cam.d *= 1 + Math.sign(e.deltaY) * 0.1; applyCam(); }, { passive: false });
  const onKey = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const k = e.key, st = worldPerPx() * 60;
    if (k === 'ArrowLeft') S.cam.x -= st; else if (k === 'ArrowRight') S.cam.x += st; else if (k === 'ArrowUp') S.cam.z -= st; else if (k === 'ArrowDown') S.cam.z += st;
    else if (k === '+') zoomBy(0.7); else if (k === '-') zoomBy(1.43); else if (k === 'Escape') { if (!sheet.hidden) closeSheet(); else if (S.scene === 'room') exit(); else select(null, false); } else return;
    e.preventDefault(); applyCam();
  };
  window.addEventListener('keydown', onKey);

  // ---------- Boucle : on ne redessine que si quelque chose bouge.
  let alive = true, visible = true;
  const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; }); io.observe(root);
  function loop(now) {
    if (!alive) return; requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (S.anim) { const a = S.anim, k = ease(Math.min(1, (now - a.t0) / a.dur)); for (const key of ['x', 'z', 'd']) S.cam[key] = a.from[key] + (a.to[key] - a.from[key]) * k; if (k >= 1) S.anim = null; applyCam(); }
    if (!dirty) return; dirty = false;
    renderer.render(S.scene === 'room' ? S.room.scene : city, camera);
    if (S.scene === 'room') { place(S.room.labels); return; }
    const ppw = W / (2 * S.cam.d * TANF * (W / H)), chip = SLOT * ppw < 42 || S.vue === 'tout', compact = !chip && SLOT * ppw < 110, north = S.cam.z < ZB;
    layer.style.setProperty('--mw', `${Math.max(48, SLOT * ppw - 8).toFixed(0)}px`);
    for (const it of blabels) { it.el.classList.toggle('chip', chip); it.el.classList.toggle('compact', compact); it.off = !S.tour && it.lot !== S.sel && ((S.vue !== 'tout' && it.lot.nord !== north) || (S.vue === 'ec' && it.lot.b.rive === 'cac') || (S.vue === 'cac' && it.lot.b.rive === 'ec')); }
    for (const it of blabels) it.pos.z = it.lot.z + BD / 2 + 0.6 + (compact || chip ? it.lot.alt * (chip ? 1.6 : 2.6) : 0);
    place(blabels.concat(tourTags), chip || compact);
    for (const t of colTags) t.el.classList.toggle('short', chip);
    // Repères collés aux bords : rangées à gauche (à la hauteur de leur rangée), colonnes en haut (au-dessus de leur colonne).
    for (const t of rowTags) { vP.set(-GUT + 0.4, 0, rowZ(t.r.n) - 1.2).project(camera); const y = (1 - vP.y) / 2 * H, x = Math.max(4, (vP.x + 1) / 2 * W); t.el.classList.toggle('short', (vP.x + 1) / 2 * W + (GUT - ZX) * ppw < 130); t.el.hidden = y < uiTop + 34 || y > H - 20 || x > W - 60; if (!t.el.hidden) t.el.style.transform = `translate3d(${x.toFixed(0)}px,${(y - 13).toFixed(0)}px,0)`; }
    for (const t of colTags) { if (t.c.nord !== north) { t.el.hidden = true; continue; } vP.set(t.c.x, 0, S.cam.z).project(camera); const x = (vP.x + 1) / 2 * W, w = t.el.offsetWidth || 120; t.el.hidden = x < -w / 2 || x > W + w / 2; if (!t.el.hidden) t.el.style.transform = `translate3d(${clamp(x - w / 2, 4, W - w - 4).toFixed(0)}px,${(uiTop + 4).toFixed(0)}px,0)`; }
  }
  resize(); S.vue = 'face'; S.cam = cityHome('face'); applyCam(); setUI(); setTimeout(() => { hintEl.style.opacity = '0'; }, 5000);
  ro.observe($('.mq-ui'));
  requestAnimationFrame(loop);

  return {
    stop() { alive = false; ro.disconnect(); io.disconnect(); window.removeEventListener('keydown', onKey); for (const r of rooms.values()) r.scene.clear(); city.clear(); for (const d of disposables) { try { d.dispose(); } catch { /* ignore */ } } renderer.dispose(); },
    goto(id) { const l = mlot(id); if (l) select(l); },
    enter(id) { const l = mlot(id); if (l) enter(l); },
    state: S,
  };
}
