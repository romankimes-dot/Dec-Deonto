// Moteur de gamification : statistiques agrégées, catalogue de badges, grades de carrière.
// Logique pure (aucun accès au DOM), importable dans les tests Node.
import { ANECDOTES, QBADGES } from './catalog-data.js';
import { isCounted } from './exam.js';

export const STATS_VERSION = 1;
// Jour de l'épreuve par défaut (tests, ou contexte construit sans date) : 10 novembre 2026, 10 h 30.
export const DEFAULT_EXAM_DAY = '2026-11-10';
export const DEFAULT_EXAM_MIN = 10 * 60 + 30;

export const RARITIES = {
  commun: { label: 'Commun', color: '#64748b', rank: 0 },
  rare: { label: 'Rare', color: '#0e7490', rank: 1 },
  epique: { label: 'Épique', color: '#7c3aed', rank: 2 },
  legendaire: { label: 'Légendaire', color: '#d97706', rank: 3 },
};

export const FAMILIES = [
  { id: 'couverture', label: 'J’ai tout vu', icon: '📂' },
  { id: 'series', label: 'Séries', icon: '🔥' },
  { id: 'maitrise', label: 'Maîtrise', icon: '🎓' },
  { id: 'repassage', label: 'Repassage', icon: '🔁' },
  { id: 'anecdotes', label: 'Carrière', icon: '📸' },
  { id: 'questions', label: 'Chiffres et pièges', icon: '🎯' },
  { id: 'ecoute', label: 'Écoute', icon: '🎧' },
  { id: 'caches', label: 'Cachés', icon: '❓' },
];

export const THEME_KEYS = [
  ['EC', 'exercice', 'Exercice EC'], ['EC', 'deontologie', 'Déontologie EC'], ['EC', 'controle_qualite', 'Contrôle qualité EC'], ['EC', 'responsabilite', 'Responsabilité EC'],
  ['CAC', 'exercice', 'Exercice CAC'], ['CAC', 'deontologie', 'Déontologie CAC'], ['CAC', 'controle_qualite', 'Contrôle d’activité CAC'], ['CAC', 'responsabilite', 'Responsabilité CAC'],
];
export const TRANSVERSAL_TAGS = ['lcb_ft', 'secret_professionnel'];

export const TAG_LABELS = {
  referentiel_normatif: 'Référentiel normatif', missions_assurance: 'Missions d’assurance', lettre_mission: 'Lettre de mission EC',
  honoraires: 'Honoraires EC', publicite_demarchage: 'Publicité et démarchage', secret_professionnel: 'Secret professionnel',
  incompatibilites_activites: 'Activités interdites EC', societes_ec_capital: 'Sociétés d’expertise comptable', ordre_organisation: 'L’Ordre',
  inscription_tableau: 'Inscription au tableau', discipline_sanctions: 'Discipline et sanctions', responsabilite_civile: 'Responsabilité civile',
  responsabilite_penale: 'Responsabilité pénale', lcb_ft: 'Lutte anti-blanchiment', controle_qualite: 'Contrôle qualité OEC',
  devoir_conseil: 'Devoir de conseil', confraternite_reprise_dossier: 'Confraternité et reprise de dossier', formation: 'Formation',
  delegation_signature: 'Délégation et signature', personnes_physiques: 'Personnes physiques', loi_pacte: 'Loi Pacte', missions_legales: 'Missions légales',
  h2a_supervision: 'H2A et supervision', cncc_crcc_organisation: 'CNCC et CRCC', inscription_liste: 'Inscription sur la liste CAC',
  nomination_seuils: 'Nomination et seuils', mandat_duree_cessation: 'Mandat et cessation', demission_revocation: 'Démission et révocation',
  honoraires_bareme: 'Barème d’heures', lettre_mission_nep210: 'Lettre de mission CAC', independance_situations_risque: 'Indépendance et situations à risque',
  incompatibilites_liens: 'Incompatibilités et liens', reseau: 'Réseau', services_interdits_eip: 'Services interdits EIP', eip: 'Entités d’intérêt public',
  co_commissariat: 'Co-commissariat', non_immixtion: 'Non-immixtion', revelation_procureur: 'Révélation au procureur', controle_activite: 'Contrôle d’activité H2A',
  prestations_declaration_activite: 'Prestations et déclaration d’activité', agp_associations: 'Associations et générosité publique', delit_entrave: 'Délit d’entrave',
  code_deontologie_structure: 'Code de déontologie CAC', nep: 'Normes d’exercice professionnel', durabilite_csrd: 'Durabilité (CSRD)', alpe_petites_entreprises: 'Mission ALPE',
};

