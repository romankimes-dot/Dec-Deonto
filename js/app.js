import { newCard, review, buildQueue, mastery, DAY, spreadOf, suggestGrade, confidentError, qrcPoints, calibration, confidentErrors } from './srs.js';
import * as store from './store.js';
import { loadBank, loadFichesIndex, loadFiche, renderMarkdown, inline, THEMES } from './bank.js';
import { startExam, remainingMs, finishExam, pauseExam, resumePaused, answeredCount, isCounted } from './exam.js';
import * as G from './gamify.js';
import * as P from './plan.js';
import { buildClusters } from './cluster.js';
import { recordDrill, pickDrill, drillStats } from './drill.js';
import * as GM from './games.js';
import * as PAL from './palais.js';
import { estimate, pickHeldOut } from './estimate.js';
import * as SH from './shorts.js';
import * as SC from './scenes.js';
import * as GL from './glossaire.js';
import { matchExpected, highlight } from './qrc.js';
import * as SY from './sync.js';
import * as CN from './carnet.js';
import { ic, paths } from './icons.js';
import { compositionHtml, COMPO_CSS } from './ville3d.js';
import { startMaquette, MAQUETTE_CSS } from './maquette.js';
import { planHtml, PLAN_CSS } from './villeplan.js';
import * as CA from './carte.js';
import * as CR from './career.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LETTERS = ['A', 'B', 'C', 'D'];
const GRADES = [
  { g: 0, label: 'Encore', sub: '10 min' },
  { g: 1, label: 'Difficile', sub: '' },
  { g: 2, label: 'Bien', sub: '' },
  { g: 3, label: 'Facile', sub: '' },
];

const state = {
  bank: null, byId: {}, fiches: [],
  progress: store.load(),
  view: 'home',
  session: null,  // révision en cours
  train: null,    // entraînement libre
  exam: null,     // examen blanc en cours
  examResult: null,
  timer: null,
  gctx: null, catalog: [], badgeById: {},
  celebrations: [], celebrating: false,
  careerTab: 'carriere', collFamily: 'couverture',
  notice: null, persisted: null,
  clusters: { clusterOf: {}, groups: [] }, // recoupement des annales (même notion, plusieurs sessions)
  game: null,      // jeu en cours
  gameData: null,  // items des jeux, tirés des fiches au premier accès
  palais: null,    // palais de mémoire : liste ouverte, étape
  bonusNew: false, // « 20 nouvelles de plus » demandées après le plan du jour
  nextIdx: 0, nextList: [], // « Et maintenant ? » : suggestions en boucle
  shorts: null,    // shorts de toutes les étapes (data/shorts)
  feed: null,      // fil de shorts ouvert
  gloss: [], glById: {}, glMatcher: null, // glossaire (data/glossaire.json)
  glQuery: '', glFilter: 'tout',
};

// Nouvelles cartes : le reste de l'objectif du jour (ou 20 de plus sur demande), sous-thèmes faibles en tête.
const queueOpts = () => {
  const d = ensureDaily(); const ts = P.tagStats(state.progress.attempts, state.byId);
  return {
    newLimit: state.bonusNew ? 20 : Math.max(0, d.target - (d.newDone || 0)),
    priority: P.priorityIds(state.progress.plan, state.fiches),
    weight: (q) => P.adaptiveWeight(q, ts, siblings(q.id).length),
  };
};
const examAt = () => Date.parse(state.progress.settings.examDate) || null;
// Jour de l'épreuve (AAAA-MM-JJ). Sans date saisie : parcours générique de 28 jours depuis le premier jour d'utilisation.
const examKey = () => { const pl = state.progress.plan; pl.start = pl.start || G.dayKey(Date.now()); return P.examKeyOf(state.progress.settings.examDate, pl.start); };
const examDateSet = () => !!examAt();
// Épreuve vue par les badges cachés « La veille » et « Jour J » (heure par défaut : 10 h 30).
const gameExam = () => { const m = /T(\d{2}):(\d{2})/.exec(state.progress.settings.examDate || ''); return G.examInfo(examKey(), m ? Number(m[1]) * 60 + Number(m[2]) : G.DEFAULT_EXAM_MIN); };
function refreshExamBadges() {
  state.gctx.exam = gameExam();
  state.catalog = G.buildCatalog(state.gctx);
  state.badgeById = Object.fromEntries(state.catalog.map((b) => [b.id, b]));
}
function examLabel() {
  const t = examAt(); if (!t) return 'Date d’épreuve non définie';
  const d = new Date(t); const hm = /T\d{2}:\d{2}/.test(state.progress.settings.examDate) ? ` · ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}` : '';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + hm;
}
const examDay = () => { const t = examAt(); return t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'l’épreuve'; };
// Avant l'épreuve, chaque carte revient au plus tard entre J-3 et J-1 (étalement selon l'identifiant).
const reviewOpts = (id) => ({ examAt: examAt(), spread: spreadOf(id) });
// Autres sessions où la même notion a été posée.
function siblings(id) {
  const n = state.clusters.clusterOf[id];
  return n === undefined ? [] : state.clusters.groups[n].filter((x) => x !== id);
}
function persist() {
  state.progress.updatedAt = Date.now();
  if (!store.save(state.progress)) toast('Stockage local indisponible : progression non sauvegardée');
  scheduleSync();
}

// ---------- Synchronisation en ligne (js/sync.js, cloudflare/worker.js) ----------
// Envoi au plus une fois par minute pendant le travail (quota d'écritures gratuit de Cloudflare), immédiatement quand
// l'application passe en arrière-plan ; lecture au démarrage et au retour dans l'application. La copie en ligne n'est
// appliquée ici que hors activité en cours (séance, examen, jeu, shorts) ; elle est sinon reprise à la synchro suivante.
const SYNC_DELAY = 60 * 1000;
let syncTimer = null; let syncing = null;
function scheduleSync() {
  if (syncTimer || !SY.config()) return;
  syncTimer = setTimeout(() => { syncTimer = null; runSync(); }, SYNC_DELAY);
}
const canApplySync = () => !state.exam && !state.game && !state.feed && !['review', 'train', 'exam', 'jeux'].includes(state.view);
function applySynced(remote) {
  state.progress = SY.merge(state.progress, remote);
  store.save(state.progress);
  if (state.gctx) initGamify();
}
// manual : demandé depuis Réglages (message affiché, copie appliquée) ; boot : avant le premier affichage.
function runSync({ manual = false, boot = false, timeout = 15000 } = {}) {
  const cfg = SY.config(); if (!cfg) return Promise.resolve(null);
  if (syncing) return syncing;
  clearTimeout(syncTimer); syncTimer = null;
  syncing = (async () => {
    try {
      const r = await SY.syncOnce(cfg, state.progress, { timeout });
      SY.setStatus({ at: Date.now(), error: null });
      if (r.changed && (boot || manual || canApplySync())) {
        applySynced(r.state);
        if (!boot) render();
        if (!manual && !boot) toast('Progression mise à jour depuis l’autre appareil');
      }
      if (manual) toast(r.changed ? 'Synchronisé : progression des autres appareils récupérée' : 'Synchronisé');
      if (!boot) await sendPont(cfg);
      return r;
    } catch (e) {
      SY.setStatus({ error: e.message });
      if (manual) toast('Synchronisation impossible : ' + e.message);
      return null;
    } finally {
      syncing = null;
      if (manual && state.view === 'settings') render();
    }
  })();
  return syncing;
}
// Plan du jour déposé pour Ernest, qui le récupère tout seul à sa prochaine synchro.
async function sendPont(cfg) {
  let p; try { p = ernestPayload(); } catch { return; }
  try { if (await SY.pushPont(cfg, p)) SY.setStatus({ pontAt: Date.now() }); } catch { /* réessayé à la prochaine synchro */ }
}
function watchSync() {
  document.addEventListener('visibilitychange', () => {
    if (!SY.config()) return;
    if (document.visibilityState === 'hidden') { if (syncTimer) runSync(); }
    else if (Date.now() - (SY.status().at || 0) > 30 * 1000) runSync();
  });
  window.addEventListener('online', () => { if (SY.config()) runSync(); });
}

// ---------- Gamification ----------
// Toute réponse passe par ici : historique, statistiques, badges.
function answer(id, ok, mode, { defer = false, t = Date.now(), conf = null, pick = null } = {}) {
  const att = { id, ok: !!ok, mode, t };
  if (conf !== null) att.conf = conf;
  if (Number.isInteger(pick)) att.pick = pick; // QCM : proposition choisie (index d'origine), pour la confusion EC / CAC
  if (typeof navigator !== 'undefined' && navigator.onLine === false) att.off = 1;
  const ms = takeQMs(); if (ms) att.ms = ms; // temps passé sur la question (minuteur de 3 minutes)
  store.pushAttempt(state.progress, att);
  const before = isBilan() ? G.xpOf(state.progress.stats, state.gctx, state.progress.drills).total : 0;
  G.applyAnswer(state.progress.stats, att, state.gctx);
  if (isBilan()) flyPoints(G.xpOf(state.progress.stats, state.gctx, state.progress.drills).total - before);
  if (!defer) checkBadges();
  updateStreakBadge();
}
// « +n » qui part du dernier toucher et monte vers les points du bandeau de grade.
let lastTap = null;
document.addEventListener('pointerdown', (e) => { lastTap = { x: e.clientX, y: e.clientY }; }, { passive: true });
function flyPoints(n) {
  if (!(n > 0) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = $('.g-strip__pts'); if (!to) return;
  const r = to.getBoundingClientRect();
  const from = lastTap || { x: r.left + r.width / 2, y: window.innerHeight / 2 };
  const el = document.createElement('span'); el.className = 'g-fly'; el.textContent = `+${n}`;
  el.style.left = `${from.x}px`; el.style.top = `${from.y}px`;
  document.body.appendChild(el);
  const anim = el.animate([
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    { transform: `translate(calc(-50% + ${r.left + r.width / 2 - from.x}px), calc(-50% + ${r.top + r.height / 2 - from.y}px)) scale(.7)`, opacity: .2 },
  ], { duration: 700, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  anim.onfinish = () => el.remove();
}
function checkBadges() {
  const fresh = G.evaluate(state.progress, state.catalog, state.gctx, Date.now());
  if (fresh.grades.length > 1) fresh.grades.splice(0, fresh.grades.length - 1); // rattrapage : on fête le plus haut
  persist();
  // Mode concentration : badges et souvenirs s'annoncent par un message ; seuls les grades gardent leur animation.
  if (state.progress.settings.focus) {
    if (fresh.badges.length) toast(fresh.badges.length === 1 ? fresh.badges[0].name : `${fresh.badges.length} badges débloqués`, 'medal');
    for (const g of fresh.grades) state.celebrations.push({ type: 'grade', g });
    if (state.celebrations.length) setTimeout(nextCelebration, 350);
    return;
  }
  for (const b of fresh.badges) state.celebrations.push({ type: b.family === 'anecdotes' ? 'anecdote' : 'badge', b });
  for (const g of fresh.grades) state.celebrations.push({ type: 'grade', g });
  if (state.celebrations.length) setTimeout(nextCelebration, 350);
}
function updateStreakBadge() {
  const el = $('#streak'); if (!el || !state.progress.stats) return;
  const s = state.progress.stats.streak;
  el.title = 'Bonnes réponses d’affilée : série en cours et record';
  el.innerHTML = `<span>${ic('flame')} série ${s.cur}</span><span class="muted">record ${s.best}</span>`;
}
function badgeIcon(b, locked = false) {
  const col = G.RARITIES[b.rarity].color;
  const fam = G.FAMILIES.find((f) => f.id === b.family);
  const glyph = paths(locked && b.hidden ? 'help' : fam.icon);
  return `<svg class="medal ${locked ? 'locked' : ''} ${b.gold ? 'gold' : ''}" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M12 2 h6 l2 10 h-6z M22 2 h6 l-2 10 h-6z" fill="${col}" opacity=".7"/>
    <circle cx="20" cy="24" r="14" fill="${b.gold ? '#fde68a' : '#fff'}" stroke="${col}" stroke-width="3"/>
    <svg x="13" y="17" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg></svg>`;
}
function nextCelebration() {
  if (state.celebrating) return;
  const c = state.celebrations.shift(); if (!c) return;
  state.celebrating = true;
  const box = $('#celebrate');
  const close = () => { box.classList.remove('show'); focusBack(box); state.celebrating = false; setTimeout(nextCelebration, 250); };
  let html = '';
  if (c.type === 'grade') {
    { const cs = G.careerState(state.progress.stats, state.gctx, state.progress.drills); html = CR.levelUpHtml(c.g.n, cs.readiness, cs.info.xp); }
    try { navigator.vibrate?.([60, 40, 120]); } catch { /* ignore */ }
  } else if (c.type === 'anecdote') {
    const d = new Date(state.progress.badges[c.b.id] || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    html = `<div class="memory flip"><div class="memory-date">${d}</div><div class="memory-title">${ic('camera')} ${esc(c.b.name)}</div><p class="memory-text">« ${esc(c.b.desc)} »</p><div class="muted">Souvenir débloqué · ${G.RARITIES[c.b.rarity].label}</div></div>`;
    try { navigator.vibrate?.(40); } catch { /* ignore */ }
  } else {
    const col = G.RARITIES[c.b.rarity].color;
    html = `<div class="cel-badge" style="--halo:${col}"><div class="cel-medal">${badgeIcon(c.b)}</div><div class="cel-rarity" style="color:${col}">${G.RARITIES[c.b.rarity].label}</div><h2>${esc(c.b.name)}</h2><p>${esc(c.b.desc)}</p>${c.b.prop && PROP_NAMES.has(c.b.prop) ? '<p class="muted">Un nouvel objet est apparu dans votre bureau.</p>' : ''}</div>`;
    try { navigator.vibrate?.(30); } catch { /* ignore */ }
  }
  box.innerHTML = html;
  box.classList.add('show');
  if (c.type !== 'grade') box.firstElementChild.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:12px;margin-top:12px">Touchez pour continuer</p>');
  box.onclick = close;
  box.onkeydown = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
  focusIn(box);
}
function trainOn(ids, title, mode = 'qcm') {
  const qs = ids.map((id) => state.byId[id]).filter(Boolean);
  state.train = { prof: 'all', theme: 'all', tag: 'all', mode, queue: qs, idx: 0, ok: 0, n: 0, title };
  go('train');
}
// Dialogues (fiche, célébration) : focus déplacé à l'ouverture, rendu à l'élément d'origine à la fermeture.
function focusIn(el, target = el) {
  if (!el._back) el._back = document.activeElement;
  try { target.focus({ preventScroll: true }); } catch { /* ignore */ }
}
function focusBack(el) {
  const b = el._back; el._back = null;
  if (b && b !== document.body && document.contains(b)) try { b.focus({ preventScroll: true }); } catch { /* ignore */ }
}
// icon : nom d'une icône de js/icons.js, affichée avant le message.
function toast(msg, icon) {
  const t = $('#toast'); t.innerHTML = `${icon ? `${ic(icon)} ` : ''}${esc(msg)}`; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
// Amène un élément au-dessus de la barre d'onglets (fixe) sans cacher son haut sous l'en-tête collant.
function revealBelow(el, { smooth = true } = {}) {
  if (!el?.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const nr = $('nav.bottom')?.getBoundingClientRect();
  const navH = nr && nr.top > window.innerHeight / 2 ? nr.height : 0; // barre latérale sur ordinateur : rien en bas
  const headH = $('header.top')?.getBoundingClientRect().height || 0;
  const bottom = window.innerHeight - navH - 12;
  if (r.bottom <= bottom) return;
  const dy = Math.min(r.bottom - bottom, r.top - headH - 8);
  if (dy > 0) window.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
}
// Après « Voir la réponse » ou un choix : la correction vient en haut de l'écran (sous l'en-tête).
function scrollToCorrection(el) {
  if (!el?.getBoundingClientRect) return;
  const headH = $('header.top')?.getBoundingClientRect().height || 0;
  const dy = el.getBoundingClientRect().top - headH - 12;
  if (dy > 0) window.scrollBy({ top: dy, behavior: 'smooth' });
}
function shuffle(arr, seed) {
  // Mélange déterministe par id (pour que l'ordre des propositions soit stable pendant une question)
  let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const a = arr.map((v, i) => ({ v, r: (Math.sin(s + i * 9301) + 1) / 2 }));
  return a.sort((x, y) => x.r - y.r).map((x) => x.v);
}
function daysToExam() { return P.daysUntil(G.dayKey(Date.now()), examKey()); }
function intervalLabel(card, g, id) {
  const now = Date.now();
  const c = review(card || newCard(), g, now, reviewOpts(id));
  if (g === 0) return '10 min';
  // En jours de calendrier : l'échéance tombe dès le matin du jour prévu.
  const d = P.daysUntil(G.dayKey(now), G.dayKey(c.due));
  return d <= 0 ? 'auj.' : `${d} j`;
}

// ---------- Rendu commun d'une question ----------
function qHeader(q, { timer = false } = {}) {
  const conf = q.confidence === 'low' ? '<span class="badge warn">à vérifier</span>' : q.confidence === 'medium' ? '<span class="badge">confiance moyenne</span>' : '';
  const sib = siblings(q.id).length;
  return `<div class="row" style="justify-content:space-between">
    <div class="row" style="gap:6px"><span class="badge ${q.profession.toLowerCase()}">${q.profession}</span><span class="badge">${esc(THEMES[q.theme])}</span>${sib ? `<span class="badge rec" title="Notion posée à plusieurs sessions">${ic('repeat')} posée ${sib + 1}×</span>` : ''}${state.progress.settings.showLowConfidence ? conf : ''}</div>
    <span class="row" style="gap:6px;flex-wrap:nowrap"><span class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n}</span>${timer ? '<span class="qtimer" aria-label="Temps restant sur la question">3:00</span>' : ''}</span></div>`;
}
// Minuteur par question : 3 minutes, le budget de l'épreuve (20 questions en 1 h). Il démarre à l'affichage,
// s'arrête à la réponse (QCM) ou à la correction (QRC) et affiche alors le temps mis ; le temps est gardé dans l'historique.
const Q_BUDGET = 3 * 60 * 1000;
const qTimer = { t0: 0, iv: null, el: null, ms: 0 };
const fmtQ = (ms) => { const s = Math.round(Math.abs(ms) / 1000); return `${ms < 0 ? "−" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function startQTimer(container) {
  stopQTimer();
  const el = $('.qtimer', container); if (!el) return;
  qTimer.el = el; qTimer.t0 = Date.now(); qTimer.ms = 0;
  const tick = () => {
    const left = Q_BUDGET - (Date.now() - qTimer.t0);
    el.textContent = fmtQ(left);
    el.classList.toggle('warn', left <= 60000 && left > 0); el.classList.toggle('over', left <= 0);
  };
  tick(); qTimer.iv = setInterval(tick, 500);
}
function stopQTimer() {
  if (qTimer.iv) { clearInterval(qTimer.iv); qTimer.iv = null; }
  if (!qTimer.t0) return;
  qTimer.ms = Date.now() - qTimer.t0; qTimer.t0 = 0;
  const el = qTimer.el; qTimer.el = null;
  if (el && el.isConnected) { el.classList.remove('warn'); el.classList.toggle('over', qTimer.ms > Q_BUDGET); el.classList.add('done'); el.textContent = `${qTimer.ms > Q_BUDGET ? 'Répondu en' : 'En'} ${fmtQ(qTimer.ms)}`; }
}
const takeQMs = () => { const ms = qTimer.ms; qTimer.ms = 0; return ms; };
function qExplain(q) {
  const sib = siblings(q.id);
  return `<div class="explain"><strong>Explication.</strong> ${esc(q.explanation)}${q.update_note ? `<div class="muted" style="margin-top:6px">${ic('alert')} ${esc(q.update_note)}</div>` : ''}</div>
    <div class="ref">Réf. : ${esc(q.reference)} · <em>réponse rédigée à partir des textes, non officielle</em></div>${carnetBtn(q.id)}${relatedFiches(q.id).map((f) => `<button class="btn sm related" data-open-fiche="${esc(f.file)}">${ic('chart')} Schéma : ${esc(f.title.replace(/^Schéma\s*\d+\s*[–-]\s*/, ''))}</button>`).join('')}${sib.length ? `<button class="btn sm related" data-variants="${esc(q.id)}">${ic('repeat')} Même notion : ${sib.map((id) => esc(state.byId[id]?.sessionLabel || '')).join(', ')}</button>` : ''}`;
}
// ---------- Carnet d'erreurs ----------
// Bouton présent sur chaque correction (questions et shorts) : on y range ce que l'on sait ne pas avoir retenu.
function carnetBtn(id) {
  const on = CN.has(state.progress.carnet, id);
  return `<button class="btn sm related carnet-btn ${on ? 'on' : ''}" data-carnet="${esc(id)}" aria-pressed="${on}">${ic(on ? 'check' : 'bookmark')} ${on ? 'Dans le carnet' : 'Ajouter au carnet'}</button>`;
}
function toggleCarnet(id) {
  const e = CN.toggle(state.progress.carnet, id); persist();
  document.querySelectorAll(`[data-carnet="${CSS.escape(id)}"]`).forEach((b) => { b.outerHTML = carnetBtn(id); });
  toast(e.on ? 'Ajouté au carnet d’erreurs (Accueil)' : 'Retiré du carnet', 'bookmark');
  if (state.view === 'carnet') render();
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-carnet]'); if (b) toggleCarnet(b.dataset.carnet); });
function carnetCard() {
  const n = CN.entries(state.progress.carnet, state.byId).length;
  if (!n) return '';
  return `<div class="card carnet-card" data-go="carnet"><div class="row" style="justify-content:space-between"><div><strong>${ic('bookmark')} Carnet d’erreurs</strong><div class="muted">${n} élément${n > 1 ? 's' : ''} à repasser et à relire</div></div><span class="muted">›</span></div></div>`;
}
// Indice de certitude, demandé avant la correction (calibration, effet d'hypercorrection).
const CERT = { qcm: [[2, 'Sûr'], [1, 'Hésitant'], [0, 'Au hasard']], qrc: [[2, 'Sûr'], [1, 'Hésitant'], [0, 'Je ne sais pas']] };
const certRow = (mode, label) => `<div class="cert"><div class="muted">${label}</div><div class="btnrow3">${CERT[mode].map(([c, l]) => `<button class="btn" data-conf="${c}">${l}</button>`).join('')}</div></div>`;
const hcAlert = () => '<div class="hc">' + ic('alert') + ' <strong>Erreur commise avec certitude.</strong> C’est celle qu’on retient le mieux une fois corrigée : lisez l’explication, la question revient dans la séance.</div>';
// QCM. opts.hide : la question d'abord, les propositions sur demande (rappel avant reconnaissance).
// onAnswered(ok, conf, pick) ; conf vaut null si la certitude n'est pas demandée ; pick : index d'origine choisi.
function renderQcm(q, container, onAnswered, { hide = false, askConf = false } = {}) {
  const order = shuffle([0, 1, 2, 3], q.id);
  const qt = q.qcm.question || q.question;
  container.innerHTML = `${qHeader(q, { timer: true })}<div class="q">${esc(qt)}</div>${hide ? '<div class="recall"><p class="muted">' + ic('brain') + ' Formulez votre réponse de tête, puis comparez-la aux propositions.</p><button class="btn primary show-choices">Afficher les propositions</button></div>' : ''}<div class="choices ${hide ? 'hidden' : ''}"></div><div class="pending"></div><div class="after"></div>`;
  const box = $('.choices', container);
  if (hide) $('.show-choices', container).onclick = () => { $('.recall', container).remove(); box.classList.remove('hidden'); };
  let chosen = null;
  startQTimer(container);
  const reveal = (conf) => {
    stopQTimer();
    const ok = order[chosen] === q.qcm.answer;
    [...box.children].forEach((c, j) => {
      c.disabled = true; c.classList.remove('sel');
      if (order[j] === q.qcm.answer) c.classList.add('ok');
      else if (j === chosen) c.classList.add('ko');
    });
    $('.pending', container).innerHTML = '';
    $('.after', container).innerHTML = `${confidentError(ok, conf) ? hcAlert() : ''}<div class="answer"><strong>${ok ? ic('check') + ' Bonne réponse' : ic('x') + ' Mauvaise réponse'}.</strong> ${esc(q.qrc.model_answer)}</div>${qExplain(q)}`;
    onAnswered(ok, conf, order[chosen]);
    // La bonne proposition reste visible au-dessus de la correction.
    setTimeout(() => scrollToCorrection(box.children[Math.min(chosen, order.indexOf(q.qcm.answer))]), 30);
  };
  order.forEach((idx, i) => {
    const b = document.createElement('button');
    b.className = 'choice'; b.innerHTML = `<span class="k">${LETTERS[i]}</span><span>${esc(q.qcm.choices[idx])}</span>`;
    b.onclick = () => {
      chosen = i;
      if (!askConf) return reveal(null);
      [...box.children].forEach((c, j) => c.classList.toggle('sel', j === i));
      const p = $('.pending', container);
      if (!p.innerHTML) {
        p.innerHTML = certRow('qcm', 'Avant de voir la correction : vous êtes…');
        p.querySelectorAll('[data-conf]').forEach((cb) => { cb.onclick = () => reveal(Number(cb.dataset.conf)); });
        setTimeout(() => revealBelow(p), 30);
      }
    };
    box.appendChild(b);
  });
}
// QRC. onRevealed(conf) à l'affichage du corrigé ; onCheck(ratio, conf) à chaque élément coché ou décoché.
function renderQrc(q, container, onRevealed, onCheck = () => {}, { askConf = false } = {}) {
  const qt = q.qrc.question || q.question;
  container.innerHTML = `${qHeader(q, { timer: true })}<div class="q">${esc(qt)}</div>
    <textarea placeholder="Votre réponse (facultatif : vous pouvez répondre de tête)…"></textarea>
    <div style="margin-top:10px" class="reveal-box">${askConf ? certRow('qrc', 'Voir la réponse. Vous êtes…') : '<button class="btn primary reveal">Voir la réponse</button>'}</div><div class="after"></div>`;
  startQTimer(container);
  const reveal = (conf) => {
    stopQTimer();
    $('.reveal-box', container).innerHTML = '';
    // Réponse tapée : mots-clés des éléments attendus surlignés ; seuls les éléments retrouvés sont pré-cochés.
    const typed = $('textarea', container).value.trim();
    const m = typed ? matchExpected(typed, q.qrc.expected) : { found: q.qrc.expected.map(() => false), marks: [] };
    const nFound = m.found.filter(Boolean).length;
    $('textarea', container).classList.add('hidden');
    $('.after', container).innerHTML = `${typed ? `<div class="typed"><div class="muted">Votre réponse${m.marks.length ? ' · <mark>surligné</mark> : mots des éléments attendus' : ''}</div><p>${highlight(typed, m.marks, esc)}</p></div>` : ''}
      <div class="answer"><strong>Éléments attendus</strong> ${typed ? `(${nFound ? `${nFound} retrouvé${nFound > 1 ? 's' : ''} dans votre réponse et pré-coché${nFound > 1 ? 's' : ''}` : 'aucun retrouvé automatiquement'} : vérifiez, cochez ce que vous aviez)` : '(cochez ce que vous aviez)'} :
        <ul class="expected">${q.qrc.expected.map((e, i) => `<li><input type="checkbox" id="exp${i}" ${m.found[i] ? 'checked' : ''}><label for="exp${i}">${esc(e)}</label></li>`).join('')}</ul>
        <div style="margin-top:6px"><strong>Réponse type.</strong> ${esc(q.qrc.model_answer)}</div></div><div class="hc-slot"></div>${qExplain(q)}`;
    const boxes = [...container.querySelectorAll('.expected input')];
    // L'alerte « erreur avec certitude » attend que l'on ait commencé à cocher ; sinon elle vient à la notation.
    const update = (touched) => {
      const ratio = boxes.filter((x) => x.checked).length / Math.max(1, boxes.length);
      if (touched) $('.hc-slot', container).innerHTML = confidentError(ratio >= 0.5, conf) ? hcAlert() : '';
      onCheck(ratio, conf);
    };
    boxes.forEach((x) => { x.onchange = () => update(true); });
    onRevealed(conf);
    update(false);
    setTimeout(() => scrollToCorrection($('.after', container)), 30);
  };
  if (askConf) container.querySelectorAll('.reveal-box [data-conf]').forEach((b) => { b.onclick = () => reveal(Number(b.dataset.conf)); });
  else $('.reveal', container).onclick = () => reveal(null);
}
function pickMode(q) {
  const m = state.progress.settings.mode;
  if (m === 'qcm' || m === 'qrc') return m;
  // mixte : QCM pour découvrir une question, QRC dès qu'elle a été vue une fois (le jour J, il faut produire).
  const c = state.progress.cards[q.id];
  return (c && c.reps > 0) || state.progress.stats.q[q.id]?.seen > 0 ? 'qrc' : 'qcm';
}

// ---------- Vues ----------
const views = {};

views.home = () => {
  const qs = state.bank.questions;
  const pr = state.progress;
  const lastExam = pr.exams[pr.exams.length - 1];
  const d = daysToExam();
  const lv = xpInfo();
  const nb = G.nextBadges(state.catalog, pr.stats, pr.badges, 3);
  // Annales vues : questions de la banque déjà répondues (même mesure que la fiabilité du niveau estimé).
  const cov = Math.round((qs.filter((q) => pr.stats.q[q.id]?.seen > 0).length / Math.max(1, qs.length)) * 100);
  if (isBilan()) return homeBilan({ d, lv, nb, cov, lastExam });
  return `${noticeCard()}
  <div class="card hero">
    <div class="hero-top">
      <div><div class="muted">Épreuve n°1 · ${esc(examLabel())}</div><div class="big">${!examDateSet() ? 'Date à définir' : d > 0 ? `J-${d}` : d === 0 ? 'Jour J' : 'Passée'}</div>${examDateSet() ? '' : '<button class="btn sm" data-go="settings">' + ic('calendar') + ' Définir la date de l’examen</button>'}</div>
    </div>
    ${estimateLine(cov)}
    ${heroCta()}
  </div>
  ${helpCard()}
  ${dayCard()}
  <div class="card career-card" data-go="carriere">
    ${CR.levelCardHtml(lv.info, { today: lv.today, compact: true, conds: lv.conds, blocked: lv.blocked })}
    <div class="muted" style="margin-top:8px;text-align:right">Ma carrière ›</div>
  </div>
  ${carnetCard()}
  ${gamesCard()}
  ${backupCard()}
  ${!pr.settings.focus && nb.length ? `<div class="card"><h2>Presque débloqués</h2>${nb.map(({ b, p }) => `<div class="nb">${badgeIcon(b)}<div style="flex:1"><div><strong>${esc(b.name)}</strong></div><div class="progress"><div style="width:${Math.round((p.cur / p.max) * 100)}%"></div></div><div class="muted">${p.cur}/${p.max} · ${esc(b.cond)}</div></div></div>`).join('')}</div>` : ''}
  ${lastExam ? `<div class="card"><h2>Dernier examen blanc</h2><div class="row"><span class="big" style="font-size:28px">${lastExam.note}/20</span><span class="muted">${lastExam.mode.toUpperCase()} · ${new Date(lastExam.t).toLocaleDateString('fr-FR')}</span></div>
    <div class="muted">EC ${pct(lastExam.byProf.EC)} · CAC ${pct(lastExam.byProf.CAC)}</div></div>` : ''}
  <div class="card"><strong>Conseil du jury</strong><p class="muted" style="margin:4px 0 8px">La partie CAC est systématiquement moins bien réussie, et les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? »</p><details><summary>Tous les conseils</summary><ul class="muted" style="padding-left:18px;margin:8px 0 0">
    <li>La partie CAC est systématiquement moins bien réussie : travaillez-la en priorité.</li>
    <li>Les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? ».</li>
    <li>Réponses courtes : un mot, un chiffre, une liste. 3 minutes par question.</li>
    <li>Références d’articles et quantum des sanctions ne sont pas exigés ; les chiffres (seuils, durées, délais) le sont.</li></ul></details>
    <div style="margin-top:10px"><button class="btn" data-go="stats">${ic('trending')} Statistiques détaillées</button></div></div>`;
};
const isBilan = () => (state.progress?.settings?.look || 'bilan') === 'bilan';
// Accueil « bilan » : un seul objet en haut (le bilan du jour), le plan comme liste, le reste en tuiles.
function homeBilan({ d, lv, nb, cov, lastExam }) {
  const pr = state.progress; const has = pr.attempts.length > 0; const e = has ? currentEstimate() : null;
  const tile = (label, v, unit = '') => `<div class="bh-kpi"><span class="bh-kpi__l">${label}</span><span class="bh-kpi__v">${v}<small>${unit}</small></span></div>`;
  const hero = `<section class="bh">
    <div class="bh-top"><span class="bh-eyebrow">Épreuve n°1 · ${esc(examLabel())}</span><span class="bh-grade" data-go="carriere">Grade ${lv.info.n} · ${esc(CR.SHORT[lv.info.n])} ›</span></div>
    <div class="bh-big">${!examDateSet() ? 'Date à définir' : d > 0 ? `J-${d}` : d === 0 ? 'Jour J' : 'Passée'}</div>
    <div class="bh-kpis">${tile('QCM estimé', has ? fr(e.qcm.note) : '–', '/20')}${tile('QRC estimé', has ? fr(e.qrc.note) : '–', '/20')}${tile('Annales vues', cov, ' %')}${tile('Points du jour', lv.today > 0 ? `+${lv.today}` : '0', '')}</div>
    ${heroCta()}
    ${has ? `<button class="bh-link" data-go="stats">Niveau estimé · risque &lt; 6 : ${e.qcm.risk} % (QCM) · ${e.reliable ? 'fiable' : 'indicatif'} ›</button>` : ''}
    ${examDateSet() ? '' : `<button class="bh-link" data-go="settings">${ic('calendar')} Définir la date de l’examen ›</button>`}
  </section>`;
  const tiles = [
    ['carnet', ic('bookmark'), 'Carnet d’erreurs', `${CN.entries(pr.carnet).length} élément${CN.entries(pr.carnet).length > 1 ? 's' : ''}`],
    ['shorts', ic('clapper'), 'Shorts', state.shorts ? `${SH.shortsStats(state.shorts, pr.drills).due} à revoir` : '30 s par notion'],
    ['jeux', ic('dice'), 'Jeux express', '5 minutes'],
    ['exam', ic('timer'), 'Examen blanc', lastExam ? `dernier : ${lastExam.note}/20` : 'pas encore passé'],
    ['fiches', ic('library'), 'Fiches et schémas', `${state.fiches.filter((f) => P.isRead(pr.plan, f.file)).length} / ${state.fiches.length} vues`],
  ].map(([v, i, t, sub]) => `<button class="bh-tile" data-go="${v}"><span class="bh-tile__i">${i}</span><strong>${esc(t)}</strong><span>${esc(sub)}</span></button>`).join('');
  return `<div class="home">${noticeCard()}${hero}${helpCard()}${dayCard()}
  <section class="bh-tiles">${tiles}</section>
  ${!pr.settings.focus && nb.length ? `<div class="card"><h2>Presque débloqués</h2>${nb.map(({ b, p }) => `<div class="nb">${badgeIcon(b)}<div style="flex:1"><div><strong>${esc(b.name)}</strong></div><div class="progress"><div style="width:${Math.round((p.cur / p.max) * 100)}%"></div></div><div class="muted">${p.cur}/${p.max} · ${esc(b.cond)}</div></div></div>`).join('')}</div>` : ''}
  ${backupCard()}
  <div class="card"><h2>Conseil du jury</h2><p class="muted" style="margin:4px 0 8px">La partie CAC est systématiquement moins bien réussie, et les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? ».</p><details><summary>Tous les conseils</summary><ul class="muted" style="margin:6px 0 0;padding-left:18px">
    <li>La partie CAC est systématiquement moins bien réussie : travaillez-la en priorité.</li>
    <li>Les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? ».</li>
    <li>Réponses courtes : un mot, un chiffre, une liste. 3 minutes par question.</li>
    <li>Références d’articles et quantum des sanctions ne sont pas exigés ; les chiffres (seuils, durées, délais) le sont.</li></ul></details>
    <div style="margin-top:10px"><button class="btn" data-go="stats">${ic('trending')} Statistiques détaillées</button></div></div></div>`;
}
function markExported() { state.progress.lastExportAt = Date.now(); persist(); }
async function exportProgress() {
  const text = store.exportJSON(state.progress);
  const name = `dec1-progression-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); markExported(); render(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
  markExported(); toast('Export lancé. Si rien ne se télécharge, utilisez « Copier ».'); render();
}
function applyImport(text) {
  let next;
  try { next = store.importJSON(text); } catch (err) { toast('Import impossible : ' + err.message); return; }
  const cur = Object.keys(state.progress.cards).length; const n = Object.keys(next.cards).length;
  if (!confirm(`Remplacer la progression actuelle (${cur} cartes) par celle de la sauvegarde (${n} cartes) ? Une copie de l’état actuel est conservée pour annuler.`)) return;
  store.snapshotPrev(state.progress);
  next.stats = next.stats || null;
  state.progress = next; initGamify(); persist(); toast('Progression importée'); render();
}
function noticeCard() {
  const n = state.notice; if (!n) return '';
  setTimeout(() => { const b = $('#notice-ok'); if (b) b.onclick = () => { state.notice = null; render(); }; }, 0);
  const msg = n.type === 'restored'
    ? `Votre progression n’était plus lisible : elle a été <strong>restaurée depuis la sauvegarde automatique</strong>${n.at ? ` du ${new Date(n.at).toLocaleString('fr-FR')}` : ''}. Les réponses données depuis sont perdues.`
    : 'Votre progression n’était plus lisible et <strong>aucune sauvegarde n’a pu la remplacer</strong> : elle repart de zéro. Si vous avez un export, importez-le dans Réglages.';
  return `<div class="card notice"><p>${msg}</p><button class="btn" id="notice-ok">Compris</button></div>`;
}
function backupCard() {
  const pr = state.progress; if (!pr.attempts.length) return '';
  if (SY.config() && Date.now() - (SY.status().at || 0) < 2 * DAY) return '';
  const days = pr.lastExportAt ? (Date.now() - pr.lastExportAt) / DAY : Infinity;
  if (days < 2) return '';
  return `<div class="card notice"><strong>${ic('save')} Sauvegarde</strong><p class="muted" style="margin:4px 0 8px">${pr.lastExportAt ? `Dernier export il y a ${Math.floor(days)} jours.` : 'Aucun export pour l’instant.'} Si le navigateur efface les données du site, la progression est perdue.</p><button class="btn" data-go="settings">Exporter ma progression</button></div>`;
}
// ---------- Plan du jour ----------
// Figé à la première ouverture de la journée, recalculé le lendemain sur ce qui reste et sur les résultats :
// étapes non faites reportées, objectif de nouvelles cartes recalé, point faible du jour, jeu où l'on se trompe le plus.
const todayKey = () => G.dayKey(Date.now());
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueNow = () => { const now = Date.now(); return Object.values(state.progress.cards).filter((c) => c.due <= now).length; };
const tagLabel = (t) => G.TAG_LABELS?.[t] || t.replace(/_/g, ' ');
const weakIds = (w) => state.bank.questions.filter((q) => q.profession === w.prof && q.tags.includes(w.tag)).map((q) => q.id);
const GAME_PREFIX = { duel: 'duel:', vf: 'vf:', arbre: 'arb:', chiffres: 'num:', palais: 'pal:', intrus: GM.INTRUS_PREFIX };
// Étapes prévues un jour passé et toujours non terminées : reprises aujourd'hui (rattrapage). `plan.sched` garde le jour prévu.
function lateSteps(k, todaySteps) {
  const sched = state.progress.plan.sched = state.progress.plan.sched || {};
  const late = todaySteps.filter((id) => sched[id] && sched[id] < k).map((id) => ({ id, was: sched[id] }));
  todaySteps.forEach((id) => { if (!sched[id] || sched[id] < k) sched[id] = k; });
  return late;
}
function ensureDaily() {
  const pr = state.progress; const k = todayKey();
  if (pr.daily?.day === k) return pr.daily;
  const undone = P.STEPS.filter((st) => st.kind === 'schema' && !pr.plan.done[st.id]).map((st) => st.id);
  const d = P.schedule(k, examKey(), undone)[0];
  const unseen = state.bank.questions.filter((q) => !pr.cards[q.id]).length;
  const w = P.tagStats(pr.attempts, state.byId).weak[0];
  const game = d.kind === 'veille' ? 'palais' : d.kind === 'faibles' ? 'chiffres' : P.gameOfDay(k, pr.drills);
  pr.daily = {
    day: k, n: d.n, kind: d.kind, steps: d.steps, exam: d.exam, merged: d.merged || [], revise: d.revise || [], late: lateSteps(k, d.steps), game, newDone: 0,
    target: P.newTarget(unseen, d.n, pr.settings.newPerDay, dueNow()),
    weak: w && d.kind !== 'veille' ? { prof: w.prof, tag: w.tag, acc: Math.round(w.acc * 100) } : null,
  };
  persist();
  return pr.daily;
}
// Tâches du jour et leur état (calculé d'après ce qui a été fait).
function dayTasks() {
  const pr = state.progress; const d = ensureDaily(); const t0 = startOfDay();
  const tasks = [];
  const steps = d.steps.map((id) => P.stepById(id)).filter(Boolean);
  const files = [...new Set(steps.flatMap((st) => st.fiches))];
  if (files.length) {
    const unread = files.find((f) => !P.isRead(pr.plan, f));
    const readN = files.filter((f) => P.isRead(pr.plan, f)).length;
    tasks.push({ id: 'read', icon: ic('chart'), title: files.length > 1 ? `Lire les ${files.length} schémas du jour` : 'Lire le schéma du jour', sub: `${steps.map((st) => st.title).join(' · ')} · 5 à 10 min chacun`, short: files.length > 1 ? `${readN} / ${files.length} lus · 5 à 10 min chacun` : '5 à 10 min', done: !unread, cta: `Lire : ${shortTitle(unread || files[0])}`, run: () => ficheSheet(unread || files[0]), html: files.map((f) => `<button class="btn sm ${P.isRead(pr.plan, f) ? '' : 'primary'}" data-open-fiche="${esc(f)}">${P.isRead(pr.plan, f) ? ic('check') : ic('chart')} ${esc(shortTitle(f))}</button>`).join('') });
  }
  if (state.shorts?.length) {
    const n = shortsToday(); const need = d.kind === 'veille' ? 5 : 10;
    tasks.push({ id: 'shorts', icon: ic('clapper'), title: `Shorts du jour : ${need} notions, 30 s chacune`, sub: `${Math.min(n, need)}/${need} aujourd’hui · ${steps.length ? 'les schémas du jour d’abord, puis les shorts à revoir et vos points faibles' : 'les shorts à revoir et vos points faibles'}`, done: n >= need, cta: 'Shorts du jour', run: () => openFeed({ focus: d.steps, goal: need, base: Math.min(n, need) }) });
  }
  const mergedExams = (d.merged || []).filter((m) => m.kind === 'blanc').map((m) => m.exam);
  const todayExams = pr.exams.filter((e) => e.t >= t0 && isCounted(e)).length; // copie rendue presque blanche : la tâche reste à faire
  [...mergedExams, ...(d.exam ? [d.exam] : [])].forEach((ex, i) => tasks.push({ id: i ? `exam${i}` : 'exam', icon: ic('timer'), title: `Examen blanc ${ex.toUpperCase()}${i < mergedExams.length ? ' (regroupé : délai court)' : ''}`, sub: '20 questions, 60 minutes, en conditions réelles', done: todayExams > i, cta: `Examen blanc ${ex.toUpperCase()}`, run: () => go('exam') }));
  const reviseSteps = (d.revise || []).map((id) => P.stepById(id)).filter(Boolean);
  if (reviseSteps.length) {
    const rf = reviseSteps.flatMap((st) => st.fiches)[0];
    tasks.push({ id: 'revise', icon: ic('book'), title: 'Relire pour fixer', sub: `Révision espacée : ${reviseSteps.map((st) => st.title).join(' · ')}`, done: !!pr.plan.revised?.[d.day], cta: `Relire : ${shortTitle(rf)}`, run: () => { pr.plan.revised = { ...(pr.plan.revised || {}), [d.day]: true }; persist(); ficheSheet(rf); } });
  }
  const due = dueNow(); const newLeft = Math.max(0, d.target - (d.newDone || 0));
  tasks.push({ id: 'session', icon: ic('repeat'), title: d.target ? `Session : ${d.target} nouvelles questions et les cartes à revoir` : 'Session : les cartes à revoir uniquement', sub: `${d.newDone || 0}/${d.target} nouvelles · ${due} à revoir maintenant${steps.length ? ' · les questions des schémas du jour arrivent en premier' : ''}`, done: newLeft === 0 && due === 0, cta: `${d.newDone || state.session ? 'Continuer' : 'Commencer'} la session (${newLeft + due})`, run: () => go('review') });
  if (d.weak) {
    const ids = weakIds(d.weak); const today = pr.attempts.filter((a) => a.t >= t0 && ids.includes(a.id)).length; const need = Math.min(8, ids.length);
    tasks.push({ id: 'weak', icon: ic('target'), title: `Point faible : ${tagLabel(d.weak.tag)} (${d.weak.prof})`, sub: `${d.weak.acc} % de réussite jusqu’ici · ${Math.min(today, need)}/${need} questions aujourd’hui`, done: today >= need, cta: `Point faible : ${tagLabel(d.weak.tag)}`, run: () => trainOn(shuffle(ids, Date.now()).slice(0, 10), `Point faible du jour : ${tagLabel(d.weak.tag)}`) });
  }
  if (d.kind === 'faibles' || (d.merged || []).some((m) => m.kind === 'faibles')) {
    const sure = confidentErrors(pr.attempts).length;
    tasks.push({ id: 'sure', icon: ic('alert'), title: 'Reprendre les erreurs « j’étais sûr »', sub: `${sure} à reprendre`, done: sure === 0, cta: 'Mes erreurs « j’étais sûr »', run: () => trainOn(confidentErrors(pr.attempts).slice(-20), 'Mes erreurs « j’étais sûr »') });
  }
  const g = GAMES[d.game];
  // Coché à la fin d'une partie (palais : une liste récitée jusqu'au bout), pas après quelques réponses.
  const played = d.game === 'palais' ? Object.entries(pr.drills).some(([id, m]) => id.startsWith(GAME_PREFIX.palais) && m.last >= t0) : !!pr.plan.gamesDone?.[d.day]?.includes(d.game);
  tasks.push({ id: 'game', icon: g.icon, title: `Jeu du jour : ${g.name}`, sub: d.kind === 'veille' ? 'Réciter les listes, sans rien apprendre de nouveau' : '5 minutes · choisi parmi ceux où vous vous trompez le plus', done: played, cta: `Jeu du jour : ${g.name}`, run: () => startGame(d.game) });
  // Étapes du jour terminées dès que le schéma est lu et la session faite : le lendemain prend la suite.
  const read = tasks.find((x) => x.id === 'read'); const sess = tasks.find((x) => x.id === 'session');
  if (steps.length && read?.done && sess.done && steps.some((st) => !pr.plan.done[st.id])) { steps.forEach((st) => { pr.plan.done[st.id] = pr.plan.done[st.id] || Date.now(); }); persist(); }
  return tasks;
}
// Prochaine tâche obligatoire du plan (les tâches facultatives ne bloquent pas la journée).
const nextTask = (tasks, skip = '') => tasks.find((x) => !x.done && !x.optional && x.id !== skip);
// Jeu du jour : noté à la fin de la partie (voir endGame).
function markGameFinished(kind) { P.markGameDone(state.progress.plan, todayKey(), kind); }
// Plan du jour « bilan » : une ligne par tâche, toute la ligne se touche ; seul le détail de la tâche en cours est
// affiché ; rattrapage et demain tiennent en une ligne discrète chacun.
function dayCardBilan({ d, tasks, req, n, cur, tomText }) {
  const weekday = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
  const late = [];
  if (d.late?.length) late.push(`Rattrapage : ${d.late.map((x) => P.stepById(x.id)?.title || x.id).join(', ')}`);
  if (d.merged?.length) late.push(`Regroupé aujourd’hui : ${d.merged.map((m) => m.kind === 'blanc' ? `examen blanc ${m.exam.toUpperCase()}` : m.kind === 'faibles' ? 'points faibles' : 'veille').join(', ')}`);
  const row = (x, i) => {
    const isCur = x === cur; const state = x.done ? 'done' : isCur ? 'cur' : '';
    const inner = `<span class="tick">${x.done ? ic('check') : x.optional ? '+' : i + 1}</span>
      <span class="tbody"><strong>${esc(x.title)}</strong>${isCur ? `<span class="muted">${esc(x.short || x.sub)}</span><span class="todo-go">${esc(x.cta)} ›</span>` : ''}</span>
      <span class="tmeta">${x.done ? '' : x.optional && !isCur ? 'facultatif' : isCur ? '' : '›'}</span>`;
    return `<li class="${state}">${x.done ? `<div class="todo-row">${inner}</div>` : `<button class="todo-row" data-task="${x.id}">${inner}</button>`}</li>`;
  };
  return `<div class="card plan-card bilan"><div class="plan-head"><h2>Plan du jour</h2><span class="plan-meta">${esc(weekday)} · ${esc(KIND_LABEL[d.kind].toLowerCase())} · <strong>${n}/${req.length}</strong></span></div>
    <div class="progress sm"><div style="width:${Math.round((n / Math.max(1, req.length)) * 100)}%"></div></div>
    ${late.length ? `<p class="plan-late">${late.map(esc).join(' · ')}</p>` : ''}
    <ol class="todo">${tasks.map(row).join('')}</ol>
    ${n === req.length ? `<div class="gfb ok">${ic('party')} Plan du jour terminé.</div>${nextCard(true)}` : ''}
    <div class="plan-foot">${tomText ? `<span>Demain : ${esc(tomText)}</span>` : '<span></span>'}<button class="linkbtn" data-go="plan">Plan complet ›</button></div></div>`;
}
function lateBanner(d) {
  const parts = [];
  if (d.late?.length) parts.push(`${ic('undo')} <strong>Rattrapage</strong> : ${d.late.map((x) => `${esc(P.stepById(x.id)?.title || x.id)} (prévue le ${new Date(`${x.was}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })})`).join(' · ')}.`);
  if (d.merged?.length) parts.push(`${ic('forward')} <strong>Délai court</strong> : ${d.merged.map((m) => m.kind === 'blanc' ? `examen blanc ${m.exam.toUpperCase()}` : m.kind === 'faibles' ? 'points faibles' : 'veille').join(', ')} regroupé${d.merged.length > 1 ? 's' : ''} aujourd’hui, rien n’est supprimé.`);
  return parts.length ? `<div class="gfb warn" style="margin:6px 0">${parts.join('<br>')}</div>` : '';
}
// Pont vers Ernest (app d'organisation) : le plan du jour, déposé sur le serveur à chaque synchro (sendPont), sans doublon côté Ernest.
// Chaque tâche porte son état (done) : faite ici, elle est cochée dans Ernest.
const ERNEST_URL = 'https://romankimes-dot.github.io/Ernest/';
const ERNEST_EST = { read: 10, shorts: 8, revise: 20, session: 25, weak: 15, sure: 10, game: 10 };
// Moment dans la journée d'Ernest : l'effort le matin (apprendre, corriger), le léger qui fixe le soir.
const ERNEST_SLOT = { read: 'matin', session: 'matin', weak: 'matin', sure: 'matin', revise: 'soir', shorts: 'soir', game: 'soir' };
function ernestPayload() {
  const pr = state.progress; const d = ensureDaily(); const k = todayKey();
  const things = dayTasks().map((x) => ({ done: !!x.done, title: `Déonto · ${x.title.replace(/^[^\w]*/, '')}`.slice(0, 120), cat: 'revision', slot: ERNEST_SLOT[x.id] || null, est: x.id === 'session' ? Math.max(10, Math.round((d.target || 20) * 0.8)) : (ERNEST_EST[x.id] || 15), link: ERNEST_URL ? location.href.split('#')[0] : null, day: k, note: x.sub }));
  const byDay = {};
  for (const a of pr.attempts) { const dk = G.dayKey(a.t); byDay[dk] = (byDay[dk] || 0) + 1; }
  const history = Object.entries(byDay).filter(([dk]) => dk < k).map(([day, n]) => ({ day, n: Math.min(3, Math.ceil(n / 20)) }));
  const goal = examDateSet() ? { title: 'Épreuve 1 · Déontologie', cat: 'revision', due: examKey(), milestones: calendar().filter((c) => c.exam || c.kind === 'faibles' || c.kind === 'veille').map((c) => ({ text: c.exam ? `Examen blanc ${c.exam.toUpperCase()}` : c.kind === 'faibles' ? 'Points faibles' : 'Veille légère', due: c.day, done: c.day < k })) } : null;
  return { v: 1, src: 'deonto', things, goals: goal ? [goal] : [], history };
}
const KIND_LABEL = { etude: 'Apprendre', consolidation: 'Consolider', blanc: 'Examen blanc', faibles: 'Points faibles', veille: 'Veille : léger', 'jour-j': 'Jour J', apres: 'Après l’épreuve' };
function dayCard() {
  const d = ensureDaily();
  if (d.kind === 'jour-j') return '<div class="card plan-card"><h2>Jour J ' + ic('clover') + '</h2><p class="muted">Rien de nouveau. Relisez les chiffres clés, respirez, 3 minutes par question. Partie CAC : soignez-la.</p><button class="btn" data-open-fiche="15-schema-chiffres-cles.md">' + ic('chart') + ' Les chiffres à connaître</button></div>';
  if (d.kind === 'apres') return '';
  const tasks = dayTasks(); const req = tasks.filter((x) => !x.optional); const n = req.filter((x) => x.done).length;
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const cur = nextTask(tasks);
  const tom = calendar()[1];
  const tomText = tom ? [...tom.steps.map((id) => P.stepById(id)?.title), tom.exam ? `examen blanc ${tom.exam.toUpperCase()}` : '', tom.kind === 'faibles' ? 'points faibles' : '', tom.kind === 'veille' ? 'veille légère' : '', tom.kind === 'consolidation' ? 'consolidation' : ''].filter(Boolean).join(' · ') : '';
  if (isBilan()) return dayCardBilan({ d, tasks, req, n, cur, tomText });
  return `<div class="card plan-card"><div class="row" style="justify-content:space-between"><span class="badge warn">${esc(KIND_LABEL[d.kind])} · J-${d.n}</span><span class="muted">${n}/${req.length} fait</span></div>
    <h2 style="margin:8px 0 2px">Mon plan du ${esc(date)}</h2>${lateBanner(d)}<div class="progress" style="margin:6px 0 10px"><div style="width:${Math.round((n / req.length) * 100)}%"></div></div>
    <ol class="todo">${tasks.map((x, i) => `<li class="${x.done ? 'done' : x === cur ? 'cur' : ''}"><span class="tick">${x.done ? ic('check') : x.optional ? '+' : i + 1}</span><div class="tbody"><div><strong>${x.icon} ${esc(x.title)}</strong>${x === cur ? ' <span class="badge warn">maintenant</span>' : ''}${x.optional ? ' <span class="badge">facultatif</span>' : ''}</div><div class="muted">${esc(x.sub)}</div>${x.done ? '' : x.html || `<button class="btn sm ${x === cur ? 'primary' : ''}" data-task="${x.id}">${ic('play')} ${esc(x.cta)}</button>`}</div></li>`).join('')}</ol>
    ${n === req.length ? `<div class="gfb ok">${ic('party')} Plan du jour terminé. Vous pouvez vous arrêter, ou continuer en boucle :</div>${nextCard(true)}` : ''}
    ${tomText ? `<p class="muted" style="margin:6px 0 10px">Demain : ${esc(tomText)}.</p>` : ''}
    <button class="btn sm" data-go="plan">${ic('calendar')} Mon plan jusqu’au ${esc(examDay())}</button></div>`;
}
// Le bouton principal de l'accueil : la prochaine chose à faire, sans réfléchir.
function heroCta() {
  const d = ensureDaily();
  if (d.kind === 'apres') return '<button class="btn primary big-btn" data-go="review"><span>' + ic('play') + ' Réviser</span></button>';
  const cur = d.kind === 'jour-j' ? null : nextTask(dayTasks());
  if (cur) return `<button class="btn primary big-btn" data-task="${cur.id}"><span class="cta-k">À faire maintenant</span><span>${ic('play')} ${esc(cur.cta)}</span></button>`;
  const a = nextActions(); state.nextList = a;
  return `<button class="btn primary big-btn" data-next="0"><span class="cta-k">Plan du jour terminé · et maintenant ?</span><span>${a[0].icon} ${esc(a[0].title)}</span></button>`;
}
// En fin de séance, de série, de jeu ou d'examen : ce qui suit dans le plan.
function nextStepBlock() {
  const cur = nextTask(dayTasks());
  if (cur) return `<div class="card next"><div class="muted">Prochaine étape de votre plan du jour</div><strong>${cur.icon} ${esc(cur.title)}</strong><p class="muted" style="margin:4px 0 8px">${esc(cur.sub)}</p><button class="btn primary" data-task="${cur.id}">${ic('play')} ${esc(cur.cta)}</button></div>`;
  return `<div class="gfb ok">${ic('party')} Plan du jour terminé.</div>${nextCard()}`;
}
// Aide de départ : affichée tant qu'on ne l'a pas fermée.
function helpCard() {
  const s = state.progress.settings;
  if (s.helpSeen || (isBilan() && state.progress.attempts.length >= 20)) return '';
  setTimeout(() => { const b = $('#help-ok'); if (b) b.onclick = () => { s.helpSeen = true; persist(); render(); }; }, 0);
  return `<div class="card help"><h2>Comment ça marche</h2><ol>
    <li><strong>Suivez le plan du jour</strong>, juste en dessous : le gros bouton en couleur lance toujours la prochaine chose à faire.</li>
    <li><strong>Une session</strong> mêle vos nouvelles questions et celles à revoir : notez honnêtement, l’app calcule quand chaque question reviendra (toujours avant le 10 novembre).</li>
    <li><strong>Un lien vers un schéma</strong> s’ouvre par-dessus : « Fermer et reprendre » vous ramène où vous en étiez.</li>
    <li>Plan fini ? <strong>« Et maintenant ? »</strong> propose la suite, autant que vous voulez. Le plan se recale chaque matin sur vos résultats.</li></ol>
    <button class="btn" id="help-ok">J’ai compris</button></div>`;
}
// « Et maintenant ? » : la meilleure activité du moment, d'après l'état ; « Autre idée » fait tourner la liste.
function nextActions() {
  const pr = state.progress; const out = []; const now = Date.now();
  const due = dueNow();
  if (due) out.push({ icon: ic('repeat'), title: `${due} carte${due > 1 ? 's' : ''} à revoir maintenant`, why: 'Revues au bon moment, elles tiennent jusqu’à l’épreuve.', run: () => { state.session = null; go('review'); } });
  const sure = confidentErrors(pr.attempts);
  if (sure.length) out.push({ icon: ic('alert'), title: `${sure.length} erreur${sure.length > 1 ? 's' : ''} « j’étais sûr »`, why: 'Une erreur commise avec certitude se corrige le mieux si on y revient vite.', run: () => trainOn(sure.slice(-20), 'Mes erreurs « j’étais sûr »') });
  const shDue = state.shorts ? SH.shortsStats(state.shorts, pr.drills, now).due : 0;
  if (shDue) out.push({ icon: ic('clapper'), title: `Shorts : ${shDue} à revoir`, why: 'Les notions ratées dans le fil reviennent : 30 secondes chacune.', run: () => openFeed() });
  for (const w of P.tagStats(pr.attempts, state.byId).weak.slice(0, 3)) {
    out.push({ icon: ic('target'), title: `Point faible : ${tagLabel(w.tag)} (${w.prof}, ${Math.round(w.acc * 100)} %)`, why: 'Votre sous-thème le moins réussi : une série ciblée de 10 questions.', run: () => trainOn(shuffle(weakIds(w), now).slice(0, 10), `Point faible : ${tagLabel(w.tag)}`) });
  }
  for (const [k, pre] of Object.entries(GAME_PREFIX)) {
    const n = Object.entries(pr.drills).filter(([id, m]) => id.startsWith(pre) && m.due <= now).length;
    if (n) out.push({ icon: GAMES[k].icon, title: `${GAMES[k].name} : ${n} à revoir`, why: 'Les items ratés reviennent : c’est le moment de les reprendre.', run: () => startGame(k) });
  }
  const weakQ = weakest(20);
  if (weakQ.length) out.push({ icon: ic('flame'), title: 'Mes questions les plus ratées', why: 'Les 20 questions où vous échouez le plus souvent.', run: () => trainOn(weakQ.map((q) => q.id), 'Mes questions les plus ratées') });
  const todo = state.clusters.groups.map((g, i) => ({ g, i, ok: g.filter((id) => pr.stats.q[id]?.ok > 0).length })).filter((x) => x.ok < 2 && x.g.some((id) => pr.stats.q[id]));
  if (todo.length) out.push({ icon: ic('repeat'), title: 'Une notion récurrente, toutes ses variantes', why: 'Posée à plusieurs sessions : réussir chaque formulation prouve qu’on tient la règle.', run: () => trainOn(todo[0].g, 'Même notion, plusieurs sessions') });
  const unseen = state.bank.questions.filter((q) => !pr.cards[q.id]).length;
  if (unseen) out.push({ icon: ic('plus'), title: '20 nouvelles questions de plus', why: `Prendre de l’avance : ${unseen} questions jamais vues.`, run: () => { state.bonusNew = true; state.session = null; go('review'); } });
  const last = pr.exams[pr.exams.length - 1];
  if (!last || now - last.t > 2 * DAY) out.push({ icon: ic('timer'), title: 'Un examen blanc', why: last ? 'Le dernier date de plus de deux jours.' : 'Pour situer votre niveau en conditions réelles.', run: () => go('exam') });
  if (state.shorts?.length) out.push({ icon: ic('clapper'), title: 'Le fil de shorts', why: 'Une notion en 30 secondes, une question à chaque fois : vos points faibles d’abord.', run: () => openFeed() });
  out.push({ icon: ic('zap'), title: 'Vrai / Faux éclair', why: '20 propositions de QCM à juger, toujours utile.', run: () => startGame('vf') });
  out.push({ icon: ic('landmark'), title: 'Réciter une liste du palais', why: 'Les listes à connaître par cœur, posées dans votre bureau.', run: () => startGame('palais') });
  return out;
}
function nextCard(inner = false) {
  const list = nextActions(); state.nextList = list;
  const i = state.nextIdx % list.length; const a = list[i];
  return `<div class="${inner ? 'next-inner' : 'card'} next"><div class="muted">Et maintenant ? (${i + 1}/${list.length})</div><strong>${a.icon} ${esc(a.title)}</strong><p class="muted" style="margin:4px 0 8px">${esc(a.why)}</p>
    <div class="btnrow"><button class="btn primary" data-next="${i}">C’est parti</button><button class="btn" data-next-other="1">${ic('rotate-cw')} Autre idée</button></div></div>`;
}

// ---------- Estimation du niveau ----------
function currentEstimate() {
  const pr = state.progress;
  return estimate({ questions: state.bank.questions, stats: pr.stats, cards: pr.cards, attempts: pr.attempts, exams: pr.exams });
}
const fr = (x) => String(x).replace('.', ',');
// Encart de l'accueil : trois chiffres alignés (QCM, QRC, annales vues).
function estimateLine(cov) {
  const has = state.progress.attempts.length > 0;
  const e = has ? currentEstimate() : null;
  const kpi = (label, v, unit, extra = '') => `<div class="kpi"><span class="kpi-l">${label}</span><span class="kpi-v">${v}<small>${unit}</small></span>${extra}</div>`;
  const tiles = `<div class="kpis">${kpi('QCM', has ? fr(e.qcm.note) : '–', '/20')}${kpi('QRC', has ? fr(e.qrc.note) : '–', '/20')}${kpi('Annales vues', cov, ' %', `<div class="progress"><div style="width:${cov}%"></div></div>`)}</div>`;
  const sub = has ? `Niveau estimé · risque &lt; 6 : ${e.qcm.risk} % (QCM) · ${e.reliable ? 'fiable' : 'indicatif'} ›` : 'Niveau estimé : répondez à quelques questions pour l’obtenir.';
  return has ? `<button class="estim" data-go="stats">${tiles}<span class="muted">${sub}</span></button>` : `<div class="estim">${tiles}<span class="muted">${sub}</span></div>`;
}
function estimateCard() {
  if (!state.progress.attempts.length) return '';
  const e = currentEstimate();
  const row = (m, l) => `<tr><td>${l}</td><td><strong>${fr(e[m].note)}</strong> <span class="muted">(${fr(e[m].low)} à ${fr(e[m].high)})</span></td><td>${e[m].ec} %</td><td>${e[m].cac} %</td><td>${e[m].pass} %</td><td>${e[m].risk} %</td></tr>`;
  const weaker = e.qcm.cac < e.qcm.ec ? 'CAC' : 'EC';
  return `<div class="card"><h2>Estimation à l’épreuve</h2><table><thead><tr><th>Format</th><th>Note /20</th><th>EC</th><th>CAC</th><th>≥ 10</th><th>&lt; 6</th></tr></thead><tbody>${row('qcm', 'QCM')}${row('qrc', 'QRC')}</tbody></table>
    <p class="muted">Le sujet sera inédit : seules ${Math.round(e.repeat * 20)} questions sur 20 environ reprennent presque une annale (moyenne des dernières sessions). La note mêle donc votre mémoire des questions de la banque (pour cette part) et, pour le reste, votre réussite au premier essai sur des questions encore jamais vues du même sous-thème. La fourchette couvre deux tirages sur trois. Les examens blancs des 14 derniers jours comptent pour 50 % (copies répondues à moins de moitié exclues), l’examen inédit pour 60 %${e.qcm.inedit != null || e.qrc.inedit != null ? '' : ' (pas encore passé : onglet ' + ic('timer') + ' Examen)'}. ${e.reliable ? '' : `<strong>Estimation indicative</strong> tant que moins de 60 % de la banque est vue (${Math.round(e.coverage * 100)} %).`} Les QCM rédigés par IA peuvent flatter la note QCM.</p>
    <p class="muted">Le plus rentable : la partie <strong>${weaker}</strong> (${Math.min(e.qcm.ec, e.qcm.cac)} % contre ${Math.max(e.qcm.ec, e.qcm.cac)} %).</p></div>`;
}

function pct(a) { return a && a.max ? Math.round((a.points / a.max) * 100) + ' %' : '–'; }

const shortTitle = (file) => (state.fiches.find((f) => f.file === file)?.title || file).replace(/^(Schéma|Fiche)\s*\d+\s*[–-]\s*/, '');
// Calendrier jusqu'à l'épreuve : aujourd'hui (figé) puis la projection des jours suivants sur ce qui reste.
function calendar() {
  const pr = state.progress; const d = ensureDaily();
  const tomorrow = G.dayKey(Date.now() + DAY);
  const undone = P.STEPS.filter((st) => st.kind === 'schema' && !pr.plan.done[st.id] && !d.steps.includes(st.id)).map((st) => st.id);
  const later = d.n > 1 ? P.schedule(tomorrow, examKey(), undone) : [];
  return [{ key: todayKey(), ...d, today: true }, ...later];
}
views.plan = () => {
  const pr = state.progress; const cur = P.currentIndex(pr.plan);
  const cal = calendar();
  const stepDay = {}; cal.forEach((day) => day.steps.forEach((id) => { stepDay[id] = day; }));
  const finalDay = { 'blanc-qcm': 4, 'blanc-qrc': 3, faibles: 2, veille: 1 };
  const dayLabel = (day) => `${new Date(`${day.key}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · J-${day.n}`;
  setTimeout(() => {
    document.querySelectorAll('[data-step-done]').forEach((b) => { b.onclick = () => { const id = b.dataset.stepDone; if (pr.plan.done[id]) delete pr.plan.done[id]; else { pr.plan.done[id] = Date.now(); if (pr.plan.focus === id) delete pr.plan.focus; } persist(); render(); }; });
    document.querySelectorAll('[data-step-focus]').forEach((b) => { b.onclick = () => { pr.plan.focus = b.dataset.stepFocus; persist(); toast('Cette étape passe en premier dans vos nouvelles cartes'); render(); }; });
  }, 0);
  const rows = P.STEPS.map((st, i) => {
    const done = !!pr.plan.done[st.id]; const isCur = i === cur;
    const prog = st.kind === 'schema' ? P.stepProgress(st, state.fiches, pr.cards, mastery) : null;
    const links = st.kind === 'schema'
      ? `${st.fiches.map((f) => `<button class="btn sm" data-open-fiche="${esc(f)}">${ic('chart')} ${esc(shortTitle(f))}</button>`).join('')}${st.fiches.some((f) => VILLE_FICHES.includes(f)) ? `<button class="btn sm" data-go="ville">${ic('landmark')} Ville des institutions</button>` : ''}${shortsBtn(st.id)}${st.deep.length ? `<div class="muted" style="margin-top:6px">En détail : ${st.deep.map((f) => `<a href="#" data-open-fiche="${esc(f)}">${esc(shortTitle(f))}</a>`).join(' · ')}</div>` : ''}`
      : `<button class="btn sm" data-go="${st.action === 'weak' ? 'train' : st.action}">${st.action === 'exam' ? ic('timer') + ' Aller aux examens' : st.action === 'weak' ? ic('target') + ' Mes questions les plus ratées' : ic('repeat') + ' Réviser'}</button>`;
    return `<div class="card step ${done ? 'done' : ''} ${isCur ? 'cur' : ''}">
      <div class="row" style="justify-content:space-between"><span class="muted">${done ? 'faite' : stepDay[st.id] ? `prévue ${esc(dayLabel(stepDay[st.id]))}` : finalDay[st.id] && cal.find((x) => x.n === finalDay[st.id]) ? `prévue ${esc(dayLabel(cal.find((x) => x.n === finalDay[st.id])))}` : ''}${st.who ? ` · ${esc(st.who)}` : ''}</span>${done ? '<span class="badge">' + ic('check') + ' terminée</span>' : isCur ? '<span class="badge warn">en cours</span>' : ''}</div>
      <strong>${i + 1}. ${esc(st.title)}</strong>
      ${prog ? `<div class="progress" style="margin:8px 0 4px"><div style="width:${prog.total ? Math.round((prog.seen / prog.total) * 100) : 0}%"></div></div><div class="muted">${prog.seen}/${prog.total} questions vues · ${prog.known} acquises</div>` : `<p class="muted" style="margin:6px 0">${esc(st.hint)}</p>`}
      <div class="btnrow" style="margin-top:8px;flex-wrap:wrap">${links}</div>
      <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-step-done="${st.id}">${done ? ic('undo') + ' Rouvrir' : ic('check') + ' Marquer terminée'}</button>${!done && !isCur && st.kind === 'schema' ? `<button class="btn sm" data-step-focus="${st.id}">Commencer par celle-ci</button>` : ''}</div></div>`;
  }).join('');
  const calRows = cal.filter((day) => day.n >= 1).map((day) => {
    const what = [
      ...day.steps.map((id) => `${ic('chart')} ${esc(P.stepById(id)?.title || id)}`),
      day.exam ? `${ic('timer')} Examen blanc ${day.exam.toUpperCase()}` : '',
      day.kind === 'faibles' ? ic('target') + ' Points faibles et erreurs « j’étais sûr »' : '',
      day.kind === 'veille' ? ic('repeat') + ' Cartes à revoir uniquement, listes du palais, dormir' : '',
      day.kind === 'consolidation' ? ic('repeat') + ' Révisions, points faibles, jeux' : '',
      ...(day.merged || []).map((m) => m.kind === 'blanc' ? `${ic('timer')} Examen blanc ${m.exam.toUpperCase()} (regroupé)` : m.kind === 'faibles' ? ic('target') + ' Points faibles (regroupé)' : ic('repeat') + ' Veille (regroupée)'),
      ...(day.revise || []).map((id) => `${ic('book')} Relire : ${esc(P.stepById(id)?.title || id)}`),
      ...(day.late || []).map((x) => `${ic('undo')} Rattrapage : ${esc(P.stepById(x.id)?.title || x.id)}`),
      day.today && day.target ? `${ic('plus')} ${day.target} nouvelles questions` : '',
    ].filter(Boolean);
    return `<li class="${day.today ? 'today' : ''}"><div class="row" style="justify-content:space-between"><strong>${esc(dayLabel(day))}</strong><span class="badge ${day.today ? 'warn' : ''}">${day.today ? 'aujourd’hui' : esc(KIND_LABEL[day.kind])}</span></div><div class="muted">${what.join('<br>') || ic('repeat') + ' Révisions'}</div></li>`;
  }).join('');
  return `<div class="card"><h2>Mon plan jusqu’au ${esc(examDay())}</h2><p class="muted">Recalculé chaque matin d’après ce qui reste et vos résultats : une étape non finie est reportée, le nombre de nouvelles questions est recalé pour tout avoir vu à J-3, le point faible et le jeu du jour suivent vos erreurs. Les quatre derniers jours sont fixes ; si le délai est court, les étapes et examens manquants sont regroupés sur aujourd’hui, rien n’est supprimé.</p>
    <ol class="cal">${calRows}</ol><button class="btn primary" data-go="home">${ic('play')} Faire le plan du jour</button></div>
    <details class="card"><summary><strong>Les 15 étapes du parcours</strong> <span class="muted">(détail, schémas, marquer une étape)</span></summary><div style="margin-top:10px">${rows}</div></details>`;
};

views.review = () => {
  if (!state.session) {
    const { queue } = buildQueue(state.bank.questions, state.progress.cards, queueOpts());
    // Séance commencée plus tôt dans la journée (rechargement, retour dans l'app) : le compteur reprend où il en était.
    const d = ensureDaily(); const prev = !state.bonusNew && queue.length ? d.sess : null;
    state.session = { queue: [...queue], done: prev?.done || 0, total: (prev?.done || 0) + queue.length, ok: prev?.ok || 0 };
    state.bonusNew = false;
  }
  const s = state.session;
  if (!s.queue.length) {
    const again = Object.values(state.progress.cards).filter((c) => c.due <= Date.now()).length;
    state.session = null; ensureDaily().sess = null; persist();
    return `<div class="card center"><h2>Session terminée ${ic('party')}</h2><p>${s.done} cartes revues, ${s.ok} réussies du premier coup.</p>
      ${again ? `<p class="muted">${again} carte(s) « Encore » reviennent dans 10 min.</p>` : ''}</div>
      ${nextStepBlock()}<button class="btn" data-go="home">${ic('home')} Voir mon plan du jour</button>`;
  }
  const q = s.queue[0];
  setTimeout(() => {
    mountReviewCard(q);
    const sh = $('#short-sess'); if (sh) sh.onclick = () => { s.queue = s.queue.slice(0, SHORT_SESSION); s.total = s.done + s.queue.length; render(); };
  }, 0);
  const d = ensureDaily(); const stepIds = new Set(d.steps.flatMap((id) => P.stepQuestionIds(P.stepById(id), state.fiches)));
  const isNew = !state.progress.cards[q.id];
  return `${sessionStrip()}<div class="row" style="justify-content:space-between;margin-bottom:6px;flex-wrap:nowrap"><span>${isNew ? '<span class="badge new">' + ic('sparkles') + ' Nouvelle</span>' : '<span class="badge">' + ic('repeat') + ' À revoir</span>'} <span class="muted">${s.done + 1} / ${s.total}</span></span><span class="muted">${s.queue.length - 1 > 0 ? `encore ${s.queue.length - 1}` : 'dernière'}</span></div>
    ${stepIds.has(q.id) ? `<div class="muted ctx">${ic('chart')} Étape du jour : ${esc(d.steps.map((id) => P.stepById(id)?.title).join(', '))}</div>` : ''}
    <div class="progress"><div style="width:${(s.done / Math.max(1, s.total)) * 100}%"></div></div>
    ${s.done === 0 && s.queue.length > SHORT_SESSION + 5 ? `<div class="short-sess"><span class="muted">${s.queue.length} cartes dans cette séance.</span><button class="btn sm" id="short-sess">Faire ${SHORT_SESSION} seulement</button></div>` : ''}
    <div class="card" id="qcard" style="margin-top:12px"></div><div id="grade-peek"></div><div id="grade"></div>`;
};
// Séance courte (première séance chargée) : les cartes restantes attendent la prochaine séance.
const SHORT_SESSION = 10;
function mountReviewCard(q) {
  const box = $('#qcard'); if (!box) return;
  const mode = pickMode(q);
  const card = state.progress.cards[q.id];
  const set = state.progress.settings;
  const res = { conf: null, ratio: 0 };
  // La barre de notation suit la correction (on la lit avant de noter) ; tant qu'elle n'est pas à l'écran,
  // un rappel compact reste au-dessus des onglets et y mène.
  let seen = false;
  const showGrades = (suggest) => {
    $('#grade').innerHTML = `<div class="card gradebar"><div class="muted" style="margin-bottom:8px">Comment c’était ? <strong>La note proposée est surlignée</strong>${mode === 'qrc' ? ', d’après les éléments cochés' : ''} · sous chaque note, quand la question reviendra</div><div class="btnrow4">${GRADES.map((g) => `<button class="btn ${g.g === suggest ? 'primary' : ''}" data-g="${g.g}">${g.label}<small>${intervalLabel(card, g.g, q.id)}</small></button>`).join('')}</div></div>`;
    $('#grade').querySelectorAll('button[data-g]').forEach((b) => { b.onclick = () => gradeCurrent(q, Number(b.dataset.g), mode, res); });
    const peek = $('#grade-peek');
    if (peek && !seen) {
      peek.innerHTML = `<button class="btn sm gradepeek">Lire la correction, puis noter ↓ <span class="muted">proposé : ${GRADES[suggest]?.label || ''}</span></button>`;
      peek.firstChild.onclick = () => revealBelow($('#grade'));
      if (!state.gradeObs && 'IntersectionObserver' in window) {
        state.gradeObs = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen = true; $('#grade-peek')?.replaceChildren(); state.gradeObs.disconnect(); state.gradeObs = null; } }, { threshold: 0.6, rootMargin: '0px 0px -80px 0px' });
        state.gradeObs.observe($('#grade'));
      }
    }
  };
  state.gradeObs?.disconnect(); state.gradeObs = null;
  if (mode === 'qcm') {
    renderQcm(q, box, (ok, conf, pick) => { res.conf = conf; answer(q.id, ok, mode, { conf, pick }); showGrades(suggestGrade({ mode, ok, conf })); }, { hide: set.hideChoices, askConf: set.confidence });
  } else {
    renderQrc(q, box, (conf) => { res.conf = conf; }, (ratio, conf) => { res.ratio = ratio; showGrades(suggestGrade({ mode, ratio, conf })); }, { askConf: set.confidence });
  }
}
function gradeCurrent(q, g, mode, res = {}) {
  const s = state.session;
  const prev = state.progress.cards[q.id] || newCard();
  const wasNew = !state.progress.cards[q.id];
  state.progress.cards[q.id] = review(prev, g, Date.now(), reviewOpts(q.id));
  if (mode === 'qrc') {
    answer(q.id, g >= 2, mode, { conf: res.conf ?? null });
    if (confidentError(g >= 2, res.conf)) toast('Erreur commise avec certitude : relisez l’explication, elle revient dans la séance', 'alert');
  }
  s.queue.shift(); s.done += 1; if (g >= 2 && wasNew) s.ok += 1;
  if (g === 0) { s.queue.push(q); s.total += 1; }
  const d = ensureDaily();
  if (wasNew) d.newDone = (d.newDone || 0) + 1;
  d.sess = { done: s.done, ok: s.ok };
  state.progress.lastSession = Date.now();
  persist(); render();
}

views.train = () => {
  if (!state.train) state.train = { prof: 'all', theme: 'all', tag: 'all', mode: 'qcm', queue: null, idx: 0, ok: 0, n: 0 };
  const t = state.train;
  if (t.queue) {
    const q = t.queue[t.idx];
    if (!q) { const r = `<div class="card center"><h2>Série terminée</h2><p>${t.ok} / ${t.n} bonnes réponses${t.title ? ` · ${esc(t.title)}` : ''}</p></div>${nextStepBlock()}<div class="btnrow"><button class="btn" id="again">Autre série</button><button class="btn" data-go="home">${ic('home')} Plan du jour</button></div>`; setTimeout(() => { $('#again').onclick = () => { t.queue = null; t.title = null; render(); }; }, 0); return r; }
    setTimeout(() => {
      const box = $('#qcard');
      const next = () => { $('#next').classList.remove('hidden'); };
      const set = state.progress.settings; let qconf = null;
      if (t.mode === 'qcm') renderQcm(q, box, (ok, conf, pick) => { t.n++; if (ok) t.ok++; answer(q.id, ok, 'qcm', { conf, pick }); next(); }, { hide: set.hideChoices, askConf: set.confidence });
      else {
        renderQrc(q, box, (conf) => { qconf = conf; $('#selfgrade').classList.remove('hidden'); }, (ratio) => {
          $('#sg-ok').classList.toggle('primary', ratio >= 1); $('#sg-ko').classList.toggle('primary', ratio < 1);
        }, { askConf: set.confidence });
      }
      $('#next').onclick = () => { t.idx++; render(); };
      $('#sg-ok').onclick = () => { t.n++; t.ok++; answer(q.id, true, 'qrc', { conf: qconf }); t.idx++; render(); };
      $('#sg-ko').onclick = () => { t.n++; answer(q.id, false, 'qrc', { conf: qconf }); if (confidentError(false, qconf)) toast('Erreur commise avec certitude : relisez l’explication', 'alert'); t.idx++; render(); };
      $('#stop').onclick = () => { t.queue = null; t.title = null; render(); };
    }, 0);
    return `${sessionStrip()}${t.title ? `<div class="muted" style="margin-bottom:6px">${ic('target')} ${esc(t.title)}</div>` : ''}<div class="row" style="justify-content:space-between"><span class="muted">${t.idx + 1} / ${t.queue.length} · ${t.ok}/${t.n} ${ic('check')}</span><button class="btn sm" id="stop">Arrêter</button></div>
      <div class="card" id="qcard" style="margin-top:10px"></div>
      <div id="selfgrade" class="btnrow hidden"><button class="btn" id="sg-ko">${ic('x')} Je ne savais pas</button><button class="btn primary" id="sg-ok">${ic('check')} Je savais</button></div>
      <button class="btn primary hidden" id="next">Question suivante →</button>`;
  }
  const tags = {};
  state.bank.questions.forEach((q) => { if ((t.prof === 'all' || q.profession === t.prof)) q.tags.forEach((x) => { tags[x] = (tags[x] || 0) + 1; }); });
  const filtered = filterQuestions(t);
  setTimeout(() => {
    $('#f-prof').onchange = (e) => { t.prof = e.target.value; t.tag = 'all'; render(); };
    $('#f-theme').onchange = (e) => { t.theme = e.target.value; render(); };
    $('#f-tag').onchange = (e) => { t.tag = e.target.value; render(); };
    $('#f-mode').onchange = (e) => { t.mode = e.target.value; };
    $('#start').onclick = () => { t.queue = shuffle(filtered, Date.now()).slice(0, 20); t.idx = 0; t.ok = 0; t.n = 0; render(); };
    $('#weak').onclick = () => { t.queue = weakest(20); t.idx = 0; t.ok = 0; t.n = 0; if (!t.queue.length) { toast('Pas encore d’historique'); t.queue = null; } render(); };
    $('#sure').onclick = () => { const ids = confidentErrors(state.progress.attempts); if (!ids.length) return toast('Aucune erreur commise avec certitude pour l’instant'); trainOn(ids.slice(-20), 'Mes erreurs « j’étais sûr »', t.mode); };
  }, 0);
  const sure = confidentErrors(state.progress.attempts).length;
  return `${trainTabs('train')}<div class="card"><h2>Entraînement ciblé</h2>
    <label class="field">Profession<select id="f-prof"><option value="all">EC + CAC</option><option value="EC" ${t.prof === 'EC' ? 'selected' : ''}>Expert-comptable</option><option value="CAC" ${t.prof === 'CAC' ? 'selected' : ''}>Commissaire aux comptes</option></select></label>
    <label class="field">Thème<select id="f-theme"><option value="all">Tous</option>${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${t.theme === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field">Sujet précis<select id="f-tag"><option value="all">Tous</option>${Object.entries(tags).sort((a, b) => tagLabel(a[0]).localeCompare(tagLabel(b[0]), 'fr')).map(([k, n]) => `<option value="${k}" ${t.tag === k ? 'selected' : ''}>${esc(tagLabel(k))} (${n})</option>`).join('')}</select></label>
    <label class="field">Format<select id="f-mode"><option value="qcm" ${t.mode === 'qcm' ? 'selected' : ''}>QCM</option><option value="qrc" ${t.mode === 'qrc' ? 'selected' : ''}>QRC (réponse courte)</option></select></label>
    <p class="muted">${filtered.length} question(s) correspondent. Série de 20 max, sans effet sur la répétition espacée.</p>
    <button class="btn primary" id="start" ${filtered.length ? '' : 'disabled'}>Lancer la série</button>
    <div style="height:8px"></div><button class="btn" id="weak">${ic('flame')} Mes 20 questions les plus ratées</button>
    <div style="height:8px"></div><button class="btn" id="sure">${ic('alert')} Mes erreurs « j’étais sûr » (${sure})</button>
    <p class="muted" style="margin-top:8px">Une erreur faite avec certitude se corrige mieux qu’une autre, à condition d’y revenir : c’est la liste à reprendre en priorité.</p></div>`;
};
const trainTabs = (cur) => `<div class="tabs">${[['train', ic('target') + ' Séries'], ['jeux', ic('dice') + ' Jeux']].map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-go="${k}">${l}</button>`).join('')}</div>`;
function filterQuestions(t) {
  return state.bank.questions.filter((q) => (t.prof === 'all' || q.profession === t.prof) && (t.theme === 'all' || q.theme === t.theme) && (t.tag === 'all' || q.tags.includes(t.tag)));
}
function weakest(n) {
  const acc = {};
  for (const a of state.progress.attempts) { acc[a.id] = acc[a.id] || { ok: 0, n: 0 }; acc[a.id].n++; if (a.ok) acc[a.id].ok++; }
  return Object.entries(acc).filter(([, v]) => v.n - v.ok > 0).sort((a, b) => (a[1].ok / a[1].n) - (b[1].ok / b[1].n)).slice(0, n).map(([id]) => state.byId[id]).filter(Boolean);
}

views.exam = () => {
  if (state.examResult) return renderExamResult();
  if (!state.exam) {
    setTimeout(() => {
      $('#ex-qcm').onclick = () => beginExam('qcm');
      $('#ex-qrc').onclick = () => beginExam('qrc');
      document.querySelectorAll('[data-inedit]').forEach((b) => { b.onclick = () => beginExam(b.dataset.inedit, { inedit: true }); });
    }, 0);
    const hist = state.progress.exams.slice(-8);
    const ho = state.heldOut || [];
    const inedit = ho.length ? `<div class="card plan-card"><h2>Examen inédit · DEC ${esc(ho[0].sessionLabel)}</h2><p class="muted">Ce sujet complet est tenu à l’écart de la révision (séances, séries, jeux, examens blancs) : ses 20 questions sont neuves pour vous, comme le jour J. Le passer mesure ce que vous savez faire sur des questions jamais vues ; son résultat compte davantage dans le niveau estimé. À garder pour la dernière semaine, une seule fois : ensuite, ses questions rejoignent la révision.</p>
      <div class="btnrow"><button class="btn primary" data-inedit="qcm">Examen inédit en QCM</button><button class="btn primary" data-inedit="qrc">Examen inédit en QRC</button></div></div>` : '';
    return `<div class="card"><h2>Examen blanc</h2><p class="muted">20 questions tirées au sort (10 EC puis 10 CAC), 60 minutes, questions jamais passées en examen en priorité. QCM : 1 point par bonne réponse. QRC : barème du sujet d’origine, auto-correction à la fin, note ramenée sur 20. Vous pouvez mettre l’examen en pause (chrono arrêté) ou l’abandonner sans qu’il compte.</p>
      <div class="btnrow"><button class="btn primary" id="ex-qcm">QCM</button><button class="btn primary" id="ex-qrc">QRC</button></div></div>${inedit}
      ${hist.length ? `<div class="card"><h2>Historique</h2>${chart(hist)}<table><thead><tr><th>Date</th><th>Format</th><th>Note</th><th>EC</th><th>CAC</th></tr></thead><tbody>${hist.slice().reverse().map((e) => `<tr><td>${new Date(e.t).toLocaleDateString('fr-FR')}${e.inedit ? ' · inédit' : ''}</td><td>${e.mode.toUpperCase()}</td><td><strong>${e.note}</strong>${isCounted(e) ? '' : ' <span class="muted">(incomplète, non comptée)</span>'}</td><td>${pct(e.byProf.EC)}</td><td>${pct(e.byProf.CAC)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  }
  const ex = state.exam;
  const n = ex.ids.length; const answered = answeredCount(ex); const blank = n - answered;
  const timer = `<span class="timer" id="timer">${fmtMs(remainingMs(ex))}</span>`;
  if (ex.pausedAt) {
    setTimeout(() => {
      $('#ex-resume').onclick = () => { resumePaused(ex); persistExam(); startExamTimer(); render(); };
      $('#ex-hand').onclick = () => { state.examConfirm = true; resumePaused(ex); persistExam(); startExamTimer(); render(); };
      $('#ex-abandon').onclick = () => abandonExam();
    }, 0);
    return `<div class="card center"><div class="muted">Examen blanc ${ex.mode.toUpperCase()}${ex.inedit ? ' inédit' : ''} · en pause</div><div class="big">${ic('pause')} ${fmtMs(remainingMs(ex))}</div>
      <p class="muted">Le chrono est arrêté. ${answered}/${n} questions répondues. L’examen vous attend ici, même après avoir fermé l’application.</p>
      <div class="btnrow" style="justify-content:center"><button class="btn primary" id="ex-resume">${ic('play')} Reprendre l’examen</button></div>
      <div class="btnrow" style="justify-content:center;margin-top:8px"><button class="btn" id="ex-hand">Rendre la copie</button><button class="btn" id="ex-abandon">Abandonner (non compté)</button></div></div>`;
  }
  if (state.examConfirm) {
    setTimeout(() => {
      $('#ex-confirm').onclick = () => { state.examConfirm = false; endExam(); };
      $('#ex-back').onclick = () => { state.examConfirm = false; render(); };
      $('#ex-abandon').onclick = () => abandonExam();
      const first = $('#ex-first-blank'); if (first) first.onclick = () => { state.examConfirm = false; ex.current = ex.ids.findIndex((id) => !hasAnswer(ex, id)); persistExam(); render(); };
    }, 0);
    return `<div class="row" style="justify-content:space-between"><span class="muted">Rendre la copie ?</span>${timer}</div>
      <div class="card" style="margin-top:10px"><h2>${blank ? `${blank} question${blank > 1 ? 's' : ''} sans réponse` : 'Toutes les questions ont une réponse'}</h2>
      <p class="muted">${answered}/${n} répondues.${blank ? ' Une question sans réponse vaut 0.' : ''}${answered < n / 2 ? ' <strong>Moins de la moitié est répondue</strong> : la copie sera corrigée mais ne comptera ni dans le niveau estimé, ni dans les badges, ni dans le plan.' : ''}</p>
      ${blank ? `<div class="chips exam-grid">${ex.ids.map((id, i) => hasAnswer(ex, id) ? '' : `<span class="chip muted">${i + 1}</span>`).join('')}</div>` : ''}
      <div class="btnrow" style="margin-top:12px">${blank ? '<button class="btn primary" id="ex-first-blank">Répondre aux questions manquantes</button>' : ''}<button class="btn ${blank ? '' : 'primary'}" id="ex-confirm">Rendre la copie${blank ? ' quand même' : ''}</button></div>
      <div class="btnrow" style="margin-top:8px"><button class="btn" id="ex-back">← Continuer l’examen</button><button class="btn" id="ex-abandon">Abandonner (non compté)</button></div></div>`;
  }
  const q = examById()[ex.ids[ex.current]];
  setTimeout(() => mountExamQuestion(q), 0);
  return `<div class="row" style="justify-content:space-between"><span class="muted">Question ${ex.current + 1} / ${n} · <span class="badge ${q.profession.toLowerCase()}">${q.profession}</span></span><span class="row" style="gap:8px"><button class="btn sm" id="ex-pause">${ic('pause')} Pause / Quitter</button>${timer}</span></div>
    <div class="card" id="qcard" style="margin-top:10px"></div>
    <div class="btnrow"><button class="btn" id="prev" ${ex.current === 0 ? 'disabled' : ''}>← Précédente</button><button class="btn" id="next">${ex.current === n - 1 ? 'Terminer' : 'Suivante →'}</button></div>
    <div class="chips exam-grid" id="grid">${ex.ids.map((id, i) => `<button class="chip ${i === ex.current ? 'on' : ''} ${hasAnswer(ex, id) ? '' : 'muted'}" data-i="${i}" aria-label="Question ${i + 1}${hasAnswer(ex, id) ? ', répondue' : ', sans réponse'}">${i + 1}${hasAnswer(ex, id) ? ' ✓' : ''}</button>`).join('')}</div>
    <div class="exam-finish"><button class="btn" id="finish">Rendre la copie</button><span class="muted">${answered}/${n} répondues</span></div>`;
};
const hasAnswer = (ex, id) => { const a = ex.answers[id]; return a !== undefined && a !== null && String(a).trim() !== ''; };
const fmtMs = (ms) => { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
// Questions d'examen : la banque de révision, plus la session de l'examen inédit (tenue à l'écart).
function examById() {
  if (!state.heldOut?.length) return state.byId;
  return { ...state.byId, ...Object.fromEntries(state.heldOut.map((q) => [q.id, q])) };
}
// Examen inédit : une session entière tenue à l'écart de la révision (pickHeldOut, js/estimate.js), choisie une
// fois pour toutes et gardée dans plan.heldOut. Ses questions sont retirées de state.bank.questions (séances,
// séries, jeux, shorts, examens blancs, recoupements) jusqu'à ce que l'examen inédit soit rendu.
function setupHeldOut() {
  const pr = state.progress; const all = state.bank.all || state.bank.questions;
  state.bank.all = all;
  if (!pr.plan.heldOut) { pr.plan.heldOut = { session: pickHeldOut(all, pr), t: Date.now() }; persist(); }
  const s = pr.plan.heldOut.done ? null : pr.plan.heldOut.session;
  state.heldOut = s ? all.filter((q) => q.session === s) : [];
  state.bank.questions = s ? all.filter((q) => q.session !== s) : all;
}
function releaseHeldOut(t) {
  if (!state.heldOut?.length) return;
  state.progress.plan.heldOut.done = t;
  setupHeldOut();
  state.bank.questions.forEach((q) => { state.byId[q.id] = q; });
  state.clusters = buildClusters(state.bank.questions);
  state.gctx = G.buildContext(state.bank); refreshExamBadges();
}
// Examen en cours : sauvegardé à chaque réponse, repris après un rechargement.
function persistExam() {
  if (state.exam) store.saveExam(state.exam);
  else if (state.examResult?.pending) store.saveExam({ ...state.examResult.exam, pending: true });
}
function beginExam(mode, { inedit = false } = {}) {
  const fixed = inedit && state.heldOut?.length ? [...state.heldOut].sort((a, b) => (a.profession === b.profession ? a.n - b.n : a.profession === 'EC' ? -1 : 1)) : null;
  state.exam = startExam(state.bank.questions, state.progress.examSeen, mode, Date.now(), fixed);
  if (fixed) state.exam.inedit = fixed[0].session;
  state.examConfirm = false;
  persistExam();
  startExamTimer();
  render();
}
function resumeExam(saved) {
  if (!saved.ids.every((id) => examById()[id])) { store.saveExam(null); return; }
  if (saved.pending) { state.view = 'exam'; const { pending, ...ex } = saved; state.examResult = { pending: true, exam: ex }; return; }
  state.exam = saved;
  // En pause : rien ne presse, l'onglet Examen le montre.
  if (saved.pausedAt) { toast('Un examen blanc est en pause : onglet Examen pour le reprendre', 'timer'); return; }
  state.view = 'exam';
  if (remainingMs(saved) <= 0) { toast('Temps écoulé pendant votre absence : copie rendue'); endExam(); return; }
  toast(`Examen en cours : le chrono a continué pendant votre absence (${Math.ceil(remainingMs(saved) / 60000)} min restantes)`);
  startExamTimer();
}
// Pause explicite (bouton, ou changement d'onglet) : chrono arrêté, copie gardée.
function pauseCurrentExam(msg = 'Examen en pause : chrono arrêté. Reprenez-le depuis l’onglet Examen.') {
  const ex = state.exam; if (!ex || ex.pausedAt) return;
  pauseExam(ex); state.examConfirm = false; clearInterval(state.timer); persistExam(); toast(msg);
}
// Abandon : la copie n'est ni notée ni enregistrée (estimation, badges et plan inchangés).
function abandonExam() {
  if (!confirm('Abandonner l’examen ? Il ne sera ni noté ni compté.')) return;
  clearInterval(state.timer); state.exam = null; state.examConfirm = false; store.saveExam(null);
  toast('Examen abandonné : non compté'); render();
}
function startExamTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (!state.exam || state.exam.pausedAt) return clearInterval(state.timer);
    const ms = remainingMs(state.exam); const el = $('#timer');
    if (el) { el.textContent = fmtMs(ms); el.classList.toggle('low', ms < 5 * 60000); }
    if (ms <= 0) { toast('Temps écoulé'); state.examConfirm = false; endExam(); }
  }, 500);
}
function mountExamQuestion(q) {
  const ex = state.exam; const box = $('#qcard');
  if (ex.mode === 'qcm') {
    const order = shuffle([0, 1, 2, 3], q.id);
    box.innerHTML = `<div class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n}</div><div class="q">${esc(q.qcm.question || q.question)}</div><div class="choices"></div>`;
    const c = $('.choices', box);
    order.forEach((idx, i) => {
      const b = document.createElement('button'); b.className = 'choice' + (ex.answers[q.id] === idx ? ' sel' : '');
      b.innerHTML = `<span class="k">${LETTERS[i]}</span><span>${esc(q.qcm.choices[idx])}</span>`;
      b.onclick = () => { ex.answers[q.id] = idx; persistExam(); [...c.children].forEach((x, j) => x.classList.toggle('sel', j === i)); refreshGrid(); };
      c.appendChild(b);
    });
  } else {
    box.innerHTML = `<div class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n} · ${q.points} pt${q.points > 1 ? 's' : ''}</div><div class="q">${esc(q.qrc.question || q.question)}</div><textarea id="ans" placeholder="Réponse courte…">${esc(ex.answers[q.id] || '')}</textarea>`;
    $('#ans', box).oninput = (e) => { ex.answers[q.id] = e.target.value; persistExam(); refreshGrid(); };
  }
  const last = ex.ids.length - 1;
  $('#prev').onclick = () => { ex.current--; persistExam(); render(); };
  $('#next').onclick = () => { if (ex.current === last) { state.examConfirm = true; render(); } else { ex.current++; persistExam(); render(); } };
  $('#finish').onclick = () => { state.examConfirm = true; render(); };
  $('#ex-pause').onclick = () => { pauseCurrentExam('Examen en pause : chrono arrêté. Reprenez quand vous voulez, ou quittez par les onglets.'); render(); };
  $('#grid').querySelectorAll('button[data-i]').forEach((b) => { b.onclick = () => { ex.current = Number(b.dataset.i); persistExam(); render(); }; });
}
function refreshGrid() {
  const ex = state.exam; const g = $('#grid'); if (!g) return;
  g.querySelectorAll('button[data-i]').forEach((b) => { const i = Number(b.dataset.i); const has = hasAnswer(ex, ex.ids[i]); b.textContent = `${i + 1}${has ? ' ✓' : ''}`; b.classList.toggle('muted', !has); });
  const c = $('.exam-finish .muted'); if (c) c.textContent = `${answeredCount(ex)}/${ex.ids.length} répondues`;
}
function endExam() {
  clearInterval(state.timer);
  const ex = state.exam;
  if (ex.mode === 'qcm') {
    const res = finishExam(ex, examById());
    recordExam(res);
  } else {
    state.examResult = { pending: true, exam: ex };
  }
  state.exam = null; state.examConfirm = false;
  if (state.examResult?.pending) persistExam(); else store.saveExam(null);
  render(); window.scrollTo(0, 0); // la note /20 (ou l'auto-correction) en haut, pas le milieu du corrigé
}
function recordExam(res) {
  const { rows, answers, ...summary } = res;
  if (res.inedit) releaseHeldOut(res.t); // ses questions rejoignent la révision (et les badges)
  state.progress.exams.push(summary);
  res.ids.forEach((id) => { state.progress.examSeen[id] = res.t; });
  // Copie complète : chaque question compte (blanc = raté). Copie répondue à moins de 50 % : seules les réponses données.
  const counted = isCounted(summary);
  rows.forEach((r) => { if (counted || hasAnswer({ answers }, r.id)) answer(r.id, r.points >= r.max / 2, res.mode, { defer: true, t: res.t }); });
  G.applyExam(state.progress.stats, summary);
  state.examResult = { res };
  store.saveExam(null);
  checkBadges();
}
// Corrigé d'une question QCM : les 4 propositions dans l'ordre vu à l'examen, bonne réponse et choix.
function qcmReview(q, chosen) {
  const order = shuffle([0, 1, 2, 3], q.id);
  return `<div class="choices review">${order.map((idx, i) => `<div class="choice ${idx === q.qcm.answer ? 'ok' : idx === chosen ? 'ko' : ''}"><span class="k">${LETTERS[i]}</span><span>${esc(q.qcm.choices[idx])}${idx === chosen ? ' <em>(votre réponse)</em>' : ''}${idx === q.qcm.answer ? ic('check') : ''}</span></div>`).join('')}${chosen === undefined ? '<div class="muted">Question laissée en blanc.</div>' : ''}</div>`;
}
function renderExamResult() {
  const er = state.examResult;
  if (er.pending) {
    const ex = er.exam; const byId = examById();
    setTimeout(() => {
      ex.ids.forEach((id) => {
        const q = byId[id]; const inp = $(`#g-${CSS.escape(id)}`); if (!inp) return;
        inp.oninput = () => { ex.grading[id] = Math.max(0, Math.min(q.points || 2, Number(inp.value) || 0)); persistExam(); };
        // Cocher les éléments attendus propose les points (modifiables ensuite).
        const boxes = [...document.querySelectorAll(`[data-exp-for="${CSS.escape(id)}"]`)];
        boxes.forEach((b) => { b.onchange = () => { inp.value = qrcPoints(q.points || 2, boxes.filter((x) => x.checked).length / boxes.length); inp.oninput(); }; });
      });
      $('#validate').onclick = () => { recordExam(finishExam(ex, examById())); render(); window.scrollTo(0, 0); };
    }, 0);
    return `<div class="card"><h2>Auto-correction</h2><p class="muted">Cochez les éléments attendus présents dans votre réponse : les points sont proposés au prorata (barème du sujet), et restent modifiables.</p></div>
      ${ex.ids.map((id, i) => { const q = byId[id]; return `<div class="card">${qHeader(q)}<div class="q">${i + 1}. ${esc(q.qrc.question || q.question)}</div>
        <div class="muted"><strong>Votre réponse :</strong> ${esc(ex.answers[id] || '—')}</div>
        <div class="answer"><strong>Attendu :</strong><ul class="expected">${q.qrc.expected.map((e, k) => `<li><input type="checkbox" id="x-${esc(id)}-${k}" data-exp-for="${esc(id)}"><label for="x-${esc(id)}-${k}">${esc(e)}</label></li>`).join('')}</ul><div>${esc(q.qrc.model_answer)}</div></div>${qExplain(q)}
        <label class="field">Points obtenus (sur ${q.points || 2})<input type="number" id="g-${esc(id)}" min="0" max="${q.points || 2}" step="0.5" value="${ex.grading[id] || 0}"></label></div>`; }).join('')}
      <button class="btn primary" id="validate">Valider la note</button>`;
  }
  const r = er.res;
  setTimeout(() => { $('#close').onclick = () => { state.examResult = null; render(); }; }, 0);
  const full = isCounted(r);
  return `<div class="card center"><div class="muted">Examen blanc ${r.mode.toUpperCase()}${r.inedit ? ' inédit' : ''}</div><div class="big">${r.note}/20</div>
      <div class="muted">${!full ? `Copie incomplète (${r.answered}/${r.ids.length} répondues) : non comptée dans le niveau estimé ni les badges` : r.note < 6 ? 'Éliminatoire (< 6)' : r.note < 10 ? 'Sous la moyenne' : r.note < 14 ? 'Validé' : 'Très bon'} · EC ${pct(r.byProf.EC)} · CAC ${pct(r.byProf.CAC)}</div>${r.answered != null && full && r.answered < r.ids.length ? `<div class="muted">${r.ids.length - r.answered} question${r.ids.length - r.answered > 1 ? 's' : ''} sans réponse</div>` : ''}</div>
    <div class="card"><h2>Par thème</h2><table><tbody>${Object.entries(r.byTheme).map(([k, v]) => `<tr><td>${THEMES[k]}</td><td>${v.points}/${v.max}</td></tr>`).join('')}</tbody></table></div>
    ${r.rows.map((row, i) => { const q = row.q; const ok = row.points >= row.max; return `<div class="card" style="border-left:4px solid ${ok ? 'var(--ok)' : row.points > 0 ? 'var(--warn)' : 'var(--ko)'}">${qHeader(q)}<div class="q" style="font-size:16px">${i + 1}. ${esc(r.mode === 'qcm' ? (q.qcm.question || q.question) : (q.qrc.question || q.question))}</div>
      ${r.mode === 'qcm'
    ? `${qcmReview(q, r.answers[q.id])}<details ${ok ? '' : 'open'}><summary>Explication</summary>${qExplain(q)}</details>`
    : `<div class="muted">Votre réponse : ${esc(r.answers[q.id] || '—')}</div><div class="answer">${esc(q.qrc.model_answer)}</div><details><summary>Explication</summary>${qExplain(q)}</details>`}</div>`; }).join('')}
    ${nextStepBlock()}<button class="btn" id="close">Fermer le corrigé</button>`;
}

views.fiches = () => {
  if (state.ficheOpen) {
    const meta = state.fiches.find((f) => f.file === state.ficheOpen) || {};
    const n = (meta.questions || []).length;
    const trainBtn = (id) => n ? `<button class="btn primary" id="${id}">${ic('target')} S’entraîner sur ce schéma (${Math.min(20, n)} questions)</button>` : '';
    setTimeout(async () => {
      $('#back').onclick = () => { state.ficheOpen = null; render(); };
      document.querySelectorAll('#fiche-train, #fiche-train2').forEach((b) => { b.onclick = () => trainOn(shuffle(meta.questions, Date.now()).slice(0, 20), meta.title); });
      const file = state.ficheOpen;
      try { $('#fiche').innerHTML = renderMarkdown(await loadFiche(file)); addToc($('#fiche')); trackRead(file, () => (state.view === 'fiches' && state.ficheOpen === file && !$('#sheet')?.classList.contains('show') ? window : null)); } catch { $('#fiche').textContent = 'Fiche indisponible hors ligne (ouvrez-la une fois en ligne).'; }
    }, 0);
    return `<div class="row" style="gap:8px"><button class="btn sm" id="back">← Fiches</button>${seenBtn(state.ficheOpen)}${villeBtn(state.ficheOpen)}</div>${n ? `<div style="margin-top:10px">${trainBtn('fiche-train')}</div>` : ''}<div class="card fiche" id="fiche" style="margin-top:10px">Chargement…</div>${trainBtn('fiche-train2')}`;
  }
  setTimeout(() => { document.querySelectorAll('[data-fiche]').forEach((b) => { b.onclick = () => openFiche(b.dataset.fiche); }); }, 0);
  if (!state.fiches.length) return `<div class="card"><h2>Fiches</h2><p class="muted">Aucune fiche disponible pour l’instant.</p></div>`;
  const item = (f, label = '') => `<button class="btn" data-fiche="${esc(f.file)}"><span>${label ? `<span class="muted">${label}</span><br>` : ''}${esc(f.title)}</span><span>${P.isRead(state.progress.plan, f.file) ? ic('check') : ''}${f.questions ? `<span class="muted">${f.questions.length} Q</span> ` : ''}›</span></button>`;
  // Schémas dans l'ordre du parcours (numéro d'étape), fiches de référence par profession.
  const steps = []; P.STEPS.forEach((st, i) => (st.fiches || []).forEach((file) => { if (!steps.some((x) => x.file === file)) steps.push({ file, n: i + 1 }); }));
  const visuels = state.fiches.filter((f) => f.kind === 'visuel').map((f) => ({ f, n: steps.find((x) => x.file === f.file)?.n || 99 })).sort((a, b) => a.n - b.n);
  const synth = state.fiches.filter((f) => f.kind !== 'visuel');
  const ec = synth.filter((f) => /-ec-/.test(f.file)); const cac = synth.filter((f) => /-cac-/.test(f.file));
  const seenCount = state.fiches.filter((f) => P.isRead(state.progress.plan, f.file)).length;
  return `${villeEntry()}${carteEntry()}<div class="card plan-card"><strong>Par où commencer ?</strong><p class="muted" style="margin:4px 0 8px">Les schémas sont rangés dans l’ordre du parcours : lisez-les dans cet ordre. Les fiches de référence donnent le détail, à consulter au besoin. ${ic('check')} = vue (bouton « Vu » dans chaque fiche, décochable).</p><p style="margin:0 0 8px"><strong>${seenCount} / ${state.fiches.length}</strong> fiches vues</p><div class="btnrow"><button class="btn primary" data-go="plan">${ic('compass')} Ouvrir le parcours</button><button class="btn" data-go="glossaire">${ic('book')} Glossaire</button><a class="btn" href="./data/fiches-a-imprimer.pdf" target="_blank" rel="noopener">${ic('library')} PDF à imprimer (A4, noir et blanc)</a><a class="btn" href="./data/fiches-a-imprimer-2-par-feuille.pdf" target="_blank" rel="noopener">${ic('library')} PDF livret à relier (2 pages par feuille, recto verso)</a></div></div>${visuels.length ? `<div class="card"><h2>Schémas, dans l’ordre du parcours</h2><p class="muted">Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision.</p><div class="list">${visuels.map(({ f, n }) => item(f, n < 99 ? `Étape ${n}` : '')).join('')}</div></div>` : ''}
    <div class="card"><h2>Fiches de référence</h2><h3>Expert-comptable</h3><div class="list">${ec.map((f) => item(f)).join('')}</div><h3>Commissaire aux comptes</h3><div class="list">${cac.map((f) => item(f)).join('')}</div></div>`;
};
// Sommaire déroulant en tête des fiches longues.
function addToc(root) {
  const hs = [...root.querySelectorAll('h3')];
  if (hs.length < 4) return;
  const toc = document.createElement('details'); toc.className = 'toc';
  toc.innerHTML = `<summary>Sommaire · ${hs.length} parties</summary>${hs.map((h, i) => `<button class="btn sm" data-toc="${i}">${esc(h.textContent)}</button>`).join('')}`;
  root.insertBefore(toc, root.children[1] || null);
  toc.querySelectorAll('[data-toc]').forEach((b) => { b.onclick = () => { toc.open = false; hs[Number(b.dataset.toc)].scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
}
function openFiche(file) { state.ficheOpen = file; go('fiches'); }
// Fiches qui ont leur quartier dans la ville des institutions : bouton vers la vue 3D.
const VILLE_FICHES = ['12-schema-institutions-ec-cac.md', '13-schema-discipline.md', '22-schema-sanctions-h2a.md', '21-schema-responsabilites.md', '17-schema-secret-signalements.md'];
function villeBtn(file) { return VILLE_FICHES.includes(file) ? `<button class="btn sm" data-go="ville">${ic('landmark')} Voir la ville des institutions</button>` : ''; }
// Une séance, une série, un jeu ou un examen est en cours : les liens s'ouvrent par-dessus, sans le quitter.
function inActivity() {
  const v = state.view;
  return (v === 'review' && !!state.session) || (v === 'train' && !!state.train?.queue) || (v === 'jeux' && !!state.game)
    || v === 'exam' || (v === 'carriere' && !!state.palais);
}
function sheet(html) {
  const el = $('#sheet');
  el.innerHTML = `<div class="sheet-head"><button class="btn sm" id="sheet-close">${ic('x')} Fermer et reprendre</button></div><div class="sheet-body">${html}</div>`;
  if (!el.classList.contains('show')) { try { history.pushState({ v: state.view, sheet: 1 }, ''); } catch { /* ignore */ } }
  el.classList.add('show'); document.body.classList.add('noscroll');
  $('#sheet-close').onclick = () => closeSheet();
  el.scrollTop = 0;
  focusIn(el, $('#sheet-close'));
}
function closeSheet(viaPop = false) {
  const el = $('#sheet'); if (!el?.classList.contains('show')) return;
  el.classList.remove('show'); document.body.classList.remove('noscroll');
  focusBack(el);
  if (!viaPop && history.state?.sheet) history.back(); // retire l'entrée « fiche ouverte » de l'historique
  // Hors activité (accueil, plan…), l'écran se met à jour (schéma lu, tâche suivante) ; sinon tout reste en l'état.
  if (!inActivity()) render();
}
// Schéma « lu » pour le plan : seulement après l'avoir parcouru jusqu'en bas (15 s au moins), ou après 40 s
// s'il tient à l'écran. Ouvrir puis refermer aussitôt ne coche plus la tâche.
function trackRead(file, scroller) {
  state.readStop?.(); state.readStop = null;
  const pr = state.progress; if (P.isRead(pr.plan, file) || pr.plan.unread?.[file]) return;
  const target = scroller(); if (!target) return;
  const t0 = Date.now(); let reachedBottom = false;
  const measure = () => (target === window
    ? { top: window.scrollY, height: window.innerHeight, total: document.documentElement.scrollHeight }
    : { top: target.scrollTop, height: target.clientHeight, total: target.scrollHeight });
  const onScroll = () => { if (P.atBottom(measure())) reachedBottom = true; };
  const stop = () => { clearInterval(timer); target.removeEventListener('scroll', onScroll); if (state.readStop === stop) state.readStop = null; };
  const timer = setInterval(() => {
    if (scroller() !== target) return stop(); // fiche fermée ou autre écran
    const m = measure(); reachedBottom = reachedBottom || P.atBottom(m);
    if (!P.readDone({ reachedBottom, fits: P.fitsScreen(m), elapsedMs: Date.now() - t0 })) return;
    stop();
    P.setRead(pr.plan, file, true); persist(); refreshSeen(file);
    toast('Fiche vue : notée dans votre progression', 'chart');
  }, 1000);
  target.addEventListener('scroll', onScroll, { passive: true });
  state.readStop = stop;
}
// Bouton « Vu » : coche ou décoche la fiche dans la progression (liste des fiches, parcours, tâches du jour).
function seenBtn(file) {
  const on = P.isRead(state.progress.plan, file);
  return `<button class="btn sm seen ${on ? 'on' : ''}" data-seen="${esc(file)}" aria-pressed="${on}">${on ? ic('check') : ic('eye')} Vu</button>`;
}
function refreshSeen(file) { document.querySelectorAll(`[data-seen="${CSS.escape(file)}"]`).forEach((b) => { b.outerHTML = seenBtn(file); }); }
function toggleSeen(file) {
  const on = !P.isRead(state.progress.plan, file);
  state.readStop?.(); P.setRead(state.progress.plan, file, on); persist(); refreshSeen(file);
  toast(on ? 'Fiche marquée vue' : 'Fiche marquée non vue');
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-seen]'); if (b) toggleSeen(b.dataset.seen); });
// Fiche en surimpression : la lecture est notée pour le parcours (voir trackRead).
async function ficheSheet(file) {
  const meta = state.fiches.find((f) => f.file === file) || {};
  const n = (meta.questions || []).length;
  const step = P.STEPS.find((st) => st.fiches?.includes(file));
  sheet(`<div class="row" style="gap:8px;margin-bottom:10px">${seenBtn(file)}${VILLE_FICHES.includes(file) && !inActivity() ? `<button class="btn sm" id="sheet-ville">${ic('landmark')} La ville des institutions</button>` : ''}</div><div class="card fiche" id="sheet-fiche">Chargement…</div>${n && !inActivity() ? `<button class="btn primary" id="sheet-train">${ic('target')} S’entraîner sur ce schéma (${Math.min(20, n)} questions)</button>` : ''}${step && !inActivity() ? `<div style="margin-top:10px">${shortsBtn(step.id)}</div>` : ''}`);
  const tb = $('#sheet-train'); if (tb) tb.onclick = () => { closeSheet(true); trainOn(shuffle(meta.questions, Date.now()).slice(0, 20), meta.title); };
  const vb = $('#sheet-ville'); if (vb) vb.onclick = () => { closeSheet(true); go('ville'); };
  try {
    const box = $('#sheet-fiche'); box.dataset.file = file; box.innerHTML = renderMarkdown(await loadFiche(file)); addToc(box);
    trackRead(file, () => { const el = $('#sheet'); return el?.classList.contains('show') && $('#sheet-fiche')?.dataset.file === file ? el : null; });
  } catch { $('#sheet-fiche').textContent = 'Fiche indisponible hors ligne (ouvrez-la une fois en ligne).'; }
}
// Même notion aux autres sessions : énoncés et réponses, en surimpression.
function variantsSheet(id) {
  const ids = siblings(id);
  sheet(`<div class="card"><h2>Même notion, autres sessions</h2><p class="muted">Le jury repose les mêmes règles sous d’autres formes : vérifiez que vous sauriez répondre à chaque variante.</p></div>
    ${ids.map((x) => { const q = state.byId[x]; return `<div class="card"><div class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n} · ${q.profession}</div><div class="q" style="font-size:16px">${esc(q.question)}</div><details><summary>Réponse</summary><div class="answer">${esc(q.qrc.model_answer)}</div><div class="ref">Réf. : ${esc(q.reference)}</div></details></div>`; }).join('')}
    <button class="btn primary" id="sheet-variants">${ic('target')} S’entraîner sur ces ${ids.length + 1} questions</button>`);
  $('#sheet-variants').onclick = () => { closeSheet(true); trainOn([id, ...ids], 'Même notion, plusieurs sessions', state.train?.mode || 'qcm'); };
}
// Schémas qui résument une question (lien affiché sous l'explication)
function relatedFiches(id) { return state.fiches.filter((f) => f.kind === 'visuel' && f.questions?.includes(id)); }

views.stats = () => {
  const qs = state.bank.questions; const cards = state.progress.cards;
  const rows = [];
  for (const p of ['EC', 'CAC']) for (const t of Object.keys(THEMES)) {
    const sub = qs.filter((q) => q.profession === p && q.theme === t);
    const m = [0, 0, 0, 0]; sub.forEach((q) => { m[mastery(cards[q.id])]++; });
    rows.push({ p, t, n: sub.length, m });
  }
  const last = state.progress.attempts.slice(-50);
  const acc = last.length ? Math.round((last.filter((a) => a.ok).length / last.length) * 100) : null;
  const tagAcc = {};
  for (const a of state.progress.attempts) { const q = state.byId[a.id]; if (!q) continue; for (const tg of q.tags) { tagAcc[tg] = tagAcc[tg] || { ok: 0, n: 0 }; tagAcc[tg].n++; if (a.ok) tagAcc[tg].ok++; } }
  const weakTags = Object.entries(tagAcc).filter(([, v]) => v.n >= 3).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 8);
  const due7 = Object.values(cards).filter((c) => c.due <= Date.now() + 7 * DAY).length;
  return `<div class="row" style="gap:8px;margin-bottom:12px"><button class="btn sm" data-go="home">← Accueil</button><button class="btn sm" data-go="carte">${ic('brain')} Carte des notions</button></div><div class="grid2"><div class="stat"><div class="n">${acc === null ? '–' : acc + ' %'}</div><div class="l">réussite (50 dernières)</div></div><div class="stat"><div class="n">${due7}</div><div class="l">à revoir sous 7 jours</div></div></div>
    <div class="card"><h2>Maîtrise par thème</h2><div class="muted" style="margin-bottom:8px"><i class="m3" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> acquise <i class="m2" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> en cours <i class="m1" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> apprentissage · gris = jamais vue · chiffre : questions de la barre (couleurs) / total, ${ic('check')} = acquises</div>
      ${rows.map((r) => `<div class="mastery" style="margin:6px 0"><div><span class="badge ${r.p.toLowerCase()}">${r.p}</span> ${THEMES[r.t]}</div><div class="bar">${[3, 2, 1].map((k) => `<i class="m${k}" style="width:${(r.m[k] / Math.max(1, r.n)) * 100}%"></i>`).join('')}</div><div class="muted" title="${r.m[3]} acquise(s)">${r.n - r.m[0]}/${r.n}${r.m[3] ? ` <span class="m3t">(${r.m[3]} ${ic('check')})</span>` : ''}</div></div>`).join('')}</div>
    ${estimateCard()}
    ${calibrationCard()}
    ${confusionCard()}
    ${recurringCard()}
    ${weakTags.length ? `<div class="card"><h2>Points faibles</h2><table><tbody>${weakTags.map(([k, v]) => `<tr><td>${esc(tagLabel(k))}</td><td>${Math.round((v.ok / v.n) * 100)} % (${v.n})</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${state.progress.exams.length ? `<div class="card"><h2>Examens blancs</h2>${chart(state.progress.exams.slice(-12))}</div>` : ''}
    <div class="card"><h2>Banque</h2><div class="muted">${qs.length} questions · ${state.bank.sessions.length} sessions (${state.bank.sessions[0].session} → ${state.bank.sessions[state.bank.sessions.length - 1].session})<br>Confiance : ${['high', 'medium', 'low'].map((c) => `${c} ${qs.filter((q) => q.confidence === c).length}`).join(' · ')}</div></div>`;
};
// Calibration : la certitude annoncée correspond-elle à la réussite ?
function calibrationCard() {
  const c = calibration(state.progress.attempts);
  const total = c[0].n + c[1].n + c[2].n;
  if (!total) return '';
  const p = (x) => (x.n ? Math.round((x.ok / x.n) * 100) : null);
  const sure = p(c[2]), guess = p(c[0]);
  const tips = [];
  if (sure !== null && c[2].n >= 10 && sure < 85) tips.push('Excès de confiance : « sûr » devrait viser 90 % et plus. Reprenez « Mes erreurs « j’étais sûr » ».');
  if (guess !== null && c[0].n >= 10 && guess > 50) tips.push('Vous en savez plus que vous ne le pensez : au hasard, on n’aurait que 25 % en QCM.');
  if (!tips.length && c[2].n >= 10) tips.push('Bonne calibration : votre certitude est un indicateur fiable.');
  return `<div class="card"><h2>Calibration</h2><table><thead><tr><th>Certitude annoncée</th><th>Réussite</th><th>Réponses</th></tr></thead><tbody>${[[2, 'Sûr'], [1, 'Hésitant'], [0, 'Au hasard / je ne sais pas']].map(([k, l]) => `<tr><td>${l}</td><td><strong>${p(c[k]) === null ? '–' : p(c[k]) + ' %'}</strong></td><td>${c[k].n}</td></tr>`).join('')}</tbody></table>${tips.map((t) => `<p class="muted">${esc(t)}</p>`).join('')}</div>`;
}
// Confusion EC / CAC : choix du leurre « règle de l'autre profession » (QCM marqués qcm.crossProf) et intrus de même nature.
// Le jury le relève à chaque session : les candidats appliquent au CAC la règle de l'EC, et inversement.
function confusionCard() {
  const c = GM.confusionStats(state.progress.attempts, state.byId);
  const marked = state.bank.questions.filter((q) => Number.isInteger(q.qcm?.crossProf)).length;
  const it = state.gameData ? GM.intrusCrossStats(state.gameData.intrus || [], state.progress.drills) : { n: 0 };
  if (!c.n && !it.n) return `<div class="card"><h2>Confusion EC / CAC</h2><p class="muted">${marked} QCM ont un leurre qui est la règle de l’autre profession. Répondez à quelques QCM : la part de vos réponses qui le choisissent s’affichera ici.</p></div>`;
  const pc = (x) => (x === null || x === undefined ? '–' : `${Math.round(x * 100)} %`);
  const row = (k) => { const v = c.byProf[k]; return `<tr><td>${k === 'EC' ? 'Questions EC' : 'Questions CAC'}</td><td><strong>${v.n ? pc(v.cross / v.n) : '–'}</strong></td><td>${v.n}</td></tr>`; };
  const tip = c.n >= 8 && c.rate >= 0.15 ? '<p class="muted">Confusion fréquente : jouez au Duel EC / CAC et à « Trouvez l’intrus », qui opposent les règles voisines des deux professions.</p>' : '';
  return `<div class="card"><h2>Confusion EC / CAC</h2><p class="muted">Part des réponses QCM qui choisissent le leurre « règle de l’autre profession » (${marked} QCM en ont un).</p>
    ${c.n ? `<table><thead><tr><th></th><th>Leurre choisi</th><th>Réponses</th></tr></thead><tbody><tr><td>Ensemble</td><td><strong>${pc(c.rate)}</strong></td><td>${c.n}</td></tr>${row('EC')}${row('CAC')}</tbody></table>
    <p class="muted">${c.wrong ? `Parmi vos erreurs sur ces questions, ${pc(c.shareOfErrors)} viennent de ce leurre.` : 'Aucune erreur sur ces questions pour l’instant.'}</p>` : ''}
    ${it.n ? `<p class="muted">Trouvez l’intrus, quand l’intrus est la règle de l’autre profession : ${pc(it.rate)} d’erreurs (${it.n} réponse${it.n > 1 ? 's' : ''}).</p>` : ''}${tip}</div>`;
}
// Recoupement des annales : une notion est acquise quand au moins deux de ses variantes ont été réussies.
function recurringCard() {
  const st = state.progress.stats;
  const groups = state.clusters.groups;
  if (!groups.length) return '';
  const rows = groups.map((g, n) => ({ n, g, ok: g.filter((id) => st.q[id]?.ok > 0).length }));
  const known = rows.filter((r) => r.ok >= 2).length;
  const todo = rows.filter((r) => r.ok < 2).sort((a, b) => b.g.length - a.g.length).slice(0, 6);
  setTimeout(() => { document.querySelectorAll('[data-cluster]').forEach((b) => { b.onclick = () => { const g = groups[Number(b.dataset.cluster)]; trainOn(g, 'Même notion, plusieurs sessions'); }; }); }, 0);
  return `<div class="card"><h2>Notions récurrentes</h2><p class="muted">${groups.length} notions posées à plusieurs sessions (${groups.reduce((x, g) => x + g.length, 0)} questions). Une notion compte comme acquise quand <strong>deux variantes</strong> au moins sont réussies : on vérifie qu’on a compris la règle, pas mémorisé une formulation.</p>
    <div class="progress" style="margin:8px 0"><div style="width:${Math.round((known / groups.length) * 100)}%"></div></div><div class="muted">${known}/${groups.length} acquises</div>
    ${todo.length ? `<div class="list" style="margin-top:10px">${todo.map((r) => `<button class="btn" data-cluster="${r.n}"><span style="text-align:left">${esc((state.byId[r.g[0]]?.question || '').slice(0, 70))}…</span><span class="muted">${r.ok}/${r.g.length}</span></button>`).join('')}</div>` : ''}</div>`;
}
function chart(exams) {
  const w = 320, h = 110, pad = 18; const n = exams.length; const bw = (w - pad * 2) / Math.max(n, 1);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${[6, 10, 14].map((y) => `<line x1="${pad}" x2="${w - pad}" y1="${h - 10 - (y / 20) * (h - 20)}" y2="${h - 10 - (y / 20) * (h - 20)}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="0" y="${h - 8 - (y / 20) * (h - 20)}" font-size="9" fill="var(--muted)">${y}</text>`).join('')}
    ${exams.map((e, i) => { const bh = (e.note / 20) * (h - 20); return `<rect x="${pad + i * bw + 3}" y="${h - 10 - bh}" width="${Math.max(4, bw - 6)}" height="${bh}" rx="3" fill="${e.note < 6 ? 'var(--ko)' : e.note < 10 ? 'var(--warn)' : 'var(--primary)'}"/><text x="${pad + i * bw + bw / 2}" y="${h - 12 - bh}" font-size="9" text-anchor="middle" fill="var(--text)">${e.note}</text>`; }).join('')}</svg>`;
}

views.settings = () => {
  const s = state.progress.settings;
  // Réglages modifiés ici : datés, pour que la synchro garde les plus récents
  const persistS = () => { state.progress.settingsAt = Date.now(); persist(); };
  setTimeout(() => {
    $('#s-new').onchange = (e) => { s.newPerDay = Math.max(0, Number(e.target.value) || 0); persistS(); };
    $('#s-exam').onchange = (e) => {
      const v = e.target.value;
      if (v) {
        const r = P.validateExamDate(v, G.dayKey(Date.now()));
        if (!r.ok) { toast(r.reason === 'passee' ? 'La date de l’examen doit être à venir' : 'Date invalide'); e.target.value = (s.examDate || '').slice(0, 16); return; }
      }
      s.examDate = v ? `${v}:00` : '';
      refreshExamBadges(); G.applyOpen(state.progress.stats, Date.now(), state.gctx);
      state.progress.daily = null; persistS(); toast(v ? 'Date enregistrée : plan recalculé' : 'Date effacée : parcours générique'); render();
    };
    $('#s-mode').onchange = (e) => { s.mode = e.target.value; persistS(); };
    $('#s-low').onchange = (e) => { s.showLowConfidence = e.target.checked; persistS(); };
    $('#s-conf').onchange = (e) => { s.confidence = e.target.checked; persistS(); };
    $('#s-hide').onchange = (e) => { s.hideChoices = e.target.checked; persistS(); };
    $('#s-focus').onchange = (e) => { s.focus = e.target.checked; persistS(); };
    $('#s-gl').onchange = (e) => { s.glossary = e.target.checked; persistS(); };
    $('#s-timer').onchange = (e) => { s.gameTimer = e.target.value; persistS(); };
    $('#s-shorts').onchange = (e) => { s.shortsLimit = Number(e.target.value) || 0; persistS(); };
    $('#s-look').onchange = (e) => { s.look = e.target.value; applyLook(); persistS(); render(); };
    $('#s-theme').onchange = (e) => { document.documentElement.dataset.theme = e.target.value; try { localStorage.setItem('dec1.theme', e.target.value); } catch { /* ignore */ } };
    $('#export').onclick = exportProgress;
    $('#copy').onclick = async () => {
      try { await navigator.clipboard.writeText(store.exportJSON(state.progress)); markExported(); toast('Sauvegarde copiée : collez-la dans une note ou un message'); } catch { toast('Copie impossible sur cet appareil'); }
    };
    $('#import').onchange = async (e) => { const f = e.target.files[0]; if (f) applyImport(await f.text()); e.target.value = ''; };
    $('#paste-go').onclick = () => { const t = $('#paste').value.trim(); if (t) applyImport(t); else toast('Collez d’abord le texte de la sauvegarde'); };
    $('#reset').onclick = () => {
      if (!confirm('Effacer toute la progression ? Une copie de l’état actuel est conservée pour annuler.')) return;
      state.progress = store.reset(state.progress); initGamify(); persist(); toast('Progression effacée'); render();
    };
    const undo = $('#undo');
    if (undo) undo.onclick = () => {
      const prev = store.restorePrev(); if (!prev) return toast('Aucun état précédent');
      if (!confirm('Revenir à l’état précédent ? L’état actuel sera conservé à son tour.')) return;
      store.snapshotPrev(state.progress); state.progress = prev; initGamify(); persist(); toast('État précédent restauré'); render();
    };
    $('#help-again').onclick = () => { s.helpSeen = false; persist(); go('home'); };
    const sc = $('#sync-connect');
    if (sc) sc.onclick = async () => {
      const url = SY.normalizeUrl($('#sync-url').value); const token = $('#sync-token').value.trim();
      if (!url) return toast('Adresse invalide : elle commence par https://');
      if (!token) return toast('Saisissez le code secret');
      if (!SY.setConfig({ url, token })) return toast('Enregistrement impossible sur cet appareil');
      toast('Connexion…'); await runSync({ manual: true });
    };
    const sn = $('#sync-now'); if (sn) sn.onclick = () => runSync({ manual: true });
    const so = $('#sync-off');
    if (so) so.onclick = () => {
      if (!confirm('Déconnecter cet appareil ? La progression reste sur l’appareil et en ligne ; elle ne sera simplement plus synchronisée.')) return;
      SY.setConfig(null); toast('Synchronisation désactivée sur cet appareil'); render();
    };
    $('#update').onclick = () => refreshApp();
  }, 0);
  return `<div class="card"><h2>Réglages</h2>
    <label class="field">Date de l’examen (le plan et les révisions s’y adaptent ; vide = parcours générique de 4 semaines)<input type="datetime-local" id="s-exam" value="${esc((s.examDate || '').slice(0, 16))}"></label>
    <label class="field">Nouvelles cartes par jour, au minimum (le plan en demande plus s’il le faut pour tout voir à J-3)<input type="number" id="s-new" min="0" max="100" value="${s.newPerDay}"></label>
    <label class="field">Format de révision<select id="s-mode"><option value="mixte" ${s.mode === 'mixte' ? 'selected' : ''}>Mixte (QCM pour découvrir, puis QRC)</option><option value="qcm" ${s.mode === 'qcm' ? 'selected' : ''}>QCM uniquement</option><option value="qrc" ${s.mode === 'qrc' ? 'selected' : ''}>QRC uniquement</option></select></label>
    <label class="field"><input type="checkbox" id="s-low" ${s.showLowConfidence ? 'checked' : ''}> Afficher le badge « à vérifier » sur les réponses de confiance faible</label>
    <label class="field"><input type="checkbox" id="s-conf" ${s.confidence ? 'checked' : ''}> Indice de certitude avant la correction (sûr / hésitant / au hasard)</label>
    <label class="field"><input type="checkbox" id="s-hide" ${s.hideChoices ? 'checked' : ''}> QCM : réfléchir avant d’afficher les propositions</label>
    <label class="field"><input type="checkbox" id="s-focus" ${s.focus ? 'checked' : ''}> Mode concentration : badges annoncés sans animation, accueil épuré</label>
    <label class="field"><input type="checkbox" id="s-gl" ${s.glossary !== false ? 'checked' : ''}> Glossaire : définition au toucher des termes clés (soulignés en pointillé), hors examen blanc et jeux</label>
    <label class="field">Chrono des jeux (Vrai / Faux, Sprint chiffres)<select id="s-timer">${[['normal', 'Normal'], ['large', 'Large'], ['off', 'Sans chrono']].map(([k, l]) => `<option value="${k}" ${s.gameTimer === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field">Shorts : pause proposée après<select id="s-shorts">${[[10, '10 shorts'], [15, '15 shorts'], [20, '20 shorts'], [30, '30 shorts'], [0, 'Sans limite']].map(([k, l]) => `<option value="${k}" ${(s.shortsLimit ?? 15) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field">Apparence<select id="s-look"><option value="bilan" ${(s.look || 'bilan') === 'bilan' ? 'selected' : ''}>Bilan (orange signature, grands chiffres)</option><option value="classique" ${s.look === 'classique' ? 'selected' : ''}>Classique (bleu, interface d’origine)</option></select></label>
    <label class="field">Thème<select id="s-theme"><option value="">Automatique</option><option value="light" ${document.documentElement.dataset.theme === 'light' ? 'selected' : ''}>Clair</option><option value="dark" ${document.documentElement.dataset.theme === 'dark' ? 'selected' : ''}>Sombre</option></select></label></div>
    ${syncCard()}
    <div class="card"><h2>Données</h2><p class="muted">${SY.config() ? 'La progression est stockée sur cet appareil et synchronisée en ligne.' : 'La progression est stockée uniquement sur ce téléphone.'} ${s.lastExportAt ? `Dernier export : ${new Date(s.lastExportAt).toLocaleString('fr-FR')}.` : '<strong>Aucun export pour l’instant.</strong>'}</p>
      <div class="btnrow"><button class="btn" id="export">${ic('download')} Exporter</button><button class="btn" id="copy">${ic('clipboard')} Copier</button></div>
      <div class="btnrow" style="margin-top:8px"><label class="btn" style="cursor:pointer">${ic('upload')} Importer un fichier<input type="file" id="import" accept="application/json,.json" class="hidden"></label></div>
      <details style="margin-top:10px"><summary>Importer un texte collé</summary><textarea id="paste" placeholder="Collez ici le texte de la sauvegarde"></textarea><button class="btn" id="paste-go" style="margin-top:8px">Importer ce texte</button></details>
      ${store.prevInfo() ? `<div style="height:8px"></div><button class="btn" id="undo">${ic('undo')} Revenir à l’état précédent (${store.prevInfo().cards} cartes, ${new Date(store.prevInfo().t).toLocaleString('fr-FR')})</button>` : ''}
      <div style="height:8px"></div><button class="btn" id="reset">Effacer la progression</button>
      <p class="muted" style="margin-top:10px">Protection : ${state.persisted === true ? 'le navigateur a accepté de conserver ces données.' : state.persisted === false ? 'le navigateur peut effacer ces données s’il manque de place.' : 'état de protection inconnu.'} Sur iPhone, <strong>installez l’application sur l’écran d’accueil avant de commencer</strong> : Safari efface les données d’un site resté 7 jours sans visite, pas celles d’une application installée. Une copie automatique est faite toutes les 3 heures.</p></div>
    <div class="card"><h2>Application</h2><p class="muted">Version ${esc(state.bank.generatedAt || '')} · ${state.bank.count} questions. Fonctionne hors ligne une fois chargée.</p><button class="btn" id="update">Vérifier les mises à jour</button><div style="height:8px"></div><button class="btn" id="help-again">${ic('help')} Revoir l’aide de départ</button></div>`;
};

function syncCard() {
  const cfg = SY.config(); const st = SY.status();
  if (!cfg) {
    return `<div class="card"><h2>Synchronisation en ligne</h2><p class="muted">Retrouvez la même progression sur le téléphone et l’ordinateur, et gardez-en une copie en ligne. Il faut votre propre Worker Cloudflare (gratuit) : mode d’emploi dans <code>cloudflare/README.md</code> du dépôt.</p>
      <label class="field">Adresse du Worker<input type="url" id="sync-url" placeholder="https://dec-deonto.….workers.dev" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <label class="field">Code secret<input type="password" id="sync-token" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <button class="btn primary" id="sync-connect">Connecter et synchroniser</button></div>`;
  }
  const when = st.at ? new Date(st.at).toLocaleString('fr-FR') : 'jamais';
  return `<div class="card"><h2>Synchronisation en ligne</h2><p class="muted">Connecté à <strong>${esc(new URL(cfg.url).host)}</strong>. Dernière synchronisation réussie : ${when}.${st.error ? `<br><strong>Dernier essai : ${esc(st.error)}.</strong>` : ''}</p>
    <p class="muted">Plan du jour pour Ernest : ${st.pontAt ? `envoyé le ${new Date(st.pontAt).toLocaleString('fr-FR')}` : 'pas encore envoyé'}.</p>
    <p class="muted">Envoi automatique pendant le travail (au plus une fois par minute) et à la fermeture de l’application ; récupération à l’ouverture. Les progressions des appareils sont fusionnées : rien n’est perdu.</p>
    <div class="btnrow"><button class="btn" id="sync-now">${ic('refresh')} Synchroniser maintenant</button><button class="btn" id="sync-off">Déconnecter cet appareil</button></div></div>`;
}

// ---------- Shorts ----------
// Fil vertical, comme un réseau social : une notion animée en 30 secondes, puis une question. La réponse passe
// par la répétition des jeux (boîtes de Leitner, « sht: ») ; une erreur remet les questions liées de la banque
// dans la prochaine séance. Le fil suit le parcours : schémas du jour, shorts à revoir, points faibles.
const SHORT_KIND = { duel: 'Duel EC / CAC', chiffre: 'Chiffre clé', liste: 'À retenir', cas: 'Cas pratique', vf: 'Vrai ou faux' };
async function ensureShorts() {
  if (state.shorts) return state.shorts;
  let steps = [];
  try { const r = await fetch('./data/shorts/index.json', { cache: 'no-cache' }); if (r.ok) steps = await r.json(); } catch { /* hors ligne, jamais chargé */ }
  const files = await Promise.all(steps.map(async (st) => {
    try { const r = await fetch(`./data/shorts/${st}.json`, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; }
  }));
  const list = files.filter((f) => f && Array.isArray(f.shorts)).flatMap((f) => f.shorts.map((s) => ({ ...s, step: f.step })));
  if (list.length) state.shorts = list;
  return state.shorts;
}
// Shorts répondus aujourd'hui (au moins une fois).
const shortsToday = () => { const t0 = startOfDay(); return Object.entries(state.progress.drills).filter(([id, m]) => id.startsWith(SH.PREFIX) && m.last >= t0).length; };
function shortsBtn(step) {
  const n = state.shorts?.filter((s) => s.step === step).length;
  return n ? `<button class="btn sm" data-shorts-step="${esc(step)}">${ic('clapper')} ${n} shorts</button>` : '';
}

views.carnet = () => {
  const pr = state.progress;
  const list = CN.entries(pr.carnet, state.byId);
  const shortIds = list.filter((x) => x.short);
  if (shortIds.length && !state.shorts) setTimeout(async () => { await ensureShorts(); if (state.view === 'carnet' && state.shorts) render(); }, 0);
  const shortOf = (id) => state.shorts?.find((s) => SH.memoId(s) === id);
  const qs = list.filter((x) => !x.short);
  const shs = shortIds.map((x) => shortOf(x.id)).filter(Boolean);
  const item = (x) => {
    let head; let ans;
    if (x.short) {
      const s = shortOf(x.id);
      head = s ? `<span class="badge">Short</span> ${md(s.title)}` : '<span class="badge">Short</span> <span class="muted">chargement…</span>';
      ans = s ? md(s.type === 'vf' ? `${s.verdict ? 'Vrai' : 'Faux'}. ${s.why}` : s.quiz.why) : '';
    } else {
      const q = state.byId[x.id];
      head = `<span class="badge ${q.profession.toLowerCase()}">${q.profession}</span> <span class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n}</span><div>${esc(q.qrc.question || q.question)}</div>`;
      ans = `<strong>Réponse.</strong> ${esc(q.qrc.model_answer)}`;
    }
    return `<li class="carnet-item"><div>${head}</div><details><summary>Voir la réponse</summary><div class="muted" style="margin-top:4px">${ans}</div></details>
      <input class="carnet-note" data-carnet-note="${esc(x.id)}" maxlength="200" value="${esc(x.note)}" placeholder="L’élément manqué, en une ligne (ex. : 6 exercices, pas 3)">
      <button class="btn sm" data-carnet="${esc(x.id)}">${ic('check')} Retenu : retirer</button></li>`;
  };
  if (!list.length) return `<div class="card"><h2>${ic('bookmark')} Carnet d’erreurs</h2><p class="muted">Vide pour l’instant. Sur chaque correction (questions et shorts), « Ajouter au carnet » y range ce que vous savez ne pas avoir retenu.</p></div>`;
  setTimeout(() => document.querySelectorAll('[data-carnet-note]').forEach((el) => { el.onchange = () => { CN.setNote(pr.carnet, el.dataset.carnetNote, el.value.trim()); persist(); toast('Note enregistrée', 'check'); }; }), 0);
  setTimeout(() => {
    const tq = $('#carnet-q'); if (tq) tq.onclick = () => trainOn(qs.map((x) => x.id), 'Carnet d’erreurs', 'qrc');
    const ts = $('#carnet-s'); if (ts) ts.onclick = () => openFeed({ only: shs });
  }, 0);
  return `<div class="card hero"><h2 style="margin:0 0 6px">${ic('bookmark')} Carnet d’erreurs</h2>
    <p class="muted" style="margin:0 0 10px">Ce que vous savez ne pas avoir retenu. Notez l’élément manqué en une ligne, relisez le soir et le matin du jour J. Retirez une entrée quand elle est sue.</p>
    ${qs.length ? `<button class="btn primary big-btn" id="carnet-q"><span>${ic('play')} Repasser ${qs.length} question${qs.length > 1 ? 's' : ''} en QRC</span></button>` : ''}
    ${shs.length ? `<button class="btn" id="carnet-s" style="margin-top:8px">${ic('clapper')} Revoir ${shs.length} short${shs.length > 1 ? 's' : ''}</button>` : ''}</div>
    <div class="card"><ul class="carnet-list">${list.map(item).join('')}</ul></div>`;
};

views.shorts = () => {
  if (!state.shorts) {
    setTimeout(async () => { await ensureShorts(); if (state.view === 'shorts' && state.shorts) render(); }, 0);
    return '<div class="card"><h2>' + ic('clapper') + ' Shorts</h2><p class="muted">Les shorts se chargent à la première ouverture en ligne.</p></div>';
  }
  const pr = state.progress; const all = SH.shortsStats(state.shorts, pr.drills);
  const cur = P.currentIndex(pr.plan); const lim = pr.settings.shortsLimit ?? 15;
  const rows = P.STEPS.filter((st) => st.kind === 'schema').map((st) => {
    const list = state.shorts.filter((s) => s.step === st.id); if (!list.length) return '';
    const x = SH.shortsStats(list, pr.drills); const i = P.STEPS.indexOf(st);
    return `<div class="sh-step"><div style="flex:1"><div><strong>${i + 1}. ${esc(st.title)}</strong>${i === cur ? ' <span class="badge warn">en cours</span>' : ''}</div>
      <div class="progress" style="margin:6px 0 3px"><div style="width:${Math.round((x.seen / x.total) * 100)}%"></div></div>
      <div class="muted">${x.seen}/${x.total} vus · ${x.known} acquis${x.due ? ` · <strong>${x.due} à revoir</strong>` : ''}</div></div>
      <button class="btn sm" data-shorts-step="${st.id}">${ic('play')}</button></div>`;
  }).join('');
  return `<div class="card hero"><h2 style="margin:0 0 6px">${ic('clapper')} Le fil de shorts</h2>
    <p class="muted" style="margin:0 0 10px">Une notion en 30 secondes, puis une question. Faites défiler vers le haut. Les shorts ratés reviennent aux bons intervalles et remettent les questions liées dans votre prochaine séance.</p>
    <div class="muted" style="margin-bottom:10px">${all.seen}/${all.total} vus · ${all.known} acquis · ${all.due} à revoir · d’abord : à revoir, étape en cours, points faibles${lim ? ` · pause proposée tous les ${lim} (Réglages)` : ''}</div>
    <button class="btn primary big-btn" data-shorts-step=""><span>${ic('play')} Lancer le fil</span></button></div>
    <div class="card"><h2>Par étape du parcours</h2><p class="muted">Un short d’une étape choisie passe en tête du fil, puis le fil continue.</p>${rows}</div>`;
};

// goal / base : « Shorts du jour » du plan ; le compteur et la pause suivent l'objectif du plan (base = déjà faits aujourd'hui).
function openFeed({ focus = [], goal = 0, base = 0, only = null } = {}) {
  if (!state.shorts?.length) return toast('Shorts indisponibles : ouvrez l’application une fois en ligne');
  closeSheet(true);
  const lim = goal ? Math.max(1, goal - base) : state.progress.settings.shortsLimit ?? 15;
  state.feed = { only, focus: focus.filter(Boolean), served: new Set(), list: [], ok: 0, n: 0, limit: lim, goal: goal ? goal : 0, base: goal ? base : 0, paused: false, active: 0 };
  let el = $('#feed');
  if (!el) { el = document.createElement('div'); el.id = 'feed'; el.className = 'feed'; document.body.appendChild(el); el.addEventListener('click', onFeedClick); }
  el.innerHTML = `<div class="feed-top"><button class="feed-x" id="feed-close" aria-label="Fermer">${ic('x')}</button><span id="feed-count"></span></div><div class="feed-scroll" id="feed-scroll"></div>`;
  el.classList.add('show'); document.body.classList.add('noscroll'); feedChrome(true);
  try { history.pushState({ v: state.view, feed: 1 }, ''); } catch { /* ignore */ }
  $('#feed-close').onclick = () => closeFeed();
  state.feedObs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('play');
      const i = Number(e.target.dataset.i);
      if (!Number.isNaN(i)) { state.feed.active = i; if (i >= state.feed.list.length - 3) feedAppend(); }
    }
  }, { root: $('#feed-scroll'), threshold: 0.55 });
  feedAppend(); feedCount();
}
function closeFeed(viaPop = false) {
  const el = $('#feed'); if (!el || !state.feed) return;
  state.feedObs?.disconnect(); state.feed = null;
  el.classList.remove('show'); el.innerHTML = ''; document.body.classList.remove('noscroll'); feedChrome(false);
  if (!viaPop && history.state?.feed) history.back();
  render();
}
// Pendant le fil : fond de page et couleur de thème (barre d'état sur Android) prennent la couleur papier des shorts.
function feedChrome(on) {
  document.documentElement.classList.toggle('feed-open', on);
  const m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
  if (on) { m.dataset.prev = m.content; m.content = '#f3eee6'; } else if (m.dataset.prev) m.content = m.dataset.prev;
}
function feedCount() {
  const f = state.feed; const c = $('#feed-count'); if (!f || !c) return;
  const prog = f.goal ? ` · ${Math.min(f.base + f.n, f.goal)}/${f.goal} du jour` : f.limit ? ` · ${Math.min(f.n, f.limit)}/${f.limit}` : '';
  c.textContent = f.n ? `${f.ok}/${f.n} juste${f.ok > 1 ? 's' : ''}${prog}` : f.only ? 'Carnet d’erreurs' : f.goal ? `Shorts du jour · ${f.base}/${f.goal}` : f.focus.length ? (P.stepById(f.focus[0])?.title || '') : 'Shorts';
}
// Ajoute les prochains shorts au fil ; tout servi : on recommence (en évitant les derniers vus).
function feedAppend() {
  const f = state.feed; if (!f || f.paused) return;
  const pr = state.progress;
  const opts = () => ({ steps: P.STEPS.map((s) => s.id), cur: P.currentIndex(pr.plan), done: pr.plan.done, focus: f.focus,
    weak: new Set(P.tagStats(pr.attempts, state.byId).weak.map((w) => `${w.prof}:${w.tag}`)), served: f.served, now: Date.now() });
  // Carnet : seulement les shorts choisis, une fois chacun.
  let more = f.only ? f.only.filter((s) => !f.served.has(s.id)).slice(0, 6) : SH.buildFeed(state.shorts, pr.drills, opts()).slice(0, 6);
  if (!more.length && !f.only) { f.served = new Set(f.list.slice(-5).map((s) => s.id)); more = SH.buildFeed(state.shorts, pr.drills, opts()).slice(0, 6); }
  const box = $('#feed-scroll'); if (!box) return;
  for (const s of more) {
    f.served.add(s.id); f.list.push(s);
    box.insertAdjacentHTML('beforeend', shortHtml(s, f.list.length - 1));
    state.feedObs.observe(box.lastElementChild);
  }
}
const md = (t) => inline(t || '');
// Trois rendus, pour varier le fil : mise en scène (personnages et objet du sous-thème), schéma (liste en
// étapes reliées) et carte simple (une partie des chiffres et des vrai ou faux). Puis vient la question.
function shortHtml(s, i) {
  const a = (d, html, cls = '') => `<div class="a ${cls}" style="--d:${d}s">${html}</div>`;
  const st = P.stepById(s.step);
  const cast = SC.castFor(s);
  const sides = cast.length === 2 ? ['l', 'r'] : ['c'];
  const lesson = ['duel', 'chiffre', 'liste'].includes(s.type);
  const scenic = s.type === 'duel' || s.type === 'cas' || (s.type !== 'liste' && Number(s.id.split('-').pop()) % 2 === 0);
  const soft = SC.CAST[cast[0]].soft;
  const discs = cast.map((k, n) => `<div class="sh-disc ${sides[n]} a pop" style="--d:${0.2 + n * 0.1}s;background:${SC.CAST[k].soft}"></div>`).join('');
  const think = s.type === 'cas' ? a(1.4, '<div class="sh-think">?</div>', 'pop sh-thinkW') : '';
  const actors = cast.map((k, n) => a(0.4 + n * 0.25, `<div class="idle" style="animation-delay:${-n * 1.1}s">${SC.person(k)}</div>${n === 0 ? think : ''}<span class="sh-name" style="background:${SC.CAST[k].color}">${SC.CAST[k].name}</span>`, `sh-actor ${sides[n]} ${sides[n] === 'l' ? 'inL' : sides[n] === 'r' ? 'inR' : 'up'}`)).join('');
  const prop = (d, where) => a(d, SC.icon(SC.propFor(s.tags)), `pop sh-prop ${where}`);
  const stamp = (x, d) => (x ? a(d, `<div class="sh-stamp">${md(x)}</div>`, 'stampIn sh-stampW') : '');
  let head = s.title; let over = ''; let stageExtra = ''; let below = ''; let t = 0;
  if (s.type === 'duel') {
    head = s.q;
    over = `<div class="sh-signs">${a(1.2, `<div class="sh-sign" style="color:${SC.CAST.ec.color}">${md(s.ec.main)}</div>`, 'pop')}${a(1.9, `<div class="sh-sign" style="color:${SC.CAST.cac.color}">${md(s.cac.main)}</div>`, 'pop')}</div>`;
    stageExtra = prop(2.5, 'mid');
    below = stamp(s.trap, 3) + a(3.4, `<details class="sh-more"><summary>Le détail</summary><p><b style="color:${SC.CAST.ec.color}">EC</b> ${md(s.ec.det)}</p><p><b style="color:${SC.CAST.cac.color}">CAC</b> ${md(s.cac.det)}</p></details>`);
    t = 3.6;
  } else if (s.type === 'chiffre') {
    over = a(1, `<div class="sh-big">${md(s.big)}</div>`, 'pop sh-bigW');
    stageExtra = prop(1.6, cast.length === 2 ? 'mid' : 'side');
    if (!scenic) over = a(0.2, `<div class="sh-card" style="background:${soft}">${SC.icon(SC.propFor(s.tags))}<div class="sh-big">${md(s.big)}</div></div>`, 'pop');
    below = a(1.8, `<div class="sh-label">${md(s.label)}</div>`) + stamp(s.trap, 2.5) + (s.det ? a(2.9, `<details class="sh-more"><summary>Le détail</summary><p>${md(s.det)}</p></details>`) : '');
    t = 3.1;
  } else if (s.type === 'liste') {
    head = s.q;
    over = a(0.15, SC.icon(SC.propFor(s.tags)), 'pop sh-propHead');
    below = `<ol class="sh-flow" style="--c:${SC.CAST[cast[0]].color}">${s.items.map((it, k) => `<li class="a inL" style="--d:${0.5 + k * 0.5}s"><span class="sh-n">${k + 1}</span><div><strong>${md(it.k)}</strong>${it.v ? `<div class="sh-det">${md(it.v)}</div>` : ''}</div></li>`).join('')}</ol>`;
    t = 0.5 + s.items.length * 0.5; below += stamp(s.trap, t); t += 0.4;
  } else if (s.type === 'cas') {
    over = a(0.3, `<div class="sh-narr">${md(s.situation)}</div>`);
    stageExtra = prop(1.1, 'mid');
    t = 1.6;
  } else if (s.type === 'vf') {
    over = a(0.9, `<div class="sh-bubble">${md(s.statement)}</div>`, 'pop');
    stageExtra = prop(1.4, cast.length === 2 ? 'mid' : 'side');
    if (!scenic) over = a(0.2, `<div class="sh-card quote" style="background:${soft}">${SC.icon(SC.propFor(s.tags))}<p>${md(s.statement)}</p></div>`, 'pop');
    t = 1.2;
  }
  const quiz = s.type === 'vf'
    ? `<div class="sh-qq">Vrai ou faux ?</div><div class="sh-choices two"><button class="btn" data-sh-c="1">Vrai</button><button class="btn" data-sh-c="0">Faux</button></div>`
    : `<div class="sh-qq">${md(s.quiz.q)}</div><div class="sh-choices">${s.quiz.choices.map((c, k) => `<button class="btn" data-sh-c="${k}">${md(c)}</button>`).join('')}</div>`;
  const scene = scenic ? `${over}<div class="sh-stage">${discs}<div class="sh-ground"></div>${actors}${stageExtra}</div>${below}` : `${over}${below}`;
  return `<section class="sh t-${s.type}" data-i="${i}" data-id="${esc(s.id)}"><div class="sh-in">
    <div class="sh-top"><span class="sh-chip">${SHORT_KIND[s.type]}</span><span>${esc(s.title !== head ? s.title : st?.title || '')}</span></div>
    ${a(0.05, `<h2 class="sh-title">${md(head)}</h2>`)}
    ${lesson ? `<div class="sh-lesson">${scene}</div>${a(t + 0.3, '<button class="btn primary sh-ask" data-sh-ask="1">J’ai retenu : la question →</button>')}` : scene}
    ${lesson ? `<div class="sh-quiz later">${quiz}<div class="sh-fb"></div></div>` : a(t, `<div class="sh-quiz">${quiz}<div class="sh-fb"></div></div>`)}
    <div class="sh-foot"><span>${esc(st ? `Étape ${P.STEPS.indexOf(st) + 1} · ${st.title}` : '')}</span><button class="linkbtn" data-open-fiche="${esc(s.fiche)}">Lire la fiche ↗</button></div>
  </div></section>`;
}
function onFeedClick(e) {
  const f = state.feed; if (!f) return;
  const fiche = e.target.closest('[data-open-fiche]');
  if (fiche) return ficheSheet(fiche.dataset.openFiche);
  const ask = e.target.closest('[data-sh-ask]');
  if (ask) { const sec = ask.closest('section'); sec.classList.add('asking'); sec.scrollIntoView(); return; }
  const rv = e.target.closest('[data-sh-review]');
  if (rv) { rv.closest('section').classList.toggle('review'); return; }
  const nx = e.target.closest('[data-sh-next]');
  if (nx) { const sec = nx.closest('section'); return sec.nextElementSibling?.scrollIntoView({ behavior: 'smooth' }); }
  const act = e.target.closest('[data-sh-end]');
  if (act) {
    const k = act.dataset.shEnd;
    if (k === 'more') { f.paused = false; f.goal = 0; f.limit = f.n + (state.progress.settings.shortsLimit || 15); act.closest('section').remove(); feedAppend(); feedCount(); return; }
    if (k === 'close') return closeFeed();
    if (k === 'plan') { const task = nextTask(dayTasks(), 'shorts'); closeFeed(true); return task ? task.run() : go('home'); }
  }
  const b = e.target.closest('[data-sh-c]'); if (!b) return;
  const sec = b.closest('section'); if (sec.dataset.done) return;
  const s = f.list[Number(sec.dataset.i)]; const c = Number(b.dataset.shC);
  const ok = s.type === 'vf' ? (c === 1) === s.verdict : c === s.quiz.answer;
  sec.dataset.done = '1';
  const now = Date.now();
  recordDrill(state.progress.drills, SH.memoId(s), ok, now, examAt());
  let requeued = 0;
  // Au plus 3 questions déjà vues, les moins solides d'abord.
  if (!ok) {
    const cards = state.progress.cards;
    const ids = SH.linkedQuestions(s, state.fiches, state.byId, P.stepById(s.step)?.fiches).filter((id) => cards[id] && cards[id].due > now);
    for (const id of ids.sort((x, y) => cards[x].interval - cards[y].interval).slice(0, 3)) { cards[id].due = now; requeued++; }
  }
  persist();
  f.n++; if (ok) f.ok++;
  sec.querySelectorAll('[data-sh-c]').forEach((x) => {
    x.disabled = true;
    const k = Number(x.dataset.shC);
    const good = s.type === 'vf' ? (k === 1) === s.verdict : k === s.quiz.answer;
    if (good) x.classList.add('okb'); else if (x === b) x.classList.add('ko');
  });
  const why = s.type === 'vf' ? s.why : s.quiz.why;
  sec.querySelector('.sh-fb').innerHTML = `<div class="gfb ${ok ? 'ok' : 'ko'}">${ok ? ic('check') + ' Juste' : `${ic('x')} ${s.type === 'vf' ? `C’est ${s.verdict ? 'vrai' : 'faux'}.` : 'Raté.'}`}</div><div class="sh-why">${md(why)}</div>${!ok ? `<div class="muted" style="margin-top:6px">Ce short revient dans 10 minutes${requeued ? `, et ${requeued} question${requeued > 1 ? 's' : ''} liée${requeued > 1 ? 's' : ''} dans votre prochaine séance` : ''}.</div>` : ''}${carnetBtn(SH.memoId(s))}${sec.querySelector('.sh-lesson') ? '<button class="btn sh-next" data-sh-review="1">' + ic('eye') + ' Revoir la notion</button>' : ''}<button class="btn primary sh-next" data-sh-next="1">Suivant ↓</button>`;
  feedCount();
  if (f.limit && f.n >= f.limit && !f.paused) feedPause(sec);
}
// Pause proposée (Réglages) : bilan, puis la suite du plan, encore une série, ou fermer.
function feedPause(after) {
  const f = state.feed; f.paused = true;
  [...after.parentNode.children].filter((x) => Number(x.dataset.i) > Number(after.dataset.i)).forEach((x) => { state.feedObs.unobserve(x); x.remove(); });
  f.list = f.list.slice(0, Number(after.dataset.i) + 1);
  const task = nextTask(dayTasks(), 'shorts');
  after.insertAdjacentHTML('afterend', `<section class="sh sh-end"><div class="sh-in center">
    <span class="sh-chip" style="align-self:center">Pause</span><div class="sh-big">${f.ok}/${f.n}</div><div class="sh-label">${f.n} shorts, ${f.ok} réponses justes</div>
    <p class="muted">Les shorts ratés reviennent dans 10 minutes, puis aux intervalles de la répétition.</p>
    ${task ? `<button class="btn primary" data-sh-end="plan">${ic('play')} Suite du plan : ${esc(task.title)}</button>` : ''}
    <button class="btn ${task ? '' : 'primary'}" data-sh-end="more">${ic('clapper')} Encore ${state.progress.settings.shortsLimit || 15} shorts</button>
    <button class="btn" data-sh-end="close">Fermer</button></div></section>`);
}

// ---------- Jeux ----------
// Items tirés des fiches (relues) et de la banque ; répétition par boîtes de Leitner (drill.js), échéances
// ramenées avant l'épreuve. Une erreur au Vrai / Faux remet la question d'origine dans la prochaine séance.
const GAMES = {
  duel: { icon: ic('swords'), name: 'Duel EC / CAC', n: 15, why: 'Une règle, deux professions : à qui est-elle ? Opposer les règles voisines est le moyen le plus sûr de ne plus les confondre.' },
  vf: { icon: ic('zap'), name: 'Vrai / Faux éclair', n: 20, why: 'Chaque proposition d’un QCM, jugée seule et en temps limité : quatre rappels par question au lieu d’un.' },
  chiffres: { icon: ic('hash'), name: 'Sprint chiffres', why: 'Le plus de seuils, durées, majorités et peines en temps limité (réglable). Les chiffres sont exigés par le jury.' },
  arbre: { icon: ic('tree'), name: 'Arbres à trou', n: 10, why: 'Un morceau d’arbre de décision des schémas, avec une case vide : choisissez ce qui la remplit. On apprend la logique de la décision, pas une phrase.' },
  palais: { icon: ic('landmark'), name: 'Palais de mémoire', why: 'Les listes à réciter, posées une à une sur les objets de votre bureau (méthode des lieux).' },
  intrus: { icon: ic('search'), name: 'Trouvez l’intrus', n: 12, why: 'Trois éléments d’une liste à connaître et un intrus, souvent la règle de l’autre profession : lequel n’en fait pas partie ? Le QCM de novembre 2025 posait 12 questions sur 20 sous cette forme négative.' },
};
// Chronos (Réglages) : secondes pour lire et juger une proposition, durée du sprint.
const TIMERS = {
  normal: { vf: (len) => Math.round(12 + len / 12), sprint: 120 },
  large: { vf: (len) => Math.round(20 + len / 8), sprint: 180 },
  off: { vf: null, sprint: null },
};
const timer = () => TIMERS[state.progress.settings.gameTimer] || TIMERS.normal;

function gamesCard() {
  return `<div class="card"><h2>Jeux express</h2><p class="muted" style="margin:0 0 10px">5 minutes, entre deux séances. Chaque jeu a sa propre répétition espacée.</p>
    <div class="gamegrid">${Object.entries(GAMES).map(([k, g]) => `<button class="btn" data-game="${k}"><span class="gico">${g.icon}</span>${esc(g.name)}</button>`).join('')}</div></div>`;
}
async function ensureGameData() {
  if (state.gameData) return state.gameData;
  const d = { duel: [], arbre: [], chiffres: [], vf: GM.vfItems(state.bank.questions), intrus: GM.intrusItems(state.bank.questions) };
  for (const f of state.fiches.filter((x) => x.kind === 'visuel')) {
    let md; try { md = await loadFiche(f.file); } catch { continue; }
    d.duel.push(...GM.duelItems(f.file, md));
    d.arbre.push(...GM.arbreItems(f.file, md));
    if (f.file === GM.CHIFFRES_FILE) d.chiffres = GM.chiffresItems(f.file, md);
  }
  state.gameData = d;
  return d;
}
function stopGameTimer() { clearTimeout(state.gameTimeout); clearInterval(state.gameInterval); }
async function startGame(kind) {
  if (kind === 'palais') { state.careerTab = 'palais'; state.palais = null; return go('carriere'); }
  const d = await ensureGameData();
  const items = kind === 'chiffres' ? pickDrill(d.chiffres, state.progress.drills, d.chiffres.length) : pickDrill(d[kind], state.progress.drills, GAMES[kind].n);
  if (!items.length) return toast('Jeu indisponible hors ligne : ouvrez une fois les fiches en ligne');
  stopGameTimer();
  const sprint = kind === 'chiffres' ? timer().sprint : null;
  state.game = { kind, items, idx: 0, ok: 0, n: 0, combo: 0, bestCombo: 0, phase: 'ask', errors: [], choices: null, limit: sprint, endsAt: sprint ? Date.now() + sprint * 1000 : null };
  if (state.view === 'jeux') render(); else go('jeux');
}
function gameAnswer(ok, info = {}) {
  const g = state.game; if (!g || g.phase !== 'ask') return;
  stopGameTimer();
  const it = g.items[g.idx]; const now = Date.now();
  recordDrill(state.progress.drills, it.id, ok, now, examAt());
  g.n++; g.last = { ok, ...info };
  if (ok) { g.ok++; g.combo++; g.bestCombo = Math.max(g.bestCombo, g.combo); } else { g.combo = 0; g.errors.push(it); }
  // Recoupement : rater une proposition, c'est ne pas savoir la question ; elle redevient due.
  if (!ok && it.qid) { const c = state.progress.cards[it.qid]; if (c && c.due > now) { c.due = now; g.last.requeued = true; } }
  g.phase = 'fb';
  persist();
  // Sprint : bonne réponse, on enchaîne ; erreur, le chrono s'arrête le temps de lire la correction.
  if (g.kind === 'chiffres') {
    if (ok) { startSprintClock(); render(); state.gameTimeout = setTimeout(nextGameItem, 700); return; }
    g.pausedAt = now;
  }
  render();
}
function nextGameItem() {
  const g = state.game; if (!g || g.phase === 'end') return;
  clearTimeout(state.gameTimeout);
  if (g.pausedAt) { if (g.endsAt) g.endsAt += Date.now() - g.pausedAt; g.pausedAt = null; }
  g.idx++; g.phase = 'ask'; g.choices = null; g.last = null;
  if (g.idx >= g.items.length || (g.endsAt && Date.now() >= g.endsAt)) endGame();
  render();
}
function endGame() {
  const g = state.game; stopGameTimer();
  const score = g.kind === 'chiffres' ? g.ok : g.bestCombo;
  const best = state.progress.games.best;
  g.record = score > (best[g.kind] || 0);
  if (g.record) best[g.kind] = score;
  g.phase = 'end';
  if (g.n >= g.items.length || (g.endsAt && Date.now() >= g.endsAt)) markGameFinished(g.kind); // partie menée à son terme
  persist();
}
function startSprintClock() {
  const g = state.game; if (!g?.endsAt) return;
  clearInterval(state.gameInterval);
  state.gameInterval = setInterval(() => {
    const el = $('#sprint'); const ms = Math.max(0, g.endsAt - Date.now());
    if (el) el.textContent = `${Math.ceil(ms / 1000)} s`;
    if (ms <= 0 && state.game === g && g.phase !== 'end') { endGame(); render(); }
  }, 250);
}
// Balayage : à gauche / à droite, comme les deux boutons.
function onSwipe(el, left, right) {
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 70) (dx < 0 ? left : right)();
  });
}

views.jeux = () => {
  if (!state.gameData) {
    setTimeout(async () => { await ensureGameData(); if (state.view === 'jeux') render(); }, 0);
    return `${trainTabs('jeux')}<div class="card">Chargement des jeux…</div>`;
  }
  if (state.game) return gameView();
  const d = state.gameData; const m = state.progress.drills; const best = state.progress.games.best;
  const card = (k) => {
    const g = GAMES[k];
    const st = k === 'palais' ? drillStats(PAL.LISTS.map((l) => ({ id: `pal:${l.id}` })), m) : drillStats(d[k], m);
    const rec = best[k] ? ` · record ${best[k]}${k === 'chiffres' ? '' : ' d’affilée'}` : '';
    return `<div class="card game-card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${g.icon} ${esc(g.name)}</h2><span class="muted">${st.total} ${k === 'palais' ? 'listes' : 'items'}</span></div>
      <p class="muted" style="margin:6px 0">${esc(g.why)}</p>
      <div class="muted">${st.seen}/${st.total} vus · ${st.known} acquis · ${st.due} à revoir${rec}</div>
      <button class="btn primary" style="margin-top:10px" data-game="${k}">Jouer</button></div>`;
  };
  return `${trainTabs('jeux')}<div class="card"><h2>Jeux</h2><p class="muted" style="margin:0">Chaque jeu fait <strong>produire</strong> une réponse avant de la montrer, revient sur vos erreurs aux bons intervalles, et toutes les échéances sont ramenées avant le 10 novembre.</p></div>
    ${Object.keys(GAMES).map(card).join('')}`;
};

function gameView() {
  const g = state.game; const meta = GAMES[g.kind];
  setTimeout(bindGame, 0);
  if (g.phase === 'end') {
    const errs = g.errors.slice(0, 12);
    const line = (it) => g.kind === 'duel' ? `${inline(it.criterion)} : ${inline(it.text)} → <strong>${esc(it.labels[it.answer])}</strong>`
      : g.kind === 'vf' ? `${esc(it.text)} → <strong>${it.answer ? 'bonne réponse' : 'fausse'}</strong>`
        : g.kind === 'chiffres' ? `${inline(it.prompt)} → <strong>${esc(it.value)}</strong>`
          : g.kind === 'intrus' ? `${esc(it.ask)} → <strong>${esc(it.leurre)}</strong>`
            : `${it.path.map(inline).join(' › ')} → <strong>${inline(it.text)}</strong>`;
    return `<div class="card center"><div class="muted">${meta.icon} ${esc(meta.name)}</div><div class="big">${g.ok}/${g.n}</div>
      <div class="muted">${g.kind === 'chiffres' && g.limit ? `en ${g.limit} secondes` : `meilleure série : ${g.bestCombo} d’affilée`}${g.record ? ' · ' + ic('trophy') + ' nouveau record' : ''}</div></div>
      ${errs.length ? `<div class="card"><h2>À retenir</h2><ul class="errlist">${errs.map((it) => `<li>${line(it)}</li>`).join('')}</ul><p class="muted">Ces items reviennent dans 10 minutes, puis aux intervalles de la répétition.</p></div>` : '<div class="card center"><p>Sans faute. ' + ic('clap') + '</p></div>'}
      ${nextStepBlock()}<div class="btnrow"><button class="btn" id="g-again">Rejouer</button><button class="btn" id="g-home">← Tous les jeux</button></div>`;
  }
  const it = g.items[g.idx];
  const head = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="muted">${meta.icon} ${g.kind === 'chiffres' && g.endsAt ? `<span id="sprint" class="timer">${Math.ceil(Math.max(0, g.endsAt - (g.pausedAt || Date.now())) / 1000)} s</span>${g.pausedAt ? ic('pause') : ''}` : `${g.idx + 1} / ${g.items.length}`} · ${ic('check')} ${g.ok}${g.combo >= 2 ? ` · <span class="combo">${ic('flame')}×${g.combo}</span>` : ''}</span><button class="btn sm" id="g-stop">Arrêter</button></div>`;
  return head + ({ duel: duelCard, vf: vfCard, chiffres: chiffresCard, arbre: arbreCard, intrus: intrusCard })[g.kind](it, g);
}
function fbLine(g, okText, koText) {
  return `<div class="gfb ${g.last.ok ? 'ok' : 'ko'}">${g.last.ok ? `${ic('check')} ${okText}` : `${ic('x')} ${g.last.timeout ? 'Temps écoulé. ' : ''}${koText}`}</div>`;
}
const nextBtn = () => '<button class="btn primary" id="g-next" style="margin-top:12px">Suivant →</button>';

function duelCard(it, g) {
  const [a, b] = it.labels;
  if (g.phase === 'ask') {
    return `<div class="card swipe" id="g-card"><div class="muted">${esc(it.title)}</div><div class="crit">${inline(it.criterion)}</div><div class="q">${inline(it.text)}</div><p class="muted">À qui est cette règle ? Balayez ou touchez.</p></div>
      <div class="btnrow duel"><button class="btn side0" data-side="0">← ${esc(a)}</button><button class="btn side1" data-side="1">${esc(b)} →</button></div>`;
  }
  const cell = (side) => `<div class="vs-cell ${side === it.answer ? 'on' : ''}"><div class="muted">${esc(it.labels[side])}</div>${inline(side === it.answer ? it.text : it.other)}</div>`;
  return `<div class="card">${fbLine(g, `Oui : ${esc(it.labels[it.answer])}.`, `Non : c’est ${esc(it.labels[it.answer])}.`)}<div class="crit">${inline(it.criterion)}</div>
    <div class="vs-pair">${cell(0)}${cell(1)}</div><p class="muted">Et pour l’autre ? La règle d’en face est juste à côté : c’est elle que le jury vous fera confondre.</p>
    <button class="btn sm" data-open-fiche="${esc(it.file)}">${ic('chart')} ${esc(it.title)}</button>${nextBtn()}</div>`;
}
function vfCard(it, g) {
  const q = state.byId[it.qid];
  if (g.phase === 'ask') {
    const secs = timer().vf ? timer().vf(it.stem.length + it.text.length) : null;
    g.secs = secs;
    return `<div class="card swipe" id="g-card"><div class="muted">${esc(q ? `DEC ${q.sessionLabel} · ${q.profession}` : '')}${secs ? ` · ${secs} s` : ''}</div><div class="stem">${esc(it.stem)}</div>
      <div class="prop">${esc(it.text)}</div>${secs ? `<div class="timebar"><div style="animation-duration:${secs}s"></div></div>` : ''}<p class="muted">Est-ce la bonne réponse à cette question ? Balayez ou touchez. Chrono réglable dans ${ic('settings')}.</p></div>
      <div class="btnrow duel"><button class="btn ko" data-vf="0">${ic('x')} Faux</button><button class="btn okb" data-vf="1">${ic('check')} Vrai</button></div>`;
  }
  return `<div class="card">${fbLine(g, it.answer ? 'Exact : c’est la bonne réponse.' : 'Exact : ce n’est pas la bonne réponse.', it.answer ? 'C’était la bonne réponse.' : 'Ce n’était pas la bonne réponse.')}
    <div class="stem">${esc(it.stem)}</div>${it.answer ? '' : `<div class="muted">Proposition jugée : ${esc(it.text)}</div>`}<div class="answer"><strong>Bonne réponse :</strong> ${esc(it.good)}</div>
    ${q ? `<details><summary>Explication</summary>${qExplain(q)}</details>` : ''}${g.last.requeued ? '<p class="muted">' + ic('repeat') + ' Recoupement : la question d’origine revient dans votre prochaine séance.</p>' : ''}${nextBtn()}</div>`;
}
function chiffresCard(it, g) {
  if (!g.choices) g.choices = GM.choicesFor(it.value, it.pool, 4);
  const done = g.phase === 'fb';
  return `<div class="card"><div class="muted">${esc(it.section)} ${inline(it.prof)}</div><div class="q">${inline(it.prompt)}</div>
    <div class="choices">${g.choices.map((c, i) => `<button class="choice ${done && c === it.value ? 'ok' : done && i === g.last.pick ? 'ko' : ''}" data-pick="${i}" ${done ? 'disabled' : ''}><span>${esc(c)}</span></button>`).join('')}</div>
    ${done && !g.last.ok ? `${fbLine(g, '', `Réponse : ${esc(it.value)}. Chrono en pause.`)}${nextBtn()}` : ''}</div>`;
}
// Arbre à trou : le chemin depuis le sommet, puis la branche avec ses autres cases et une case vide.
function arbreCard(it, g) {
  if (!g.choices) g.choices = GM.choicesFor(it.text, it.pool, 4);
  const done = g.phase === 'fb';
  const kids = [...it.siblings]; kids.splice(it.slot, 0, null);
  const depth = it.path.length;
  const hole = done ? `<span class="node ok">${inline(it.text)}</span>` : '<span class="node hole">' + ic('help') + ' case à compléter</span>';
  return `<div class="card"><div class="muted">${ic('tree')} ${esc(it.title)}</div>
    <p class="muted" style="margin:6px 0">Extrait d’un arbre de décision du schéma. Chaque niveau découle du précédent ; une case de la dernière branche est vide.</p>
    <ul class="tree">${it.path.map((p, i) => `<li style="--d:${i}"><span class="node ${i === depth - 1 ? 'parent' : ''}">${inline(p)}</span></li>`).join('')}
      ${kids.map((k) => `<li style="--d:${depth}">${k === null ? hole : `<span class="node">${inline(k)}</span>`}</li>`).join('')}</ul>
    <div class="muted" style="margin:8px 0">Qu’est-ce qui remplit la case vide ?</div>
    <div class="choices">${g.choices.map((c, i) => `<button class="choice ${done && c === it.text ? 'ok' : done && i === g.last.pick ? 'ko' : ''}" data-pick="${i}" ${done ? 'disabled' : ''}><span>${inline(c)}</span></button>`).join('')}</div>
    ${done ? `${fbLine(g, 'C’est bien cette case.', 'Ce n’est pas cette case : la bonne est surlignée.')}<p class="muted">Les autres propositions viennent d’autres branches du même arbre.</p><button class="btn sm" data-open-fiche="${esc(it.file)}">${ic('chart')} Voir l’arbre entier</button>${nextBtn()}` : ''}</div>`;
}
// Intrus : trois éléments d'une liste à connaître et un leurre (souvent la règle de l'autre profession).
function intrusCard(it, g) {
  if (!g.choices) { const r = GM.intrusRound(it); g.choices = r.choices; }
  const done = g.phase === 'fb'; const q = state.byId[it.qid];
  return `<div class="card"><div class="muted">${ic('search')} ${esc(q ? `${q.profession} · DEC ${q.sessionLabel}` : it.prof)}</div><div class="q">${esc(it.ask)}</div>
    <div class="choices">${g.choices.map((c, i) => `<button class="choice ${done && c === it.leurre ? 'ok' : done && i === g.last.pick ? 'ko' : ''}" data-pick="${i}" ${done ? 'disabled' : ''}><span>${esc(c)}</span></button>`).join('')}</div>
    ${done ? `${fbLine(g, 'C’est bien l’intrus.', `L’intrus était : ${esc(it.leurre)}.`)}<p class="muted">${it.cross ? ic('scale') + ' Règle de l’autre profession. ' : ''}${esc(it.why)}</p>
      <details><summary>La liste complète</summary><ul>${it.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
      ${g.last.requeued ? '<p class="muted">' + ic('repeat') + ' La question d’origine revient dans votre prochaine séance.</p>' : ''}${nextBtn()}` : '<p class="muted">Touchez l’élément qui n’en fait pas partie.</p>'}</div>`;
}
function bindGame() {
  const g = state.game; if (!g) return;
  const stop = $('#g-stop'); if (stop) stop.onclick = () => { if (g.n) { endGame(); } else { stopGameTimer(); state.game = null; } render(); };
  const again = $('#g-again'); if (again) again.onclick = () => startGame(g.kind);
  const home = $('#g-home'); if (home) home.onclick = () => { state.game = null; render(); };
  const nx = $('#g-next'); if (nx) { nx.onclick = nextGameItem; if (g.kind === 'arbre') revealBelow(nx); }
  if (g.phase !== 'ask') return;
  const it = g.items[g.idx];
  const cardEl = $('#g-card');
  if (g.kind === 'arbre') revealBelow($('#main .choices'));
  if (g.kind === 'duel') {
    document.querySelectorAll('[data-side]').forEach((b) => { b.onclick = () => gameAnswer(Number(b.dataset.side) === it.answer); });
    if (cardEl) onSwipe(cardEl, () => gameAnswer(it.answer === 0), () => gameAnswer(it.answer === 1));
  } else if (g.kind === 'vf') {
    document.querySelectorAll('[data-vf]').forEach((b) => { b.onclick = () => gameAnswer((b.dataset.vf === '1') === it.answer); });
    if (cardEl) onSwipe(cardEl, () => gameAnswer(!it.answer), () => gameAnswer(it.answer));
    if (g.secs) state.gameTimeout = setTimeout(() => gameAnswer(false, { timeout: true }), g.secs * 1000);
  } else {
    if (g.kind === 'chiffres') startSprintClock();
    const good = g.kind === 'chiffres' ? it.value : g.kind === 'intrus' ? it.leurre : it.text;
    document.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.pick); gameAnswer(g.choices[i] === good, { pick: i }); }; });
  }
}

// ---------- Palais de mémoire ----------
function palaisView() {
  const p = state.palais; const m = state.progress.drills;
  setTimeout(() => {
    document.querySelectorAll('[data-pal]').forEach((b) => { b.onclick = () => { state.palais = { id: b.dataset.pal, mode: b.dataset.palMode }; if (b.dataset.palMode === 'test') initPalaisTest(); render(); }; });
    const back = $('#pal-back'); if (back) back.onclick = () => { state.palais = null; render(); };
    document.querySelectorAll('[data-pal-opt]').forEach((b) => { b.onclick = () => palaisPick(b.dataset.palOpt, b); });
  }, 0);
  if (!p) {
    return `<div class="card"><h2>Votre bureau, palais de mémoire</h2>
      <p class="muted">La méthode des lieux : on pose chaque élément d’une liste sur un objet d’un parcours, puis on refait le parcours pour réciter. Chaque liste a son propre lieu, pour que les souvenirs ne se mélangent pas.</p></div>
      ${PAL.LISTS.map((l) => { const s = m[`pal:${l.id}`]; return `<div class="card"><div class="row" style="justify-content:space-between"><strong>${esc(l.title)}</strong><span class="badge ${l.prof === 'EC' ? 'ec' : l.prof === 'CAC' ? 'cac' : ''}">${esc(l.prof)}</span></div>
        <div class="muted">${esc(PAL.routeOf(l).place)} · ${l.items.length} éléments · ${s ? (s.box >= 3 ? ic('check') + ' acquise' : s.due <= Date.now() ? 'à réciter' : `prochain récit dans ${Math.max(1, Math.round((s.due - Date.now()) / DAY))} j`) : 'jamais récitée'}</div>
        <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-pal="${l.id}" data-pal-mode="learn">Apprendre</button><button class="btn sm primary" data-pal="${l.id}" data-pal-mode="test">Réciter</button></div></div>`; }).join('')}`;
  }
  const l = PAL.LISTS.find((x) => x.id === p.id);
  if (p.mode === 'learn') {
    return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><h2>${esc(l.title)}</h2><p class="muted">${esc(l.hint)} ${l.ordered ? 'L’ordre compte.' : 'L’ordre est celui de la fiche ; le palais le fige pour vous.'} Initiales : <strong>${esc(PAL.initials(l))}</strong></p>
      <p class="muted">Pour chaque lieu, imaginez l’élément posé dessus : grossissez la scène, rendez-la absurde ou drôle, elle tiendra.</p>
      <p class="muted">Le lieu : <strong>${esc(PAL.routeOf(l).place)}</strong>.</p>
      <ol class="loci">${l.items.map((x, i) => { const [e, lieu] = PAL.lociOf(l)[i]; return `<li><span class="loc">${ic(e)}</span><div><div class="muted">${esc(lieu)}</div><strong>${esc(x)}</strong></div></li>`; }).join('')}</ol>
      <p class="muted">Fermez les yeux, refaites le parcours de ${esc(PAL.lociOf(l)[0][1])} à ${esc(PAL.lociOf(l)[l.items.length - 1][1])}, puis récitez.</p>
      <button class="btn primary" data-pal="${l.id}" data-pal-mode="test">Réciter maintenant</button> <button class="btn sm" data-open-fiche="${esc(l.source)}" style="margin-top:8px">${ic('chart')} Source : la fiche</button></div>`;
  }
  const done = p.step >= l.items.length;
  const walk = l.items.slice(0, p.step).map((x, i) => `<li><span class="loc">${ic(PAL.lociOf(l)[i][0])}</span><div><div class="muted">${esc(PAL.lociOf(l)[i][1])}</div><strong>${esc(x)}</strong></div></li>`).join('');
  if (done) {
    return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><h2>${p.errors ? `${p.errors} erreur${p.errors > 1 ? 's' : ''}` : 'Parcours sans faute ' + ic('landmark')}</h2><ol class="loci">${walk}</ol>
      <p class="muted">${p.errors ? 'Repassez par « Apprendre », puis récitez à nouveau : la liste revient dans 10 minutes.' : 'La liste revient aux intervalles de la répétition, avant le 10 novembre.'}</p>
      <div class="btnrow"><button class="btn" data-pal="${l.id}" data-pal-mode="learn">Apprendre</button><button class="btn primary" data-pal="${l.id}" data-pal-mode="test">Réciter encore</button></div></div>`;
  }
  const [e, lieu] = PAL.lociOf(l)[p.step];
  return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><div class="muted">${esc(l.title)} · ${p.step + 1}/${l.items.length} · erreurs : ${p.errors}</div>
    <ol class="loci">${walk}</ol><div class="q">${ic(e)} Sur ${esc(lieu)}, il y a…</div>
    <div class="choices">${p.options.filter((x) => !l.items.slice(0, p.step).includes(x)).map((x) => `<button class="choice ${p.wrong.includes(x) ? 'ko' : ''}" data-pal-opt="${esc(x)}" ${p.wrong.includes(x) ? 'disabled' : ''}><span>${esc(x)}</span></button>`).join('')}</div></div>`;
}
function initPalaisTest() {
  const p = state.palais; const l = PAL.LISTS.find((x) => x.id === p.id);
  const opts = [...l.items, ...PAL.decoys(l, 2)];
  p.options = opts.map((v) => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.v);
  p.step = 0; p.errors = 0; p.wrong = [];
}
function palaisPick(x) {
  const p = state.palais; const l = PAL.LISTS.find((y) => y.id === p.id);
  if (x === l.items[p.step]) {
    p.step++; p.wrong = [];
    if (p.step >= l.items.length) { recordDrill(state.progress.drills, `pal:${l.id}`, p.errors === 0, Date.now(), examAt()); persist(); }
  } else { p.errors++; p.wrong.push(x); try { navigator.vibrate?.(40); } catch { /* ignore */ } }
  render();
}

// ---------- Routeur ----------
// ---------- Carrière, collection, souvenirs ----------
const PARTS = [['stage', 'Le stage'], ['diplome', 'Le diplôme et l’inscription'], ['installation', 'L’installation'], ['cac', 'Le commissariat aux comptes']];
function showBadge(id) {
  const b = state.badgeById[id]; if (!b) return;
  const pr = state.progress; const p = G.progressOf(b, pr.stats);
  const got = pr.badges[id];
  const col = G.RARITIES[b.rarity].color;
  const box = $('#celebrate');
  box.innerHTML = `<div class="cel-badge static" style="--halo:${col}"><div class="cel-medal">${badgeIcon(b, !got)}</div><div class="cel-rarity" style="color:${col}">${G.RARITIES[b.rarity].label}</div>
    <h2>${!got && b.hidden ? '???' : esc(b.name)}</h2><p>${esc(!got && b.hidden ? b.hint : b.desc)}</p>
    <p class="muted">${got ? `Débloqué le ${new Date(got).toLocaleDateString('fr-FR')}` : `Condition : ${esc(b.hidden ? b.hint : b.cond)} · ${p.cur}/${p.max}`}</p>
    ${b.ids && b.ids.length ? `<button class="btn primary" id="sheet-train">${ic('target')} Réviser ces ${b.ids.length} questions</button>` : ''}</div>`;
  box.classList.add('show');
  box.onclick = (e) => { if (e.target.id === 'sheet-train') return; box.classList.remove('show'); focusBack(box); };
  box.onkeydown = (e) => { if (e.key === 'Escape') { box.classList.remove('show'); focusBack(box); } };
  const tb = $('#sheet-train'); if (tb) tb.onclick = () => { box.classList.remove('show'); box._back = null; trainOn(b.ids, b.name); };
  focusIn(box, tb || box);
}
function bindProps(root) {
  root.querySelectorAll('.prop[data-badge]').forEach((el) => { if (el.dataset.badge) el.onclick = (e) => { e.stopPropagation(); showBadge(el.dataset.badge); }; });
}
views.carriere = () => {
  const tab = state.careerTab;
  setTimeout(() => {
    document.querySelectorAll('[data-ctab]').forEach((b) => { b.onclick = () => { state.careerTab = b.dataset.ctab; render(); }; });
    document.querySelectorAll('[data-fam]').forEach((b) => { b.onclick = () => { state.collFamily = b.dataset.fam; render(); }; });
    document.querySelectorAll('[data-badge-card]').forEach((b) => { b.onclick = () => showBadge(b.dataset.badgeCard); });
    document.querySelectorAll('[data-flip]').forEach((c) => { c.onclick = (e) => { if (e.target.closest('button')) return; c.classList.toggle('flipped'); }; });
    document.querySelectorAll('[data-train-anec]').forEach((b) => { b.onclick = () => { const x = state.badgeById[b.dataset.trainAnec]; trainOn(x.ids, x.name); }; });
    const main = $('#main'); bindProps(main);
  }, 0);
  const total = state.catalog.length, got = Object.keys(state.progress.badges).length;
  const tabs = `<div class="tabs">${[['carriere', 'Ma carrière'], ['palais', ic('landmark') + ' Palais'], ['collection', `Collection ${got}/${total}`], ['souvenirs', 'Souvenirs']].map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
  return tabs + (tab === 'collection' ? collectionView() : tab === 'souvenirs' ? souvenirsView() : tab === 'palais' ? palaisView() : careerView());
};
// Points et niveau : calculés depuis toutes les statistiques (rétroactifs). « Aujourd'hui » = écart avec le total
// relevé à la première ouverture du jour.
// Bandeau de grade au-dessus des questions : les points gagnés depuis l'ouverture de la vue s'affichent en « +n ».
function applyLook() { document.documentElement.dataset.look = state.progress?.settings?.look || 'bilan'; buildNav(); }
function sessionStrip() {
  const lv = xpInfo();
  if (state.stripBase === undefined || state.stripView !== state.view) { state.stripBase = lv.info.xp; state.stripView = state.view; }
  return CR.stripHtml(lv.info, { gain: lv.info.xp - state.stripBase });
}
function xpInfo() {
  const pr = state.progress;
  const cs = G.careerState(pr.stats, state.gctx, pr.drills); const total = cs.info.xp;
  const k = todayKey();
  if (!pr.xpDay || pr.xpDay.day !== k) pr.xpDay = { day: k, start: total };
  return { ...cs, today: Math.max(0, total - pr.xpDay.start) };
}
// Bilan de la semaine : réponses par jour (7 derniers jours), total, examens, partage en texte.
function weekCard() {
  const st = state.progress.stats; const days = [];
  for (let i = 6; i >= 0; i--) { const k = G.dayKey(Date.now() - i * DAY); days.push({ k, n: st.days[k] || 0, label: new Date(Date.now() - i * DAY).toLocaleDateString('fr-FR', { weekday: 'narrow' }) }); }
  const total = days.reduce((a, d) => a + d.n, 0); const max = Math.max(1, ...days.map((d) => d.n));
  const weekExams = st.exams.filter((e) => e.t >= Date.now() - 7 * DAY);
  const best = weekExams.reduce((m, e) => Math.max(m, e.note), 0);
  const active = days.filter((d) => d.n > 0).length;
  setTimeout(() => { const b = $('#week-share'); if (b) b.onclick = async () => { const text = `DEC épreuve 1 · ma semaine : ${total} réponses sur ${active} jour${active > 1 ? 's' : ''}${weekExams.length ? `, ${weekExams.length} examen${weekExams.length > 1 ? 's' : ''} blanc${weekExams.length > 1 ? 's' : ''} (meilleur : ${best}/20)` : ''}.`; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Bilan copié'); } } catch { /* annulé */ } }; }, 0);
  return `<div class="card week"><h2>Ma semaine</h2>
    <div class="week-bars">${days.map((d) => `<div class="week-day"><i style="height:${Math.round((d.n / max) * 100)}%"></i><span>${esc(d.label)}</span></div>`).join('')}</div>
    <div class="g-stats week-stats"><span><b>${total}</b>réponses</span><span><b>${active}</b>jour${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}</span><span><b>${weekExams.length ? `${best}` : '—'}</b>meilleur examen</span></div>
    <button class="btn sm" id="week-share">${ic('external')} Partager</button></div>`;
}
function careerView() {
  const pr = state.progress; const lv = xpInfo();
  const vitrine = state.catalog.filter((b) => b.prop && pr.badges[b.id] && !b.hidden);
  return `<div class="card g-hero-card">${CR.heroHtml(lv.info, lv.readiness)}</div>
    ${weekCard()}
    <div class="card">${CR.levelCardHtml(lv.info, { today: lv.today, conds: lv.conds, blocked: lv.blocked })}</div>
    <div class="card"><h2>Comment on avance</h2><p class="muted" style="margin:4px 0 0"><strong>Les points font avancer</strong> dans un grade : chaque réponse (+1, +2 si juste, jusqu’à 3 réponses et 3 réussites par question, le double sur une question difficile), chaque examen blanc (+20 et la note), chaque short, les records de série et les journées d’au moins 10 réponses. <strong>Les résultats font passer</strong> au grade suivant : annales vues, examens blancs, taux de réussite.</p></div>
    <div class="card"><h2>Le parcours</h2>${CR.timelineHtml(lv.info, pr.grades, lv.readiness)}</div>
    <div class="card"><h2>Vitrine · ${vitrine.length}</h2><p class="muted" style="margin:4px 0 10px">Les objets gagnés avec les badges. Touchez-en un pour voir le badge.</p>
      ${vitrine.length ? `<div class="vitrine">${vitrine.map((b) => `<button class="vit" data-badge-card="${b.id}" title="${esc(b.name)}">${badgeIcon(b)}<span>${esc(b.name)}</span></button>`).join('')}</div>` : '<p class="muted">Encore vide : le premier badge y posera son objet.</p>'}</div>`;
}
function badgeCard(b) {
  const pr = state.progress; const got = pr.badges[b.id]; const p = G.progressOf(b, pr.stats);
  const secret = !got && b.hidden;
  return `<button class="bcard ${got ? 'got' : 'locked'} r-${b.rarity}" data-badge-card="${b.id}">${badgeIcon(b, !got)}
    <div class="bname">${secret ? '???' : esc(b.name)}</div>
    <div class="bmeta">${G.RARITIES[b.rarity].label}</div>
    ${got ? '' : `<div class="progress sm"><div style="width:${Math.round((p.cur / Math.max(1, p.max)) * 100)}%"></div></div><div class="bmeta">${secret ? esc(b.hint) : `${p.cur}/${p.max}`}</div>`}</button>`;
}
function collectionView() {
  const fam = state.collFamily; const pr = state.progress;
  const chips = G.FAMILIES.map((f) => { const all = state.catalog.filter((b) => b.family === f.id); const n = all.filter((b) => pr.badges[b.id]).length; return `<button class="chip ${fam === f.id ? 'on' : ''}" data-fam="${f.id}">${ic(f.icon)} ${f.label} ${n}/${all.length}</button>`; }).join('');
  const list = state.catalog.filter((b) => b.family === fam);
  const main = list.filter((b) => b.sub !== 'tags');
  const tags = list.filter((b) => b.sub === 'tags');
  const sorted = (arr) => [...arr].sort((a, b) => (pr.badges[b.id] ? 1 : 0) - (pr.badges[a.id] ? 1 : 0) || G.RARITIES[a.rarity].rank - G.RARITIES[b.rarity].rank);
  return `<div class="chips scroll">${chips}</div>
    <div class="bgrid">${(fam === 'anecdotes' ? main : sorted(main)).map(badgeCard).join('')}</div>
    ${tags.length ? `<details class="card" style="margin-top:12px"><summary>Sous-thèmes ${tags.filter((b) => pr.badges[b.id]).length}/${tags.length}</summary><div class="bgrid" style="margin-top:10px">${sorted(tags).map(badgeCard).join('')}</div></details>` : ''}`;
}
// Souvenirs : l'album se lit, il ne se parcourt pas. En haut, les trois souvenirs les plus proches (ce qu'il faut
// réviser pour les débloquer) ; puis l'album des souvenirs acquis, en récit daté ; les autres restent comptés par chapitre
// et se déplient à la demande.
function souvenirsView() {
  const pr = state.progress;
  const anecs = state.catalog.filter((b) => b.family === 'anecdotes');
  const got = anecs.filter((a) => pr.badges[a.id]); const left = anecs.filter((a) => !pr.badges[a.id]);
  const prog = (a) => { const p = G.progressOf(a, pr.stats); return p.max ? p.cur / p.max : 0; };
  const next = left.filter((a) => a.ids.length).map((a) => ({ a, r: prog(a), p: G.progressOf(a, pr.stats) })).sort((x, y) => y.r - x.r || x.p.max - y.p.max).slice(0, 3);
  const chapters = PARTS.map(([k, label]) => { const items = anecs.filter((a) => a.part === k); return { k, label, items, n: items.filter((a) => pr.badges[a.id]).length }; });
  const story = (a) => `<li class="mem"><span class="mem-date">${new Date(pr.badges[a.id]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span><div><strong>${esc(a.name)}</strong><p>« ${esc(a.desc)} »</p></div></li>`;
  const album = chapters.filter((c) => c.n).map((c) => `<h3 class="section-title">${esc(c.label)} <span class="muted">${c.n}/${c.items.length}</span></h3><ol class="mem-list">${c.items.filter((a) => pr.badges[a.id]).sort((x, y) => pr.badges[x.id] - pr.badges[y.id]).map(story).join('')}</ol>`).join('');
  const rest = chapters.map((c) => { const miss = c.items.filter((a) => !pr.badges[a.id]); if (!miss.length) return ''; return `<details class="mem-rest"><summary>${esc(c.label)} · ${miss.length} à découvrir</summary><ul>${miss.map((a) => { const p = G.progressOf(a, pr.stats); return `<li><span>${esc(a.name)}</span><span class="muted">${a.ids.length ? `${p.cur}/${p.max}` : 'blocs EC et CAC'}</span>${a.ids.length ? `<button class="linkbtn" data-train-anec="${a.id}">réviser ›</button>` : ''}</li>`; }).join('')}</ul></details>`; }).join('');
  return `<div class="card"><h2>Album</h2><div class="mem-sum"><span class="g-no">${got.length}</span><div><div class="g-line"><strong>${got.length}</strong> souvenir${got.length > 1 ? 's' : ''} sur ${anecs.length}</div><div class="mem-chapters">${chapters.map((c) => `<span class="badge">${esc(c.label)} ${c.n}/${c.items.length}</span>`).join('')}</div></div></div></div>
    ${next.length ? `<div class="card"><h2>Les prochains</h2><p class="muted" style="margin:0 0 10px">Réussir ces questions révèle un souvenir.</p><div class="mem-next">${next.map(({ a, p }) => `<div class="mem-next__item"><div><strong>${esc(a.name)}</strong><div class="progress sm"><div style="width:${Math.round((p.cur / Math.max(1, p.max)) * 100)}%"></div></div><span class="muted">${p.cur}/${p.max} question${p.max > 1 ? 's' : ''} réussie${p.cur > 1 ? 's' : ''}</span></div><button class="btn sm primary" data-train-anec="${a.id}">${ic('target')} Réviser</button></div>`).join('')}</div></div>` : ''}
    ${album ? `<div class="card">${album}</div>` : '<div class="card"><p class="muted" style="margin:0">Aucun souvenir pour l’instant : les premiers viennent avec les questions du stage.</p></div>'}
    ${rest ? `<div class="card"><h2>À découvrir</h2>${rest}</div>` : ''}`;
}

// ---------- Glossaire ----------
// Termes clés soulignés partout (première occurrence par carte, fiche ou short) ; un toucher ouvre la définition.
const GL_SKIP = 'button, a, textarea, input, select, label, code, pre, h1, h2, h3, nav, header, svg, .gl, .gl-pop, .fpill, .toast, .celebrate, .sheet-head, .feed-top, .v3, .mq, .vp-page, .cp-sec, [data-no-gl]';
const glScope = (el) => el.closest('.card, section, .sheet-body') || document.body;
// Pas d'aide pendant un examen blanc ni dans les jeux : la définition donnerait la réponse.
const glActive = () => !!state.glMatcher && state.progress.settings.glossary !== false
  && !(state.view === 'exam' && state.exam) && state.view !== 'jeux' && state.view !== 'glossaire';
function glObserve() {
  const obs = new MutationObserver((recs) => {
    if (!glActive()) return;
    const roots = new Set();
    recs.forEach((r) => r.addedNodes.forEach((n) => { const el = n.nodeType === 1 ? n : n.parentElement; if (el?.isConnected) roots.add(el); }));
    roots.forEach((el) => GL.linkTerms(el, state.glMatcher, { skip: GL_SKIP, scopeOf: glScope }));
    obs.takeRecords(); // nos propres remplacements
  });
  obs.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', (e) => {
    const g = e.target.closest?.('.gl');
    if (g) { e.preventDefault(); e.stopPropagation(); return glShow(g.dataset.gl); }
    if ($('#glpop')?.classList.contains('show') && !e.target.closest?.('#glpop')) glHide();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return glHide();
    if (e.key === 'Enter' && e.target.classList?.contains('gl')) { e.preventDefault(); glShow(e.target.dataset.gl); }
  });
}
const glPills = (e) => e.prof.map((p) => inline(`{${p.toUpperCase()}}`)).join(' ');
function glShow(id) {
  const e = state.glById[id]; if (!e) return;
  let el = $('#glpop');
  if (!el) {
    el = document.createElement('div'); el.id = 'glpop'; el.className = 'gl-pop'; el.setAttribute('role', 'dialog'); document.body.appendChild(el);
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('.gl-x')) return glHide();
      const f = ev.target.closest('[data-gl-fiche]'); if (f) { glHide(); return ficheSheet(f.dataset.glFiche); }
      const a = ev.target.closest('[data-gl-all]'); if (a) { state.glQuery = state.glById[a.dataset.glAll]?.terme || ''; state.glFilter = 'tout'; glHide(); go('glossaire'); }
    });
  }
  el.setAttribute('aria-label', e.terme);
  el.innerHTML = `<div class="gl-head"><strong>${esc(e.terme)}</strong>${glPills(e)}<button class="gl-x" aria-label="Fermer">${ic('x')}</button></div><div class="gl-def">${inline(e.def)}</div><div class="gl-act">${e.fiche ? `<button class="btn sm" data-gl-fiche="${esc(e.fiche)}">${ic('library')} Voir la fiche</button>` : ''}<button class="btn sm" data-gl-all="${esc(e.id)}">${ic('book')} Tout le glossaire</button></div>`;
  el.classList.add('show');
}
function glHide() { $('#glpop')?.classList.remove('show'); }
const GL_FILTERS = [['tout', 'Tout'], ['ec', 'EC'], ['cac', 'CAC'], ['institution', 'Institutions'], ['norme', 'Normes et textes']];
function glList() {
  const box = $('#gl-list'); if (!box) return;
  const res = GL.search(state.gloss, state.glQuery, state.glFilter);
  $('#gl-count').textContent = `${res.length} terme${res.length > 1 ? 's' : ''}`;
  box.innerHTML = res.length ? res.map((e) => `<div class="card gl-item"><div class="gl-head"><strong>${esc(e.terme)}</strong>${glPills(e)}</div>${e.alias.length ? `<div class="muted gl-alias">${e.alias.map(esc).join(' · ')}</div>` : ''}<div class="gl-def">${inline(e.def)}</div>${e.fiche ? `<button class="btn sm" data-open-fiche="${esc(e.fiche)}">${ic('library')} Voir la fiche</button>` : ''}</div>`).join('')
    : '<div class="card muted">Aucun terme ne correspond. Essayez un sigle (H2A, NEP) ou un mot de la définition.</div>';
}
views.glossaire = () => {
  setTimeout(() => {
    const q = $('#gl-q'); if (!q) return;
    q.oninput = (e) => { state.glQuery = e.target.value; glList(); };
    document.querySelectorAll('[data-gl-filter]').forEach((b) => { b.onclick = () => { state.glFilter = b.dataset.glFilter; document.querySelectorAll('[data-gl-filter]').forEach((x) => x.classList.toggle('on', x === b)); glList(); }; });
    glList();
  }, 0);
  if (!state.gloss.length) return '<div class="card"><h2>' + ic('book') + ' Glossaire</h2><p class="muted">Glossaire indisponible hors ligne : ouvrez l’application une fois en ligne.</p></div>';
  return `<div class="card"><h2>${ic('book')} Glossaire</h2><p class="muted" style="margin-top:0">${state.gloss.length} définitions clés. Partout dans l’application, les termes <span class="gl" style="cursor:default">soulignés en pointillé</span> s’ouvrent d’un toucher.</p>
    <input type="search" id="gl-q" placeholder="Rechercher : H2A, rotation, Tracfin…" value="${esc(state.glQuery)}" autocomplete="off" enterkeyhint="search">
    <div class="chips" style="margin-top:10px">${GL_FILTERS.map(([k, l]) => `<button class="chip ${state.glFilter === k ? 'on' : ''}" data-gl-filter="${k}">${l}</button>`).join('')}</div>
    <div class="muted" id="gl-count" style="margin-top:8px;font-size:13px"></div></div><div id="gl-list" data-no-gl></div>`;
};

function villeEntry() {
  return `<div class="card pc-entry"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:12px"><div><strong>${ic('landmark')} La ville des institutions</strong><div class="muted">Ordre, H2A, CNCC, chambres, tribunaux, quartier international : en 3D, qui siège où et qui fait quoi</div></div><button class="btn sm primary" data-go="ville">Visiter ›</button></div></div>`;
}
// ---------- Carte des notions ----------
// Un sous-thème par profession (js/carte.js) : poids aux annales (nombre de questions) et état de la révision.
// Mosaïque de tuiles, rangée par thème ou triée par priorité ; une profession à la fois ou les deux.
function carteEntry() {
  return `<div class="card pc-entry"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:12px"><div><strong>${ic('brain')} Carte des notions</strong><div class="muted">Tous les sous-thèmes, EC face au CAC : ce qui pèse aux annales et où vous en êtes</div></div><button class="btn sm primary" data-go="carte">Ouvrir ›</button></div></div>`;
}
const CARTE_SORTS = [['theme', 'Par thème'], ['prio', 'Priorité']];
function carteData() {
  if (!state.carte) state.carte = CA.buildGraph(state.bank.questions);
  const acc = P.tagStats(state.progress.attempts, state.byId).byKey;
  // Vue = au moins une réponse enregistrée (session, entraînement depuis la carte ou une fiche, examen blanc), pas seulement une carte de répétition.
  const seenFn = (id) => (state.progress.stats?.q?.[id]?.seen || 0) > 0;
  const states = Object.fromEntries(state.carte.nodes.map((n) => [n.id, CA.nodeState(n, state.progress.cards, acc, mastery, seenFn)]));
  return { g: state.carte, states };
}
const carteName = (n) => tagLabel(n.tag);
const pctS = (x) => (x === null ? '–' : `${Math.round(x * 100)} %`);
// Tuile : nom, nombre de questions, part vue (barre), couleur de l'état
function carteTile(n, s, { prof = false, rank = 0 } = {}) {
  return `<button class="ctile ${s.level}" data-cn="${esc(n.id)}" aria-label="${esc(`${rank ? `${rank}. ` : ''}${carteName(n)} (${n.prof}) : ${CA.LEVELS[s.level]}, ${s.seen} questions vues sur ${s.n}`)}">
    <span class="ctile-name">${rank ? `<span class="ctile-k">${rank}</span> ` : ''}${prof ? `<span class="badge ${n.prof.toLowerCase()}">${n.prof}</span> ` : ''}${esc(carteName(n))}</span>
    <span class="ctile-meta"><strong>${n.ids.length}</strong> Q · ${CA.LEVELS[s.level]}</span>
    <span class="ctile-bar"><i style="width:${Math.round(s.cover * 100)}%"></i></span></button>`;
}
// prof : 'EC' ou 'CAC' (une profession, tuiles sur deux colonnes), sinon les deux côte à côte
function carteMosaique(g, states, prof) {
  return CA.THEME_ORDER.map((t) => {
    const col = (p) => g.nodes.filter((n) => n.prof === p && n.theme === t).sort((a, b) => b.ids.length - a.ids.length);
    if (prof) { const c = col(prof); return c.length ? `<div class="card"><h2>${esc(THEMES[t])}</h2><div class="cmosa one">${c.map((n) => carteTile(n, states[n.id])).join('')}</div></div>` : ''; }
    return `<div class="card"><h2>${esc(THEMES[t])}</h2><div class="cmosa">${['EC', 'CAC'].map((p) => `<div><div class="cmosa-h"><span class="badge ${p.toLowerCase()}">${p}</span></div>${col(p).map((n) => carteTile(n, states[n.id])).join('') || '<p class="muted">—</p>'}</div>`).join('')}</div></div>`;
  }).join('');
}
// Gain à travailler un sous-thème : poids aux annales × ce qui reste à acquérir (fragile : une fois et demie)
const carteGain = (n, s) => n.ids.length * (1 - s.score) * (s.level === 'fragile' ? 1.5 : 1);
views.carte = () => {
  const { g, states } = carteData();
  const sort = state.carteSort === 'prio' ? 'prio' : 'theme';
  // Une profession à la fois (plus léger) ou les deux
  const prof = ['EC', 'CAC'].includes(state.carteProf) ? state.carteProf : state.carteProf === 'tout' ? null : 'EC';
  const inView = g.nodes.filter((n) => !prof || n.prof === prof);
  const count = (l) => inView.filter((n) => states[n.id].level === l).length;
  setTimeout(() => {
    document.querySelectorAll('[data-csort]').forEach((b) => { b.onclick = () => { state.carteSort = b.dataset.csort; render(); }; });
    document.querySelectorAll('[data-cprof]').forEach((b) => { b.onclick = () => { state.carteProf = b.dataset.cprof; state.carteSel = null; render(); }; });
    document.querySelectorAll('#main [data-cn]').forEach((b) => { b.onclick = () => carteDetail(g, states, b.dataset.cn); });
    if (state.carteSel) carteDetail(g, states, state.carteSel);
  }, 0);
  const legend = Object.entries(CA.LEVELS).map(([k, l]) => `<span class="cleg"><i class="${k}"></i>${l} <span class="muted">${count(k)}</span></span>`).join('');
  const chips = (list, cur, attr) => `<div class="tabs">${list.map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-${attr}="${k}">${l}</button>`).join('')}</div>`;
  const body = sort === 'prio'
    ? `<div class="card"><h2>À travailler d’abord</h2><p class="muted">Nombre de questions des annales × ce qui reste à acquérir ; les sous-thèmes fragiles comptent une fois et demie.</p><div class="cmosa one">${inView.map((n) => ({ n, gain: carteGain(n, states[n.id]) })).sort((a, b) => b.gain - a.gain).map(({ n }, i) => carteTile(n, states[n.id], { prof: !prof, rank: i + 1 })).join('')}</div></div>`
    : carteMosaique(g, states, prof);
  return `<button class="btn sm" data-go="fiches" style="margin-bottom:12px">← Fiches</button>
    <div class="card"><h2>${ic('brain')} Carte des notions</h2><div class="cleg-row">${legend}</div><p class="muted" style="margin:6px 0 10px">Chiffre : questions des annales sur ce sous-thème. Barre : part déjà vue.</p>
      <div class="ctools">${chips([['EC', 'EC'], ['CAC', 'CAC'], ['tout', 'Les deux']], prof || 'tout', 'cprof')}${chips(CARTE_SORTS, sort, 'csort')}</div></div>
    ${body}
    <div id="carte-panel" class="carte-panel" aria-live="polite" hidden></div>`;
};
function carteDetail(g, states, id) {
  state.carteSel = id;
  document.querySelectorAll('#main [data-cn]').forEach((b) => b.classList.toggle('sel', b.dataset.cn === id));
  const panel = $('#carte-panel'); if (!panel) return;
  const n = id && g.nodes.find((x) => x.id === id);
  if (!n) { panel.hidden = true; state.carteSel = null; return; }
  const s = states[id]; const nb = CA.neighbours(g, id);
  const name = (k) => { const x = g.nodes.find((y) => y.id === k); return x ? `${carteName(x)} (${x.prof})` : k; };
  const fiche = (() => { const sc = {}; for (const f of state.fiches) { if (f.kind !== 'visuel' || !f.questions) continue; const k = n.ids.filter((q) => f.questions.includes(q)).length; if (k) sc[f.file] = k; } return Object.entries(sc).sort((a, b) => b[1] - a[1])[0]?.[0]; })();
  panel.hidden = false;
  panel.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><strong><span class="badge ${n.prof.toLowerCase()}">${n.prof}</span> ${esc(carteName(n))}</strong><button class="btn sm" id="cp-x" aria-label="Fermer">${ic('x')}</button></div>
    <div class="muted" style="margin:4px 0">${CA.LEVELS[s.level]} · ${s.seen}/${s.n} vues · réussite ${pctS(s.acc)}${s.answers ? ` (${s.answers} réponses)` : ''}</div>
    ${nb.twin || nb.links.length ? `<div class="cp-links" aria-label="Souvent posé avec">${nb.twin ? `<button class="chip" data-cp="${esc(nb.twin)}">⇄ ${esc(name(nb.twin))}</button>` : ''}${nb.links.slice(0, 4).map((l) => `<button class="chip" data-cp="${esc(l.id)}">${esc(name(l.id))}</button>`).join('')}</div>` : ''}
    <div class="cp-act"><button class="btn sm primary" id="cp-train">${ic('target')} Réviser (${Math.min(20, n.ids.length)})</button>${fiche ? `<button class="btn sm" id="cp-fiche" title="${esc(shortTitle(fiche))}">${ic('chart')} Schéma</button>` : ''}</div>`;
  $('#cp-x').onclick = () => carteDetail(g, states, null);
  // Les moins sûres d'abord : jamais vues et ratées en tête
  $('#cp-train').onclick = () => trainOn(n.ids.slice().sort((a, b) => mastery(state.progress.cards[a]) - mastery(state.progress.cards[b])).slice(0, 20), `Carte : ${carteName(n)} (${n.prof})`);
  if (fiche) $('#cp-fiche').onclick = () => openFiche(fiche);
  panel.querySelectorAll('[data-cp]').forEach((b) => { b.onclick = () => { carteDetail(g, states, b.dataset.cp); document.querySelector(`#main [data-cn="${CSS.escape(b.dataset.cp)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }; });
}
const injectCss = (id, css) => { if (!$(`#${id}`)) { const st = document.createElement('style'); st.id = id; st.textContent = css; document.head.appendChild(st); } };
// La visite 3D survit aux rafraîchissements de l'écran (synchronisation, fiche refermée…) : son élément est
// remis en place tel quel, avec sa position et son contexte WebGL ; elle s'arrête seulement en quittant la vue ou l'onglet.
function stopVille3D() { if (state.v3) { try { state.v3.stop(); } catch { /* ignore */ } state.v3 = null; state.v3el = null; } document.body.classList.remove('print-plan', 'v3-lock'); }
views.ville = () => {
  const tab = ['plan', 'compo', '3d'].includes(state.villeTab) ? state.villeTab : 'hub';
  const titles = Object.fromEntries(state.fiches.map((f) => [f.file, f.title.replace(/^(Schéma|Fiche)\s*\d+\s*[–-]\s*/, '')]));
  const rive = state.villeRive || 'ec';
  // La visite 3D s'ouvre en plein écran (✕ pour en sortir) ; la page de la ville reste derrière.
  const open3d = tab === '3d' && state.v3open === true;
  if (!open3d) stopVille3D();
  document.body.classList.toggle('print-plan', tab === 'plan' || tab === 'compo');
  document.body.classList.toggle('v3-lock', open3d);
  // Plan d'une profession, réduit à la largeur de l'écran ; toucher une pièce ouvre la visite 3D devant ce bâtiment.
  const showPlan = (root) => {
    injectCss('villeplan-css', PLAN_CSS); document.body.classList.add('print-plan');
    root.innerHTML = planHtml(titles);
    const pg = root.querySelector('.vp-page');
    const fit = () => { pg.style.zoom = ''; pg.style.zoom = String(Math.min(1, root.clientWidth / pg.offsetWidth)); };
    fit(); window.addEventListener('resize', fit, { once: true });
    root.onclick = (e) => { const r = e.target.closest('.vp-room[data-id]'); if (!r) return; state.villeTab = '3d'; state.v3open = true; state.villeGoto = r.dataset.id; render(); };
  };
  setTimeout(async () => {
    const root = $('#ville'); if (!root) return;
    if (tab === 'plan') return showPlan(root);
    if (tab === 'compo') {
      injectCss('v3-compo-css', COMPO_CSS); root.innerHTML = `<div class="card"><h1 class="cp-ptitle">Qui compose chaque institution</h1>${compositionHtml()}</div>`;
      root.onclick = (e) => { const c = e.target.closest('.cp-b[data-id]'); if (!c) return; state.villeTab = '3d'; state.v3open = true; state.villeGoto = c.dataset.id; render(); };
      return;
    }
    if (!open3d) return;
    if (state.v3 && state.v3el) { root.replaceWith(state.v3el); return; }
    injectCss('maquette-css', MAQUETTE_CSS); injectCss('v3-compo-css', COMPO_CSS);
    try {
      const THREE = await import('./vendor/three.module.min.js');
      if (!$('#ville') || state.view !== 'ville' || state.villeTab === 'plan') return;
      state.v3 = startMaquette(root, THREE, { full: true, onQuit: () => { state.v3open = false; state.villeTab = 'hub'; stopVille3D(); render(); }, fiches: titles, onFiche: (file) => ficheSheet(file) });
      state.v3el = root;
      if (state.villeGoto) { state.v3.goto(state.villeGoto); state.villeGoto = null; }
    } catch (e) {
      root.classList.remove('mq', 'mq-full');
      root.innerHTML = `<div class="card"><p class="muted">La visite 3D n’a pas pu démarrer sur cet appareil (${esc(e?.message || 'WebGL indisponible')}). Le plan ci-dessous a la même disposition.</p></div><div id="ville-alt"></div>`;
      showPlan($('#ville-alt'));
    }
  }, 0);
  // Accueil de la ville : trois choix. Les pages « Compositions » et « Plan » ont une barre (retour, imprimer, PDF).
  const choix = [['3d', ic('landmark'), 'Visiter la maquette (3D)', 'L’EC à gauche, le CAC à droite, rangée par rangée ; le quartier commun au fond. On entre dans chaque institution pour voir qui y siège.'],
    ['compo', ic('clipboard'), 'Les compositions', 'Qui siège dans chaque institution, rangé par profession. À lire ou à imprimer.'],
    ['plan', ic('library'), 'Le plan à imprimer', 'La maquette vue de dessus, sur une page A4.']];
  if (tab === 'hub') return `<div class="no-print"><button class="btn sm" data-go="fiches">← Fiches</button>
    <div class="card" style="margin-top:10px"><h2>${ic('landmark')} La ville des institutions</h2><p class="muted" style="margin:4px 0 0">Un palais mental des institutions de l’expert-comptable et du commissaire aux comptes.</p></div>
    <div class="list">${choix.map(([id, i, t, d]) => `<button class="card pc-entry" data-ville-tab="${id}" style="text-align:left;width:100%;display:block;cursor:pointer"><strong>${i} ${t}</strong><div class="muted">${d}</div></button>`).join('')}</div></div>`;
  const pdf = tab === 'plan' ? './data/ville-plan.pdf' : './data/ville-compositions.pdf';
  return `<div class="no-print ville-bar"><button class="btn sm" data-ville-tab="hub">← Retour</button><button class="btn sm primary" id="ville-print" data-pdf="${pdf}">${ic('files')} Imprimer</button><button class="btn sm" id="ville-pdf" data-pdf="${pdf}">${ic('download')} PDF</button>${tab === 'plan' ? '' : `<button class="btn sm" data-ville-tab="plan">${ic('library')} Plan</button>`}${tab === 'compo' ? '' : `<button class="btn sm" data-ville-tab="compo">${ic('clipboard')} Compositions</button>`}</div>
    <p class="muted no-print" style="margin:6px 0">${tab === 'compo' ? 'Touchez une institution pour l’ouvrir dans la maquette.' : 'Touchez une tuile pour l’ouvrir dans la maquette.'}</p>
    <div id="ville"></div>`;
};
const NAV = [
  ['home', ic('home'), 'Accueil'], ['review', ic('repeat'), 'Réviser'], ['train', ic('target'), 'Entraîner'], ['shorts', ic('clapper'), 'Shorts'], ['exam', ic('timer'), 'Examen'], ['carriere', ic('trophy'), 'Carrière'], ['fiches', ic('library'), 'Fiches'],
];
const NAV_BILAN = [
  ['home', ic('home'), 'Accueil'], ['review', ic('repeat'), 'Réviser'], ['train', ic('target'), 'Entraîner'], ['carriere', ic('trophy'), 'Carrière'], ['plus', ic('menu'), 'Plus'],
];
// Vues rangées sous « Plus » (apparence bilan) : l'onglet reste allumé quand on y est.
const PLUS_VIEWS = new Set(['plus', 'shorts', 'exam', 'fiches', 'ville', 'carte', 'stats', 'settings', 'glossaire', 'carnet']);
function buildNav() {
  const nav = $('nav.bottom'); if (!nav) return;
  const list = isBilan() ? NAV_BILAN : NAV;
  nav.innerHTML = list.map(([v, ico, label]) => `<button data-view="${v}"><span class="ico" aria-hidden="true">${ico}</span>${label}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => { b.onclick = () => go(b.dataset.view); });
}
views.plus = () => {
  const pr = state.progress;
  const rows = [
    ['shorts', ic('clapper'), 'Shorts', 'Une notion en 30 secondes, puis une question'],
    ['exam', ic('timer'), 'Examen blanc', '20 questions, 60 minutes, en conditions'],
    ['fiches', ic('library'), 'Fiches et schémas', `${state.fiches.filter((f) => P.isRead(pr.plan, f.file)).length} / ${state.fiches.length} vues`],
    ['ville', ic('landmark'), 'Ville des institutions', 'Qui siège où, qui fait quoi'],
    ['carte', ic('brain'), 'Carte des notions', 'Les sous-thèmes, EC face au CAC'],
    ['glossaire', ic('book'), 'Glossaire', 'Les termes clés'],
    ['carnet', ic('bookmark'), 'Carnet d’erreurs', 'Ce que vous savez ne pas avoir retenu'],
    ['stats', ic('trending'), 'Statistiques', 'Niveau estimé, réussite par thème'],
    ['settings', ic('settings'), 'Réglages', 'Date de l’examen, apparence, sauvegarde'],
  ];
  return `<div class="plus">${rows.map(([v, i, t, sub]) => `<button class="plus-row" data-go="${v}"><span class="plus-row__i">${i}</span><span class="plus-row__t"><strong>${esc(t)}</strong><span>${esc(sub)}</span></span><span class="plus-row__c">›</span></button>`).join('')}</div>`;
};
function render() {
  const main = $('#main');
  main.innerHTML = views[state.view]();
  document.querySelectorAll('nav.bottom button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view || (state.view === 'plan' && b.dataset.view === 'home') || (state.view === 'jeux' && b.dataset.view === 'train') || ((state.view === 'ville' || state.view === 'carte') && b.dataset.view === 'fiches') || (b.dataset.view === 'plus' && PLUS_VIEWS.has(state.view))));
  // Transition d'écran (apparence bilan) : le contenu arrive en fondu, relancé à chaque rendu
  main.classList.remove('g-page'); void main.offsetWidth; main.classList.add('g-page');
  updateStreakBadge();
  main.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  main.querySelectorAll('[data-ville-tab]').forEach((b) => { b.onclick = () => { state.villeTab = b.dataset.villeTab; state.v3open = state.villeTab === '3d'; window.scrollTo(0, 0); render(); }; });
  main.querySelectorAll('[data-ville-open]').forEach((b) => { b.onclick = () => { state.v3open = true; render(); }; });
  main.querySelectorAll('[data-ville-rive]').forEach((b) => { b.onclick = () => { state.villeRive = b.dataset.villeRive; render(); }; });
  // Imprimer, PDF : dans l'app installée sur iPhone, ni window.print() ni les téléchargements ne marchent. On ouvre donc la
  // feuille de partage avec le PDF (elle propose Imprimer et Enregistrer dans Fichiers). Le fichier est chargé dès
  // l'ouverture de la page, pour que le partage parte directement du toucher. Ailleurs : impression du navigateur, téléchargement.
  const vp = $('#ville-print'), vd = $('#ville-pdf');
  if (vp || vd) {
    const url = (vp || vd).dataset.pdf, name = url.split('/').pop(); let file = null;
    fetch(url).then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) file = new File([b], name, { type: 'application/pdf' }); }).catch(() => {});
    const share = () => { if (file && navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return true; } return false; };
    const download = () => { const a = document.createElement('a'); a.href = file ? URL.createObjectURL(file) : url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (vp) vp.onclick = () => { if (standalone && share()) return; window.print(); };
    if (vd) vd.onclick = () => { if (share()) return; download(); };
  }
}
// pop : navigation venue du bouton Retour du téléphone (pas de nouvelle entrée d'historique).
function go(v, { pop = false } = {}) {
  // Quitter l'onglet pendant un examen : mis en pause (chrono arrêté), repris depuis l'onglet Examen.
  if (state.exam && v !== 'exam') pauseCurrentExam();
  // La séance, la série et le jeu en cours sont gardés : on les retrouve en revenant sur l'onglet.
  if (v !== 'jeux') stopGameTimer();
  if (v !== 'ville') stopVille3D();
  closeSheet(true);
  if (state.feed) closeFeed(true);
  glHide();
  const changed = v !== state.view;
  if (v === 'ville' && changed) { state.v3open = false; state.villeTab = 'hub'; }
  state.view = v; window.scrollTo(0, 0); render();
  if (!pop && changed) { try { history.pushState({ v }, ''); } catch { /* ignore */ } }
}
// Bouton Retour (Android, geste iOS) : ferme d'abord la fiche ouverte par-dessus, sinon revient à l'écran précédent.
function onPop(e) {
  if ($('#sheet')?.classList.contains('show')) { closeSheet(true); return; }
  if (state.feed) { closeFeed(true); return; }
  const v = e.state?.v;
  if (v && v !== state.view && views[v]) go(v, { pop: true });
}

function initGamify() {
  state.gctx = G.buildContext(state.bank);
  refreshExamBadges(); applyLook();
  const pr = state.progress;
  pr.badges = pr.badges || {}; pr.grades = pr.grades || {};
  if (!pr.stats || pr.stats.v !== G.STATS_VERSION) {
    // Calcul rétroactif depuis l'historique existant, sans animation
    pr.stats = G.rebuildStats(pr, state.gctx);
    const f = G.evaluate(pr, state.catalog, state.gctx, pr.stats.lastT || Date.now());
    if (f.badges.length) setTimeout(() => toast(`${f.badges.length} badges récupérés depuis votre historique`), 800);
    persist();
  }
  G.applyOpen(pr.stats, Date.now(), state.gctx);
  checkBadges();
}

// ---------- Glisser vers le bas pour recharger (comme Ernest) ----------
// En haut de page, tirer vers le bas au-delà du seuil recharge l'app et va chercher une nouvelle version.
function pullToRefresh() {
  const ind = document.createElement('div'); ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true'); ind.innerHTML = '<span class="ptr-ic">' + ic('rotate-cw') + '</span>'; document.body.appendChild(ind);
  const TH = 70; let y0 = null, d = 0, busy = false;
  const blocked = () => document.body.classList.contains('noscroll') || document.body.classList.contains('v3-lock') || !!document.querySelector('.v3, .mq, .sheet.show, .feed.show, .celebrate.show, .gl-pop.show');
  const reset = () => { ind.style.transition = 'transform .25s, opacity .25s'; ind.style.transform = 'translate(-50%, -48px)'; ind.style.opacity = '0'; ind.classList.remove('ready'); d = 0; };
  window.addEventListener('touchstart', (e) => {
    y0 = (busy || window.scrollY > 0 || blocked() || e.touches.length > 1) ? null : e.touches[0].clientY;
    ind.style.transition = 'none';
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    if (window.scrollY > 0) { y0 = null; reset(); return; }
    d = Math.max(0, Math.min((e.touches[0].clientY - y0) * 0.5, 110));
    ind.style.transform = `translate(-50%, ${d - 48}px) rotate(${d * 3}deg)`;
    ind.style.opacity = String(Math.min(1, d / 50));
    ind.classList.toggle('ready', d >= TH);
  }, { passive: true });
  window.addEventListener('touchend', () => {
    if (y0 === null) return; y0 = null;
    if (d < TH) { reset(); return; }
    busy = true; ind.classList.add('spin'); ind.style.transition = 'transform .2s'; ind.style.transform = `translate(-50%, ${TH - 40}px)`;
    refreshApp();
  }, { passive: true });
  window.addEventListener('touchcancel', () => { y0 = null; reset(); }, { passive: true });
}
async function refreshApp() {
  persist();
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      await reg.update();
      const sw = reg.installing || reg.waiting;
      if (sw) await new Promise((res) => { const t = setTimeout(res, 3000); sw.addEventListener('statechange', () => { if (sw.state === 'activated') { clearTimeout(t); res(); } }); });
    }
  } catch { /* hors ligne : on recharge quand même */ }
  setTimeout(() => location.reload(), 300);
}

const STORE_EXPECTED = 4;
// Mélange de versions (cache hors ligne d'une ancienne version + code neuf) : on vide les caches, on force
// le rechargement des fichiers puis on relance, une seule fois par session.
async function recoverFromStaleCache() {
  try { if (sessionStorage.getItem('dec1.recover')) return false; sessionStorage.setItem('dec1.recover', '1'); } catch { return false; }
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    await Promise.all(['./', './index.html', './css/app.css', './js/app.js', './js/store.js', './js/bank.js', './js/srs.js', './js/plan.js', './js/exam.js', './js/gamify.js', './js/catalog-data.js', './js/cluster.js', './js/drill.js', './js/games.js', './js/palais.js', './js/estimate.js', './js/carnet.js', './js/shorts.js', './js/career.js', './js/scenes.js', './js/glossaire.js', './js/qrc.js', './js/sync.js', './js/ville.js', './js/ville3d.js', './js/villeplan.js', './js/maquette.js', './js/vendor/three.module.min.js', './sw.js']
      .map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
  } catch { /* on relance quand même */ }
  location.reload();
  return true;
}

async function init() {
  if (store.STORE_VERSION !== STORE_EXPECTED && await recoverFromStaleCache()) return;
  try { const th = localStorage.getItem('dec1.theme'); if (th) document.documentElement.dataset.theme = th; } catch { /* ignore */ }
  document.documentElement.dataset.look = 'bilan';
  buildNav();
  $('#settingsBtn').onclick = () => go('settings');
  $('#glossBtn').onclick = () => go('glossaire');
  try { history.replaceState({ v: state.view }, ''); } catch { /* ignore */ }
  window.addEventListener('popstate', onPop);
  const sh = document.createElement('div'); sh.id = 'sheet'; sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.tabIndex = -1; document.body.appendChild(sh);
  sh.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  sh.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-fiche]'); if (b) return ficheSheet(b.dataset.openFiche);
    const f = e.target.closest('[data-shorts-step]'); if (f) { closeSheet(true); openFeed({ focus: [f.dataset.shortsStep] }); }
  });
  $('#main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-fiche]'); if (b) return ficheSheet(b.dataset.openFiche);
    const v = e.target.closest('[data-variants]'); if (v) return variantsSheet(v.dataset.variants);
    const tk = e.target.closest('[data-task]'); if (tk) return dayTasks().find((x) => x.id === tk.dataset.task)?.run();
    const nx = e.target.closest('[data-next]'); if (nx) return state.nextList[Number(nx.dataset.next)]?.run();
    const other = e.target.closest('[data-next-other]'); if (other) { state.nextIdx++; return render(); }
    const g = e.target.closest('[data-game]'); if (g) return startGame(g.dataset.game);
    const f = e.target.closest('[data-shorts-step]'); if (f) return openFeed({ focus: f.dataset.shortsStep ? [f.dataset.shortsStep] : [] });
  });
  try {
    // Chargements en parallèle (banque, index des fiches, shorts, glossaire)
    const [bank, fiches, , gloss] = await Promise.all([loadBank(), loadFichesIndex(), ensureShorts(), GL.loadGlossary().catch(() => [])]);
    state.bank = bank;
    setupHeldOut();
    state.bank.questions.forEach((q) => { state.byId[q.id] = q; });
    state.clusters = buildClusters(state.bank.questions);
    state.fiches = fiches;
    state.gloss = gloss;
    state.glById = Object.fromEntries(state.gloss.map((e) => [e.id, e]));
    state.glMatcher = GL.buildMatcher(state.gloss);
    glObserve();
    if (SY.config()) await runSync({ boot: true, timeout: 4000 }); // copie en ligne récupérée avant le plan du jour
    initGamify();
    state.notice = store.notices[0] || null;
    const savedExam = store.loadExam();
    if (savedExam) resumeExam(savedExam);
    try {
      state.persisted = await navigator.storage?.persisted?.() ?? null;
      if (state.persisted === false) state.persisted = (await navigator.storage?.persist?.()) ?? false;
    } catch { /* ignore */ }
  } catch (e) {
    $('#main').innerHTML = `<div class="card"><h2>Chargement impossible</h2><p>${esc(e.message)}</p><p class="muted">Vérifiez la connexion pour le premier chargement.</p></div>`;
    return;
  }
  render();
  pullToRefresh();
  watchSync();
  if (SY.config()) setTimeout(() => sendPont(SY.config()), 1500);
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Mise à jour disponible : tirez l’écran vers le bas pour recharger'); });
      });
    } catch { /* hors ligne ou non supporté */ }
  }
}
init();