// ---------- Dates ----------
export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayNum(key) { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; }
function keyFromNum(n) { const d = new Date(n * 86400000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
function weekday(key) { return new Date(dayNum(key) * 86400000).getUTCDay(); } // 0 = dimanche
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function frDate(key, year = false) { const [y, m, d] = key.split('-').map(Number); return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]}${year ? ` ${y}` : ''}`; }

// Épreuve : jour (AAAA-MM-JJ), veille, et heure de début en minutes depuis minuit (« Jour J » : ouvrir l'app avant).
export function examInfo(day = DEFAULT_EXAM_DAY, min = DEFAULT_EXAM_MIN) {
  return { day, eve: keyFromNum(dayNum(day) - 1), min };
}

// ---------- Contexte (dérivé de la banque) ----------
export function buildContext(bank, exam = examInfo()) {
  const qs = bank.questions;
  const ids = (f) => qs.filter(f).map((q) => q.id);
  const themes = {};
  for (const [p, t, label] of THEME_KEYS) themes[`${p}:${t}`] = { label, prof: p, ids: ids((q) => q.profession === p && q.theme === t) };
  themes.transversal = { label: 'Transversal (LAB et secret)', prof: 'X', ids: ids((q) => q.tags.some((x) => TRANSVERSAL_TAGS.includes(x))) };
  const tags = {};
  for (const q of qs) for (const tg of q.tags) (tags[tg] = tags[tg] || []).push(q.id);
  const known = new Set(qs.map((q) => q.id));
  const hardList = new Set();
  for (const b of QBADGES) for (const id of b.ids) if (known.has(id)) hardList.add(id);
  for (const q of qs) if (q.confidence === 'low') hardList.add(q.id);
  return {
    all: qs.map((q) => q.id), ec: ids((q) => q.profession === 'EC'), cac: ids((q) => q.profession === 'CAC'),
    themes, tags, hardList, known, exam,
  };
}

// ---------- Statistiques agrégées ----------
export function emptyStats() {
  return {
    v: STATS_VERSION, q: {}, streak: { cur: 0, best: 0, hard: 0, hardBest: 0 },
    days: {}, offlineDays: {}, lastDay: null, exams: [], flags: {}, lastT: 0,
  };
}

export function isHard(ctx, stats, id) {
  return ctx.hardList.has(id) || ((stats.q[id] && stats.q[id].ko) || 0) >= 2;
}

// Enregistre une réponse. ev = { id, ok, t, off }
export function applyAnswer(stats, ev, ctx) {
  const day = dayKey(ev.t);
  const hard = isHard(ctx, stats, ev.id);
  const q = stats.q[ev.id] || (stats.q[ev.id] = { seen: 0, ok: 0, ko: 0, seenDays: [], okDays: [], last: null, failed: false, recDays: [], recovered: false });
  q.seen += 1;
  if (!q.seenDays.includes(day)) q.seenDays.push(day);
  if (ev.ok) {
    q.ok += 1;
    if (!q.okDays.includes(day)) q.okDays.push(day);
    if (q.failed && !q.recDays.includes(day)) { q.recDays.push(day); if (q.recDays.length >= 3) q.recovered = true; }
  } else {
    q.ko += 1; q.failed = true; q.recDays = [];
  }
  q.last = ev.ok ? 'ok' : 'ko';

  const s = stats.streak;
  s.cur = ev.ok ? s.cur + 1 : 0;
  s.best = Math.max(s.best, s.cur);
  if (hard) { s.hard = ev.ok ? s.hard + 1 : 0; s.hardBest = Math.max(s.hardBest, s.hard); }

  // Jours, retours, week-end, assiduité
  const f = stats.flags;
  if (stats.lastDay && stats.lastDay !== day && dayNum(day) - dayNum(stats.lastDay) >= 4) f.retour = true;
  stats.days[day] = (stats.days[day] || 0) + 1;
  if (stats.days[day] >= 100) f.centJour = true;
  if (weekday(day) === 0 && stats.days[keyFromNum(dayNum(day) - 1)]) f.weekend = true;
  let streakDays = 0;
  for (let i = 0; i < 7; i++) if ((stats.days[keyFromNum(dayNum(day) - i)] || 0) >= 10) streakDays++;
  if (streakDays === 7) f.septJours = true;
  if (ev.off) { stats.offlineDays[day] = (stats.offlineDays[day] || 0) + 1; if (stats.offlineDays[day] >= 10) f.avion = true; }
  const h = new Date(ev.t).getHours();
  if (h >= 5 && h < 7) f.leveTot = true;
  if (h >= 23 || h < 2) f.couchTard = true;
  if (day === ctx.exam.eve) f.veille = true;
  stats.lastDay = day;
  stats.lastT = Math.max(stats.lastT, ev.t);
  return stats;
}

// Enregistre un examen blanc terminé. ex = { t, mode, note, durationMs, byProf }
// Une copie répondue à moins de 50 % (rendue presque blanche) ne compte pas pour les badges.
export function applyExam(stats, ex) {
  if (!isCounted(ex)) return stats;
  const cac = ex.byProf && ex.byProf.CAC;
  stats.exams.push({ t: ex.t, mode: ex.mode, note: ex.note, durationMs: ex.durationMs || null, cacOk: !!cac && cac.max > 0 && cac.points >= cac.max });
  stats.lastT = Math.max(stats.lastT, ex.t);
  return stats;
}

// Ouverture de l'app (pour « Jour J ») : le jour de l'épreuve, avant son heure de début.
// Podcasts écoutés (progress.podcasts : id -> { pos, done, t }) : stats.pc[id] = jour de la première écoute complète.
export const PC_EPISODES = 10;
export function applyListens(stats, podcasts) {
  stats.pc = stats.pc || {};
  for (const [id, p] of Object.entries(podcasts || {})) if (p?.done && !stats.pc[id]) stats.pc[id] = dayKey(p.t || Date.now());
  return stats;
}

export function applyOpen(stats, t, ctx) {
  const d = new Date(t); const ex = ctx?.exam || examInfo();
  if (dayKey(t) === ex.day && d.getHours() * 60 + d.getMinutes() < ex.min) stats.flags.jourJ = true;
  return stats;
}

// Recalcul complet depuis l'historique existant (rétroactif)
export function rebuildStats(progress, ctx) {
  const stats = emptyStats();
  const events = [
    ...(progress.attempts || []).map((a) => ({ k: 'a', t: a.t, a })),
    ...(progress.exams || []).map((e) => ({ k: 'e', t: e.t + 1, e })), // l'examen se clôt après ses réponses
  ].sort((x, y) => x.t - y.t);
  for (const ev of events) {
    if (ev.k === 'a') { if (ctx.known.has(ev.a.id)) applyAnswer(stats, { id: ev.a.id, ok: !!ev.a.ok, t: ev.a.t, off: ev.a.off }, ctx); }
    else applyExam(stats, ev.e);
  }
  applyListens(stats, progress.podcasts);
  // L'historique est tronqué (400 réponses) : les statistiques déjà acquises ne doivent pas reculer.
  return progress.stats ? mergeStats(stats, progress.stats) : stats;
}

// Fusionne des statistiques recalculées avec les précédentes (autre version, historique plus long) :
// compteurs et records au maximum, jours et drapeaux réunis, examens absents ajoutés.
export function mergeStats(stats, prev) {
  if (!prev || typeof prev !== 'object') return stats;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const union = (a, b) => [...new Set([...(a || []), ...(Array.isArray(b) ? b : [])])].sort();
  for (const [id, p] of Object.entries(prev.q || {})) {
    if (!p || typeof p !== 'object') continue;
    const q = stats.q[id];
    if (!q) { stats.q[id] = { seen: 0, ok: 0, ko: 0, seenDays: [], okDays: [], last: null, failed: false, recDays: [], recovered: false, ...p }; continue; }
    q.seen = Math.max(q.seen, num(p.seen)); q.ok = Math.max(q.ok, num(p.ok)); q.ko = Math.max(q.ko, num(p.ko));
    q.seenDays = union(q.seenDays, p.seenDays); q.okDays = union(q.okDays, p.okDays);
    q.failed = q.failed || !!p.failed; q.recovered = q.recovered || !!p.recovered;
  }
  const s = stats.streak, ps = prev.streak || {};
  s.best = Math.max(s.best, num(ps.best)); s.hardBest = Math.max(s.hardBest, num(ps.hardBest));
  for (const k of ['days', 'offlineDays']) for (const [d, n] of Object.entries(prev[k] || {})) stats[k][d] = Math.max(stats[k][d] || 0, num(n));
  for (const [f, v] of Object.entries(prev.flags || {})) if (v) stats.flags[f] = true;
  for (const [id, d] of Object.entries(prev.pc || {})) if (typeof d === 'string' && (!stats.pc?.[id] || d < stats.pc[id])) (stats.pc = stats.pc || {})[id] = d;
  const ts = new Set(stats.exams.map((e) => e.t));
  for (const e of Array.isArray(prev.exams) ? prev.exams : []) if (e && !ts.has(e.t)) stats.exams.push(e);
  stats.exams.sort((a, b) => a.t - b.t);
  if (typeof prev.lastDay === 'string' && (!stats.lastDay || prev.lastDay > stats.lastDay)) stats.lastDay = prev.lastDay;
  stats.lastT = Math.max(stats.lastT, num(prev.lastT));
  return stats;
}

// ---------- Prédicats ----------
const Q = (st, id) => st.q[id];
const seen = (st, id) => !!Q(st, id) && Q(st, id).seen > 0;
const okOnce = (st, id) => !!Q(st, id) && Q(st, id).ok > 0;
const okTwoDays = (st, id) => !!Q(st, id) && Q(st, id).okDays.length >= 2;
const seenTwoDays = (st, id) => !!Q(st, id) && Q(st, id).seenDays.length >= 2;
const count = (ids, fn) => ids.reduce((n, id) => n + (fn(id) ? 1 : 0), 0);
const all = (ids, fn) => ({ cur: count(ids, fn), max: ids.length });

export function themeMastery(st, ids) {
  let ok = 0, ko = 0;
  for (const id of ids) { const q = Q(st, id); if (q) { ok += q.ok; ko += q.ko; } }
  const cur = count(ids, (id) => okTwoDays(st, id));
  const rate = ok + ko ? ok / (ok + ko) : 0;
  return { cur, max: ids.length, rate, done: ids.length > 0 && cur === ids.length && rate >= 0.9 };
}

// ---------- Catalogue ----------
export function buildCatalog(ctx) {
  const B = [];
  const add = (b) => { B.push({ hidden: false, prop: null, ...b }); };

  // Famille 1 — Couverture
  const pct = (p) => (st) => { const c = count(ctx.all, (id) => seen(st, id)); return { cur: c, max: Math.ceil((ctx.all.length * p) / 100) }; };
  add({ id: 'cov-1', family: 'couverture', rarity: 'commun', name: 'Premier dossier ouvert', desc: 'Le classeur est vide, mais il a une étiquette.', cond: '1 question vue', prop: 'folder1', check: (st) => ({ cur: Math.min(1, count(ctx.all, (id) => seen(st, id))), max: 1 }) });
  add({ id: 'cov-25', family: 'couverture', rarity: 'commun', name: 'Le quart du cabinet', desc: 'Vous connaissez déjà un dossier client sur quatre.', cond: '25 % de la banque vue', prop: 'folders2', check: pct(25) });
  add({ id: 'cov-50', family: 'couverture', rarity: 'rare', name: 'Mi-parcours', desc: 'Comme une situation intermédiaire : cohérente et vraisemblable.', cond: '50 % de la banque vue', prop: 'folders4', check: pct(50) });
  add({ id: 'cov-75', family: 'couverture', rarity: 'rare', name: 'Les trois quarts', desc: 'Il ne reste que les dossiers que personne ne veut prendre.', cond: '75 % de la banque vue', prop: 'shelf75', check: pct(75) });
  add({ id: 'cov-100', family: 'couverture', rarity: 'epique', name: 'J’ai tout vu', desc: 'Plus aucune question ne vous surprend. Enfin, presque.', cond: '100 % de la banque vue', prop: 'shelfFull', check: pct(100) });
  add({ id: 'cov-ec', family: 'couverture', rarity: 'rare', name: 'Tout le Tableau', desc: 'Toutes les questions d’expertise comptable sont passées entre vos mains.', cond: '100 % des questions EC vues', prop: 'binderOec', check: (st) => all(ctx.ec, (id) => seen(st, id)) });
  add({ id: 'cov-cac', family: 'couverture', rarity: 'rare', name: 'Toute la Liste', desc: 'Toutes les questions CAC, H2A comprise.', cond: '100 % des questions CAC vues', prop: 'codeRouge', check: (st) => all(ctx.cac, (id) => seen(st, id)) });
  add({ id: 'cov-lab', family: 'couverture', rarity: 'rare', name: 'Tracfin n’a qu’à bien se tenir', desc: 'Toutes les questions de lutte anti-blanchiment, EC et CAC.', cond: '100 % des questions LAB vues', prop: 'loupe', check: (st) => all(ctx.tags.lcb_ft || [], (id) => seen(st, id)) });
  add({ id: 'cov-secret', family: 'couverture', rarity: 'rare', name: 'Coffre-fort', desc: 'Toutes les questions de secret professionnel.', cond: '100 % des questions de secret professionnel vues', prop: 'coffre', check: (st) => all(ctx.tags.secret_professionnel || [], (id) => seen(st, id)) });
  for (const [p, t, label] of THEME_KEYS) {
    const k = `${p}:${t}`;
    add({ id: `cov-th-${p}-${t}`, family: 'couverture', rarity: 'commun', name: `${label} vu`, desc: `Tout le thème ${label.toLowerCase()} est passé sous vos yeux.`, cond: `100 % des questions « ${label} » vues`, prop: 'intercalaires', check: (st) => all(ctx.themes[k].ids, (id) => seen(st, id)) });
  }
  const tagIds = Object.keys(ctx.tags).sort();
  for (const tg of tagIds) {
    add({ id: `cov-tag-${tg}`, family: 'couverture', sub: 'tags', rarity: 'commun', name: TAG_LABELS[tg] || tg, desc: 'Un autocollant de plus sur le tableau de liège.', cond: `toutes les questions « ${TAG_LABELS[tg] || tg} » vues`, prop: 'liege', check: (st) => all(ctx.tags[tg], (id) => seen(st, id)) });
  }
  add({ id: 'cov-tags-all', family: 'couverture', rarity: 'epique', name: 'Collectionneur d’autocollants', desc: 'Tous les sous-thèmes, sans exception.', cond: `les ${tagIds.length} badges de sous-thème`, prop: 'liegeFull', check: (st) => ({ cur: count(tagIds, (tg) => ctx.tags[tg].every((id) => seen(st, id))), max: tagIds.length }) });

  // Famille 2 — Séries
  const streak = (n) => (st) => ({ cur: Math.min(n, st.streak.best), max: n });
  add({ id: 'ser-1', family: 'series', rarity: 'commun', name: 'Première écriture passée', desc: 'Débit, crédit, équilibre.', cond: '1 bonne réponse', check: streak(1) });
  add({ id: 'ser-3', family: 'series', rarity: 'commun', name: 'Trois sur trois', desc: 'Le triplé du contrôleur de stage.', cond: '3 bonnes réponses d’affilée', prop: 'postit', check: streak(3) });
  add({ id: 'ser-5', family: 'series', rarity: 'commun', name: 'Main chaude', desc: 'Cinq d’affilée, le café n’a pas encore refroidi.', cond: '5 d’affilée', prop: 'tasse', check: streak(5) });
  add({ id: 'ser-10', family: 'series', rarity: 'rare', name: 'Sans réserve', desc: 'Dix réponses justes : opinion favorable sans observation.', cond: '10 d’affilée', prop: 'tampon', check: streak(10) });
  add({ id: 'ser-20', family: 'series', rarity: 'epique', name: 'Image fidèle', desc: 'Vingt d’affilée, un examen blanc complet sans faute.', cond: '20 d’affilée', prop: 'cadre20', check: streak(20) });
  add({ id: 'ser-30', family: 'series', rarity: 'epique', hidden: true, hint: 'Plus loin que vingt.', name: 'Commissaire à la constance', desc: 'Trente d’affilée.', cond: '30 d’affilée', check: streak(30) });
  add({ id: 'ser-50', family: 'series', rarity: 'legendaire', hidden: true, hint: 'Un mandat entier sans erreur.', name: 'Mandat de six exercices… sans une erreur', desc: 'Cinquante d’affilée.', cond: '50 d’affilée', prop: 'trophee', check: streak(50) });

  // Famille 3 — Maîtrise
  const MAST = {
    'EC:exercice': ['L’ordonnance de 1945 n’a plus de secret.', 'diplomeExercice'],
    'EC:deontologie': ['Probité, conscience, et un peu de patience.', 'balance'],
    'EC:controle_qualite': ['Vous pourriez contrôler le contrôleur.', 'checklist'],
    'EC:responsabilite': ['Civile, pénale, disciplinaire : vous savez qui vient sonner.', 'parapluie'],
    'CAC:exercice': ['Seuils, mandats, barème : tout est dans la tête.', 'diplomeCac'],
    'CAC:deontologie': ['Tiers objectif, raisonnable et informé : c’est vous.', 'bouclier'],
    'CAC:controle_qualite': ['Le contrôleur H2A repart avec le sourire.', 'lampe'],
    'CAC:responsabilite': ['La commission des sanctions ne vous connaît pas.', 'cadenas'],
    transversal: ['LAB et secret professionnel, des deux côtés.', 'coffreOuvert'],
  };
  for (const [k, th] of Object.entries(ctx.themes)) {
    add({ id: `mast-${k.replace(':', '-')}`, family: 'maitrise', rarity: 'epique', name: `Maîtrise — ${th.label}`, desc: MAST[k][0], cond: '≥ 90 % de réussite et chaque question réussie 2 fois, 2 jours différents', prop: MAST[k][1], theme: k, check: (st) => themeMastery(st, th.ids) });
  }
  const mastered = (st, keys) => count(keys, (k) => themeMastery(st, ctx.themes[k].ids).done);
  const ecKeys = THEME_KEYS.filter((x) => x[0] === 'EC').map((x) => `${x[0]}:${x[1]}`);
  const cacKeys = THEME_KEYS.filter((x) => x[0] === 'CAC').map((x) => `${x[0]}:${x[1]}`);
  add({ id: 'mast-bloc-ec', family: 'maitrise', rarity: 'legendaire', name: 'Bloc EC maîtrisé', desc: 'Prêt pour les questions 1 à 10.', cond: 'les 4 thèmes EC maîtrisés', prop: 'grandDiplome', check: (st) => ({ cur: mastered(st, ecKeys), max: 4 }) });
  add({ id: 'mast-bloc-cac', family: 'maitrise', rarity: 'legendaire', name: 'Bloc CAC maîtrisé', desc: 'Prêt pour les questions 11 à 20, celles qui font chuter la moyenne.', cond: 'les 4 thèmes CAC maîtrisés', prop: 'carteCacCadre', check: (st) => ({ cur: mastered(st, cacKeys), max: 4 }) });
  add({ id: 'mast-total', family: 'maitrise', rarity: 'legendaire', name: 'Maîtrise totale', desc: '20/20 n’est plus une hypothèse d’école.', cond: 'les 9 thèmes maîtrisés', prop: 'murIllumine', check: (st) => ({ cur: mastered(st, Object.keys(ctx.themes)), max: Object.keys(ctx.themes).length }) });

  // Famille 4 — Repassage
  for (const [k, th] of Object.entries(ctx.themes)) {
    const slug = k.replace(':', '-');
    add({ id: `rep-lect-${slug}`, family: 'repassage', rarity: 'commun', name: `Deuxième lecture — ${th.label}`, desc: 'Une revue de dossier, comme le prévoit la NPMQ.', cond: 'chaque question du thème vue 2 jours différents', prop: 'stylo', check: (st) => all(th.ids, (id) => seenTwoDays(st, id)) });
    add({ id: `rep-sain-${slug}`, family: 'repassage', rarity: 'rare', name: `Dossier assaini — ${th.label}`, desc: 'Plus aucun point en suspens dans ce thème.', cond: 'toutes les questions vues et aucune dont la dernière réponse est fausse', prop: 'bannetteVide', check: (st) => all(th.ids, (id) => seen(st, id) && Q(st, id).last === 'ok') });
  }
  const recovered = (st) => count(ctx.all, (id) => Q(st, id) && Q(st, id).recovered);
  add({ id: 'rep-revue-1', family: 'repassage', rarity: 'rare', name: 'Revue indépendante', desc: 'Ratée, puis juste trois fois. Le réviseur est convaincu.', cond: 'une question ratée puis réussie 3 fois, sur 3 jours distincts', prop: 'lunettes', check: (st) => ({ cur: Math.min(1, recovered(st)), max: 1 }) });
  add({ id: 'rep-revue-10', family: 'repassage', rarity: 'epique', name: 'Revue indépendante en série', desc: 'Dix questions ratées, dix questions rattrapées.', cond: '10 questions rattrapées ainsi', prop: 'bannetteRevu', check: (st) => ({ cur: Math.min(10, recovered(st)), max: 10 }) });
  add({ id: 'rep-pass-2', family: 'repassage', rarity: 'rare', name: 'Deuxième passage complet', desc: 'Toute la banque, deux fois.', cond: 'chaque question vue au moins 2 fois', prop: 'calendrier', check: (st) => all(ctx.all, (id) => seen(st, id) && Q(st, id).seen >= 2) });
  add({ id: 'rep-pass-3', family: 'repassage', rarity: 'epique', name: 'Troisième passage complet', desc: 'La banque se lit comme un code de poche.', cond: 'chaque question vue au moins 3 fois', prop: 'codePoche', check: (st) => all(ctx.all, (id) => seen(st, id) && Q(st, id).seen >= 3) });

  // Famille 5 — Anecdotes
  for (const a of ANECDOTES) {
    const ids = a.ids.filter((id) => ctx.known.has(id));
    const check = a.special === 'blocs'
      ? (st) => ({ cur: count(['EC', 'CAC'], (p) => mastered(st, p === 'EC' ? ecKeys : cacKeys) === 4), max: 2 })
      : (st) => all(ids, (id) => okOnce(st, id));
    add({ id: `anec-${a.id}`, family: 'anecdotes', rarity: a.rarity, name: a.title, desc: a.text, part: a.part, ids, anecdote: a.id, cond: a.special === 'blocs' ? 'Bloc EC et Bloc CAC maîtrisés' : `réussir ${ids.length === 1 ? 'la question' : `les ${ids.length} questions`} liée${ids.length > 1 ? 's' : ''}`, check });
  }

  // Famille 6 — Badges de questions (et version or)
  for (const b of QBADGES) {
    const ids = b.ids.filter((id) => ctx.known.has(id));
    add({ id: b.id, family: 'questions', rarity: b.rarity, name: b.title, desc: b.desc, ids, cond: `réussir les ${ids.length} questions`, prop: b.id === 'q-le-gardien-des-delais' ? 'horloge' : null, check: (st) => all(ids, (id) => okOnce(st, id)) });
    add({ id: `${b.id}-or`, family: 'questions', rarity: b.rarity === 'commun' ? 'rare' : b.rarity === 'rare' ? 'epique' : 'legendaire', gold: true, name: `${b.title} (or)`, desc: `${b.desc} Deux fois, deux jours différents.`, ids, cond: 'chaque question réussie 2 jours différents', check: (st) => all(ids, (id) => okTwoDays(st, id)) });
  }

  // Famille 7 — Écoute (podcasts écoutés à 90 %)
  const listened = (st) => Object.keys(st.pc || {}).length;
  const sameDay = (st) => Math.max(0, ...Object.values(Object.values(st.pc || {}).reduce((m, d) => ({ ...m, [d]: (m[d] || 0) + 1 }), {})));
  const L = (id, rarity, name, desc, cond, check) => add({ id, family: 'ecoute', rarity, name, desc, cond, check });
  L('pc-1', 'commun', 'Premier entretien', 'Un épisode écouté jusqu’au bout.', '1 épisode écouté (90 %)', (st) => ({ cur: Math.min(1, listened(st)), max: 1 }));
  L('pc-3', 'rare', 'Auditeur assidu', 'Trois épisodes, trois étapes du parcours en audio.', '3 épisodes écoutés', (st) => ({ cur: Math.min(3, listened(st)), max: 3 }));
  L('pc-jour', 'rare', 'Aller-retour', 'Un épisode à l’aller, un au retour.', '2 épisodes écoutés le même jour', (st) => ({ cur: Math.min(2, sameDay(st)), max: 2 }));
  L('pc-rapide', 'rare', 'Lecture accélérée', 'Le jury parle vite, vous aussi.', 'un épisode terminé à 1,5× ou plus', (st) => ({ cur: st.flags.pcRapide ? 1 : 0, max: 1 }));
  L('pc-tous', 'epique', 'L’intégrale du parcours', 'Les dix épisodes, de bout en bout.', `les ${PC_EPISODES} épisodes écoutés`, (st) => ({ cur: Math.min(PC_EPISODES, listened(st)), max: PC_EPISODES }));

  // Famille 8 — Cachés
  const flag = (k) => (st) => ({ cur: st.flags[k] ? 1 : 0, max: 1 });
  const exams = (fn) => (st) => ({ cur: st.exams.some(fn) ? 1 : 0, max: 1 });
  const H = (id, rarity, name, hint, cond, check, prop = null) => add({ id, family: 'caches', hidden: true, rarity, name, hint, desc: hint, cond, check, prop });
  H('hid-leve-tot', 'rare', 'Avant l’ouverture du cabinet', 'Le café n’est pas encore fait.', 'une réponse entre 5 h et 7 h', flag('leveTot'));
  H('hid-couche-tard', 'rare', 'Clôture tardive', 'Comme un 30 avril au soir.', 'une réponse entre 23 h et 2 h', flag('couchTard'));
  H('hid-retour', 'commun', 'De retour de congés', 'Le courrier s’est accumulé.', 'une session après au moins 3 jours sans réponse', flag('retour'));
  H('hid-cent', 'epique', 'Période fiscale', 'Mai, en cabinet.', '100 réponses dans la même journée', flag('centJour'), 'machineCafe');
  H('hid-hard20', 'legendaire', 'Sans-faute sur les dossiers sensibles', 'Vingt questions qui font peur.', '20 questions difficiles d’affilée réussies', (st) => ({ cur: Math.min(20, st.streak.hardBest), max: 20 }));
  H('hid-avion', 'commun', 'Mode avion', 'Aucune connexion, aucune excuse.', '10 réponses hors ligne dans la journée', flag('avion'));
  H('hid-weekend', 'commun', 'Week-end studieux', 'Le samedi et le dimanche.', 'des réponses un samedi et le dimanche suivant', flag('weekend'));
  H('hid-7j', 'epique', 'Sept jours sur sept', 'Une semaine sans pause.', 'au moins 10 réponses par jour, 7 jours consécutifs', flag('septJours'));
  H('hid-rattrapage', 'rare', 'Rattrapage', 'La deuxième chance existe.', 'un examen blanc < 10, puis le suivant ≥ 14', (st) => ({ cur: st.exams.some((e, i) => i > 0 && st.exams[i - 1].note < 10 && e.note >= 14) ? 1 : 0, max: 1 }));
  H('hid-mention', 'epique', 'Mention très bien', '16 et plus, en conditions réelles.', 'un examen blanc ≥ 16/20', exams((e) => e.note >= 16), 'trophee16');
  H('hid-chrono', 'epique', 'Contre la montre', 'Il reste vingt minutes.', 'examen blanc rendu en moins de 40 min avec ≥ 14/20', exams((e) => e.durationMs != null && e.durationMs < 40 * 60000 && e.note >= 14));
  H('hid-cac10', 'legendaire', 'Partie CAC parfaite', 'Les questions 11 à 20.', '10/10 sur la partie CAC d’un examen blanc', exams((e) => e.cacOk));
  const ex = ctx.exam || examInfo();
  const hm = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  H('hid-veille', 'commun', 'La veille', `Le ${frDate(ex.eve)}.`, `une session le ${frDate(ex.eve, true)}`, flag('veille'));
  H('hid-jourj', 'rare', 'Jour J', `Le ${frDate(ex.day)}, ${hm(Math.max(0, ex.min - 1))}.`, `ouvrir l’app le ${frDate(ex.day, true)} avant ${hm(ex.min)}`, flag('jourJ'));

  return B;
}

export function progressOf(badge, stats) {
  const r = badge.check(stats);
  const done = r.done !== undefined ? r.done : r.max > 0 && r.cur >= r.max;
  return { cur: r.cur, max: r.max, done, rate: r.rate };
}

// ---------- Grades ----------
export const GRADES = [
  { n: 1, name: 'Expert-comptable stagiaire, 1re année', decor: 'openspace' },
  { n: 2, name: 'Stagiaire, 2e année', decor: 'openspace' },
  { n: 3, name: 'Stagiaire, 3e année', decor: 'partage' },
  { n: 4, name: 'Mémorialiste, candidat au DEC', decor: 'partage' },
  { n: 5, name: 'Diplômé d’expertise comptable', decor: 'perso' },
  { n: 6, name: 'Expert-comptable inscrit au tableau', decor: 'perso' },
  { n: 7, name: 'Commissaire aux comptes', decor: 'perso' },
  { n: 8, name: 'Expert-comptable installé', decor: 'cabinet' },
];

export function gradeConditions(n, has, st, ctx) {
  const stageCount = count(Array.from({ length: 17 }, (_, i) => `anec-A${i + 1}`), has);
  const masteredKeys = Object.keys(ctx.themes).filter((k) => themeMastery(st, ctx.themes[k].ids).done);
  const masteredCac = masteredKeys.filter((k) => k.startsWith('CAC:')).length;
  const bestExam = st.exams.reduce((m, e) => Math.max(m, e.note), 0);
  const anyLecture = Object.keys(ctx.themes).some((k) => has(`rep-lect-${k.replace(':', '-')}`));
  const C = (label, ok) => ({ label, ok: !!ok });
  switch (n) {
    case 1: return [C('Début du stage', true)];
    case 2: return [C('Badge « Le quart du cabinet »', has('cov-25')), C(`3 anecdotes du stage (${stageCount}/3)`, stageCount >= 3), C('Une « Deuxième lecture »', anyLecture)];
    case 3: return [C('Badge « Mi-parcours »', has('cov-50')), C(`8 anecdotes du stage (${stageCount}/8)`, stageCount >= 8), C(`2 thèmes maîtrisés (${masteredKeys.length}/2)`, masteredKeys.length >= 2)];
    case 4: return [C('Badge « Les trois quarts »', has('cov-75')), C('Série de 10 (« Sans réserve »)', has('ser-10')), C(`4 thèmes maîtrisés dont 2 CAC (${masteredKeys.length}/4, CAC ${masteredCac}/2)`, masteredKeys.length >= 4 && masteredCac >= 2)];
    case 5: return [C('Badge « J’ai tout vu »', has('cov-100')), C('Bloc EC ou Bloc CAC maîtrisé', has('mast-bloc-ec') || has('mast-bloc-cac')), C(`Un examen blanc ≥ 12 (meilleur : ${bestExam})`, bestExam >= 12)];
    case 6: return [C('Anecdote « Dossier d’inscription au tableau »', has('anec-A19')), C('Anecdote « Prestation de serment »', has('anec-A20')), C(`6 thèmes maîtrisés (${masteredKeys.length}/6)`, masteredKeys.length >= 6)];
    case 7: return [C('Anecdote « Inscription sur la liste H2A »', has('anec-A44')), C('Anecdote « Serment devant la cour d’appel »', has('anec-A45')), C('Bloc CAC maîtrisé', has('mast-bloc-cac'))];
    case 8: return [C('Maîtrise totale', has('mast-total')), C('Anecdote « Création de la société »', has('anec-A23')), C('Anecdote « La plaque sur la porte »', has('anec-A24')), C(`Un examen blanc ≥ 16 (meilleur : ${bestExam})`, bestExam >= 16)];
    default: return [];
  }
}

// ---------- Évaluation ----------
// Met à jour progress.badges et progress.grades ; renvoie les nouveaux déblocages.
export function evaluate(progress, catalog, ctx, t = Date.now()) {
  const st = progress.stats;
  progress.badges = progress.badges || {};
  progress.grades = progress.grades || { 1: progress.grades?.[1] || t };
  if (!progress.grades[1]) progress.grades[1] = t;
  const fresh = { badges: [], grades: [] };
  for (const b of catalog) {
    if (progress.badges[b.id]) continue;
    if (progressOf(b, st).done) { progress.badges[b.id] = t; fresh.badges.push(b); }
  }
  const has = (id) => !!progress.badges[id];
  for (const g of GRADES) {
    if (progress.grades[g.n]) continue;
    if (!progress.grades[g.n - 1]) break;
    if (gradeConditions(g.n, has, st, ctx).every((c) => c.ok)) { progress.grades[g.n] = t; fresh.grades.push(g); }
    else break;
  }
  return fresh;
}

export function currentGrade(progress) {
  const g = progress.grades || {};
  let n = 1;
  for (const x of GRADES) if (g[x.n]) n = x.n;
  return GRADES[n - 1];
}

// Prochain badge le plus proche (pour l'accueil)
export function nextBadges(catalog, stats, unlocked, n = 3) {
  return catalog
    .filter((b) => !b.hidden && !unlocked[b.id] && !b.gold)
    .map((b) => ({ b, p: progressOf(b, stats) }))
    .filter((x) => x.p.max > 0 && x.p.cur > 0)
    .sort((a, b) => b.p.cur / b.p.max - a.p.cur / a.p.max)
    .slice(0, n);
}
