import { newCard, review, buildQueue, mastery, DAY, spreadOf, suggestGrade, confidentError, qrcPoints, calibration, confidentErrors } from './srs.js';
import * as store from './store.js';
import { loadBank, loadFichesIndex, loadFiche, renderMarkdown, inline, THEMES } from './bank.js';
import { startExam, remainingMs, finishExam } from './exam.js';
import * as G from './gamify.js';
import { renderScene, PROP_NAMES } from './scene.js';
import * as P from './plan.js';
import { buildClusters } from './cluster.js';
import { recordDrill, pickDrill, drillStats } from './drill.js';
import * as GM from './games.js';
import * as PAL from './palais.js';
import { estimate } from './estimate.js';

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
// Avant l'épreuve, chaque carte revient au plus tard entre J-3 et J-1 (étalement selon l'identifiant).
const reviewOpts = (id) => ({ examAt: examAt(), spread: spreadOf(id) });
// Autres sessions où la même notion a été posée.
function siblings(id) {
  const n = state.clusters.clusterOf[id];
  return n === undefined ? [] : state.clusters.groups[n].filter((x) => x !== id);
}
function persist() { if (!store.save(state.progress)) toast('Stockage local indisponible : progression non sauvegardée'); }

// ---------- Gamification ----------
// Toute réponse passe par ici : historique, statistiques, badges.
function answer(id, ok, mode, { defer = false, t = Date.now(), conf = null } = {}) {
  const att = { id, ok: !!ok, mode, t };
  if (conf !== null) att.conf = conf;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) att.off = 1;
  store.pushAttempt(state.progress, att);
  G.applyAnswer(state.progress.stats, att, state.gctx);
  if (!defer) checkBadges();
  updateStreakBadge();
}
function checkBadges() {
  const fresh = G.evaluate(state.progress, state.catalog, state.gctx, Date.now());
  persist();
  // Mode concentration : badges et souvenirs s'annoncent par un message ; seuls les grades gardent leur animation.
  if (state.progress.settings.focus) {
    if (fresh.badges.length) toast(fresh.badges.length === 1 ? `🏅 ${fresh.badges[0].name}` : `🏅 ${fresh.badges.length} badges débloqués`);
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
  el.innerHTML = `<span title="Série en cours">🔥 ${s.cur}</span><span class="muted" title="Record personnel">record ${s.best}</span>`;
}
function badgeIcon(b, locked = false) {
  const col = G.RARITIES[b.rarity].color;
  const fam = G.FAMILIES.find((f) => f.id === b.family);
  const glyph = locked && b.hidden ? '?' : fam.icon;
  return `<svg class="medal ${locked ? 'locked' : ''} ${b.gold ? 'gold' : ''}" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M12 2 h6 l2 10 h-6z M22 2 h6 l-2 10 h-6z" fill="${col}" opacity=".7"/>
    <circle cx="20" cy="24" r="14" fill="${b.gold ? '#fde68a' : '#fff'}" stroke="${col}" stroke-width="3"/>
    <text x="20" y="29" font-size="13" text-anchor="middle">${glyph}</text></svg>`;
}
function sceneFor(gradeN, opts = {}) {
  const pr = state.progress; const st = pr.stats;
  const seenProps = new Set(); const badgeProps = [];
  for (const b of state.catalog) {
    if (!b.prop || !pr.badges[b.id] || seenProps.has(b.prop) || !PROP_NAMES.has(b.prop)) continue;
    seenProps.add(b.prop); badgeProps.push([b.id, b.prop, b.name]);
  }
  const seenCount = Object.keys(st.q).length;
  const grade = G.GRADES[gradeN - 1];
  const h = new Date().getHours();
  return renderScene(gradeN, {
    decor: grade.decor, badgeProps, bestStreak: st.streak.best,
    coverage: seenCount / Math.max(1, state.gctx.all.length),
    stickers: state.catalog.filter((b) => b.sub === 'tags' && pr.badges[b.id]).length,
    glow: !!pr.badges['mast-total'], night: !!pr.badges['hid-couche-tard'] && (h >= 21 || h < 6),
    ...opts,
  });
}
function nextCelebration() {
  if (state.celebrating) return;
  const c = state.celebrations.shift(); if (!c) return;
  state.celebrating = true;
  const box = $('#celebrate');
  const close = () => { box.classList.remove('show'); state.celebrating = false; setTimeout(nextCelebration, 250); };
  let html = '';
  if (c.type === 'grade') {
    html = `<div class="cel-grade"><div class="cel-scene">${sceneFor(c.g.n)}</div><div class="cel-ribbon">Nouveau grade</div><h2>${esc(c.g.name)}</h2><p class="muted">Votre bureau a changé. Touchez pour continuer.</p></div>`;
    try { navigator.vibrate?.([60, 40, 120]); } catch { /* ignore */ }
  } else if (c.type === 'anecdote') {
    const d = new Date(state.progress.badges[c.b.id] || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    html = `<div class="memory flip"><div class="memory-date">${d}</div><div class="memory-title">📸 ${esc(c.b.name)}</div><p class="memory-text">« ${esc(c.b.desc)} »</p><div class="muted">Souvenir débloqué · ${G.RARITIES[c.b.rarity].label}</div></div>`;
    try { navigator.vibrate?.(40); } catch { /* ignore */ }
  } else {
    const col = G.RARITIES[c.b.rarity].color;
    html = `<div class="cel-badge" style="--halo:${col}"><div class="cel-medal">${badgeIcon(c.b)}</div><div class="cel-rarity" style="color:${col}">${G.RARITIES[c.b.rarity].label}</div><h2>${esc(c.b.name)}</h2><p>${esc(c.b.desc)}</p>${c.b.prop && PROP_NAMES.has(c.b.prop) ? '<p class="muted">Un nouvel objet est apparu dans votre bureau.</p>' : ''}</div>`;
    try { navigator.vibrate?.(30); } catch { /* ignore */ }
  }
  box.innerHTML = html;
  box.classList.add('show');
  box.onclick = close;
  clearTimeout(nextCelebration._t);
  nextCelebration._t = setTimeout(() => { if (box.classList.contains('show')) close(); }, c.type === 'grade' ? 6000 : 3800);
}
function trainOn(ids, title, mode = 'qcm') {
  const qs = ids.map((id) => state.byId[id]).filter(Boolean);
  state.train = { prof: 'all', theme: 'all', tag: 'all', mode, queue: qs, idx: 0, ok: 0, n: 0, title };
  go('train');
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function shuffle(arr, seed) {
  // Mélange déterministe par id (pour que l'ordre des propositions soit stable pendant une question)
  let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const a = arr.map((v, i) => ({ v, r: (Math.sin(s + i * 9301) + 1) / 2 }));
  return a.sort((x, y) => x.r - y.r).map((x) => x.v);
}
function daysToExam() {
  const d = new Date(state.progress.settings.examDate);
  return Math.ceil((d - Date.now()) / DAY);
}
function intervalLabel(card, g, id) {
  const now = Date.now();
  const c = review(card || newCard(), g, now, reviewOpts(id));
  if (g === 0) return '10 min';
  const d = Math.round((c.due - now) / DAY);
  return d === 1 ? '1 j' : `${d} j`;
}

// ---------- Rendu commun d'une question ----------
function qHeader(q) {
  const conf = q.confidence === 'low' ? '<span class="badge warn">à vérifier</span>' : q.confidence === 'medium' ? '<span class="badge">confiance moyenne</span>' : '';
  const sib = siblings(q.id).length;
  return `<div class="row" style="justify-content:space-between">
    <div class="row" style="gap:6px"><span class="badge ${q.profession.toLowerCase()}">${q.profession}</span><span class="badge">${esc(THEMES[q.theme])}</span>${sib ? `<span class="badge rec" title="Notion posée à plusieurs sessions">🔁 posée ${sib + 1}×</span>` : ''}${state.progress.settings.showLowConfidence ? conf : ''}</div>
    <span class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n}</span></div>`;
}
function qExplain(q) {
  const sib = siblings(q.id);
  return `<div class="explain"><strong>Explication.</strong> ${esc(q.explanation)}${q.update_note ? `<div class="muted" style="margin-top:6px">⚠︎ ${esc(q.update_note)}</div>` : ''}</div>
    <div class="ref">Réf. : ${esc(q.reference)} · <em>réponse rédigée à partir des textes, non officielle</em></div>${relatedFiches(q.id).map((f) => `<button class="btn sm related" data-open-fiche="${esc(f.file)}">📊 Schéma : ${esc(f.title.replace(/^Schéma\s*\d+\s*[–-]\s*/, ''))}</button>`).join('')}${sib.length ? `<button class="btn sm related" data-variants="${esc(q.id)}">🔁 Même notion : ${sib.map((id) => esc(state.byId[id]?.sessionLabel || '')).join(', ')}</button>` : ''}`;
}
// Indice de certitude, demandé avant la correction (calibration, effet d'hypercorrection).
const CERT = { qcm: [[2, 'Sûr'], [1, 'Hésitant'], [0, 'Au hasard']], qrc: [[2, 'Sûr'], [1, 'Hésitant'], [0, 'Je ne sais pas']] };
const certRow = (mode, label) => `<div class="cert"><div class="muted">${label}</div><div class="btnrow3">${CERT[mode].map(([c, l]) => `<button class="btn" data-conf="${c}">${l}</button>`).join('')}</div></div>`;
const hcAlert = () => '<div class="hc">⚠️ <strong>Erreur commise avec certitude.</strong> C’est celle qu’on retient le mieux une fois corrigée : lisez l’explication, la question revient dans la séance.</div>';
// QCM. opts.hide : la question d'abord, les propositions sur demande (rappel avant reconnaissance).
// onAnswered(ok, conf) ; conf vaut null si la certitude n'est pas demandée.
function renderQcm(q, container, onAnswered, { hide = false, askConf = false } = {}) {
  const order = shuffle([0, 1, 2, 3], q.id);
  const qt = q.qcm.question || q.question;
  container.innerHTML = `${qHeader(q)}<div class="q">${esc(qt)}</div>${hide ? '<div class="recall"><p class="muted">🧠 Formulez votre réponse de tête, puis comparez-la aux propositions.</p><button class="btn primary show-choices">Afficher les propositions</button></div>' : ''}<div class="choices ${hide ? 'hidden' : ''}"></div><div class="pending"></div><div class="after"></div>`;
  const box = $('.choices', container);
  if (hide) $('.show-choices', container).onclick = () => { $('.recall', container).remove(); box.classList.remove('hidden'); };
  let chosen = null;
  const reveal = (conf) => {
    const ok = order[chosen] === q.qcm.answer;
    [...box.children].forEach((c, j) => {
      c.disabled = true; c.classList.remove('sel');
      if (order[j] === q.qcm.answer) c.classList.add('ok');
      else if (j === chosen) c.classList.add('ko');
    });
    $('.pending', container).innerHTML = '';
    $('.after', container).innerHTML = `${confidentError(ok, conf) ? hcAlert() : ''}<div class="answer"><strong>${ok ? '✔ Bonne réponse' : '✘ Mauvaise réponse'}.</strong> ${esc(q.qrc.model_answer)}</div>${qExplain(q)}`;
    onAnswered(ok, conf);
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
        p.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
    };
    box.appendChild(b);
  });
}
// QRC. onRevealed(conf) à l'affichage du corrigé ; onCheck(ratio, conf) à chaque élément coché ou décoché.
function renderQrc(q, container, onRevealed, onCheck = () => {}, { askConf = false } = {}) {
  const qt = q.qrc.question || q.question;
  container.innerHTML = `${qHeader(q)}<div class="q">${esc(qt)}</div>
    <textarea placeholder="Votre réponse (facultatif : vous pouvez répondre de tête)…"></textarea>
    <div style="margin-top:10px" class="reveal-box">${askConf ? certRow('qrc', 'Voir la réponse. Vous êtes…') : '<button class="btn primary reveal">Voir la réponse</button>'}</div><div class="after"></div>`;
  const reveal = (conf) => {
    $('.reveal-box', container).innerHTML = '';
    $('.after', container).innerHTML = `
      <div class="answer"><strong>Éléments attendus</strong> (cochez ce que vous aviez) :
        <ul class="expected">${q.qrc.expected.map((e, i) => `<li><input type="checkbox" id="exp${i}"><label for="exp${i}">${esc(e)}</label></li>`).join('')}</ul>
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
  };
  if (askConf) container.querySelectorAll('.reveal-box [data-conf]').forEach((b) => { b.onclick = () => reveal(Number(b.dataset.conf)); });
  else $('.reveal', container).onclick = () => reveal(null);
}
function pickMode(q) {
  const m = state.progress.settings.mode;
  if (m === 'qcm' || m === 'qrc') return m;
  // mixte : alterne selon la carte et le nombre de révisions
  const c = state.progress.cards[q.id];
  return ((c ? c.reps : 0) + q.n) % 2 === 0 ? 'qcm' : 'qrc';
}

// ---------- Vues ----------
const views = {};

views.home = () => {
  const qs = state.bank.questions;
  const pr = state.progress;
  const { due, fresh } = buildQueue(qs, pr.cards, queueOpts());
  const lastExam = pr.exams[pr.exams.length - 1];
  const d = daysToExam();
  const grade = G.currentGrade(pr);
  const next = G.GRADES[grade.n];
  const has = (id) => !!pr.badges[id];
  const conds = next ? G.gradeConditions(next.n, has, pr.stats, state.gctx) : [];
  const nb = G.nextBadges(state.catalog, pr.stats, pr.badges, 3);
  const unlocked = Object.keys(pr.badges).length;
  return `${noticeCard()}
  <div class="card hero">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="muted">Épreuve n°1 · mardi 10 novembre · 10 h 30</div><div class="big">${d > 0 ? `J-${d}` : d === 0 ? 'Jour J' : 'Passée'}</div></div>
      <div class="muted hero-meta"><span>${Object.keys(pr.stats.q).length}/${qs.length} vues</span><span>${unlocked} badges</span></div>
    </div>
    ${estimateLine()}
    <button class="btn primary big-btn" data-go="review">▶ Session du jour <span class="pill">${due.length + fresh.length}</span></button>
    <div class="btnrow" style="margin-top:10px"><button class="btn" data-go="exam">⏱ Examen blanc</button><button class="btn" data-go="train">🎯 Ciblé</button></div>
  </div>
  ${dayCard()}
  ${gamesCard()}
  ${backupCard()}
  <div class="card career-card" data-go="carriere">
    <div class="scene-thumb">${sceneFor(grade.n)}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><div><div class="muted">Grade ${grade.n}/8</div><strong>${esc(grade.name)}</strong></div><span class="muted">Ma carrière ›</span></div>
    ${next ? `<div class="muted" style="margin-top:6px">Prochain grade : <strong>${esc(next.name)}</strong></div><ul class="conds">${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✔' : '○'} ${esc(c.label)}</li>`).join('')}</ul>` : '<div class="muted">Carrière complète. Bravo.</div>'}
  </div>
  ${!pr.settings.focus && nb.length ? `<div class="card"><h2>Presque débloqués</h2>${nb.map(({ b, p }) => `<div class="nb">${badgeIcon(b)}<div style="flex:1"><div><strong>${esc(b.name)}</strong></div><div class="progress"><div style="width:${Math.round((p.cur / p.max) * 100)}%"></div></div><div class="muted">${p.cur}/${p.max} · ${esc(b.cond)}</div></div></div>`).join('')}</div>` : ''}
  ${lastExam ? `<div class="card"><h2>Dernier examen blanc</h2><div class="row"><span class="big" style="font-size:28px">${lastExam.note}/20</span><span class="muted">${lastExam.mode.toUpperCase()} · ${new Date(lastExam.t).toLocaleDateString('fr-FR')}</span></div>
    <div class="muted">EC ${pct(lastExam.byProf.EC)} · CAC ${pct(lastExam.byProf.CAC)}</div></div>` : ''}
  <div class="card"><strong>Conseil du jury</strong><p class="muted" style="margin:4px 0 8px">La partie CAC est systématiquement moins bien réussie, et les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? »</p><details><summary>Tous les conseils</summary><ul class="muted" style="padding-left:18px;margin:8px 0 0">
    <li>La partie CAC est systématiquement moins bien réussie : travaillez-la en priorité.</li>
    <li>Les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? ».</li>
    <li>Réponses courtes : un mot, un chiffre, une liste. 3 minutes par question.</li>
    <li>Références d’articles et quantum des sanctions ne sont pas exigés ; les chiffres (seuils, durées, délais) le sont.</li></ul></details>
    <div style="margin-top:10px"><button class="btn" data-go="stats">📈 Statistiques détaillées</button></div></div>`;
};
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
  const days = pr.lastExportAt ? (Date.now() - pr.lastExportAt) / DAY : Infinity;
  if (days < 2) return '';
  return `<div class="card notice"><strong>💾 Sauvegarde</strong><p class="muted" style="margin:4px 0 8px">${pr.lastExportAt ? `Dernier export il y a ${Math.floor(days)} jours.` : 'Aucun export pour l’instant.'} Si le navigateur efface les données du site, la progression est perdue.</p><button class="btn" data-go="settings">Exporter ma progression</button></div>`;
}
// ---------- Plan du jour ----------
// Figé à la première ouverture de la journée, recalculé le lendemain sur ce qui reste et sur les résultats :
// étapes non faites reportées, objectif de nouvelles cartes recalé, point faible du jour, jeu où l'on se trompe le plus.
const todayKey = () => G.dayKey(Date.now());
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueNow = () => { const now = Date.now(); return Object.values(state.progress.cards).filter((c) => c.due <= now).length; };
const tagLabel = (t) => G.TAG_LABELS?.[t] || t.replace(/_/g, ' ');
const weakIds = (w) => state.bank.questions.filter((q) => q.profession === w.prof && q.tags.includes(w.tag)).map((q) => q.id);
const GAME_PREFIX = { duel: 'duel:', vf: 'vf:', arbre: 'arb:', chiffres: 'num:', palais: 'pal:' };
function ensureDaily() {
  const pr = state.progress; const k = todayKey();
  if (pr.daily?.day === k) return pr.daily;
  const undone = P.STEPS.filter((st) => st.kind === 'schema' && !pr.plan.done[st.id]).map((st) => st.id);
  const d = P.schedule(k, G.dayKey(examAt() || Date.now()), undone)[0];
  const unseen = state.bank.questions.filter((q) => !pr.cards[q.id]).length;
  const w = P.tagStats(pr.attempts, state.byId).weak[0];
  const game = d.kind === 'veille' ? 'palais' : d.kind === 'faibles' ? 'chiffres' : P.gameOfDay(k, pr.drills);
  pr.daily = {
    day: k, n: d.n, kind: d.kind, steps: d.steps, exam: d.exam, game, newDone: 0,
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
  if (files.length) tasks.push({ id: 'read', icon: '📊', title: files.length > 1 ? `Lire les ${files.length} schémas du jour` : 'Lire le schéma du jour', sub: steps.map((st) => st.title).join(' · '), done: files.every((f) => pr.plan.read?.[f]), html: files.map((f) => `<button class="btn sm ${pr.plan.read?.[f] ? '' : 'primary'}" data-open-fiche="${esc(f)}">📊 ${esc(shortTitle(f))}</button>`).join('') });
  if (d.exam) tasks.push({ id: 'exam', icon: '⏱', title: `Examen blanc ${d.exam.toUpperCase()}`, sub: '20 questions, 60 minutes, conditions réelles', done: pr.exams.some((e) => e.t >= t0), html: '<button class="btn sm primary" data-go="exam">⏱ Passer l’examen</button>' });
  const due = dueNow(); const newLeft = Math.max(0, d.target - (d.newDone || 0));
  tasks.push({ id: 'session', icon: '🔁', title: d.target ? `Session : ${d.target} nouvelles questions et les cartes à revoir` : 'Session : les cartes à revoir uniquement', sub: `${d.newDone || 0}/${d.target} nouvelles · ${due} à revoir maintenant`, done: newLeft === 0 && due === 0, html: `<button class="btn sm ${newLeft || due ? 'primary' : ''}" data-go="review">▶ ${d.newDone || state.session ? 'Continuer' : 'Commencer'} la session</button>` });
  if (d.weak) {
    const ids = weakIds(d.weak); const today = pr.attempts.filter((a) => a.t >= t0 && ids.includes(a.id)).length; const need = Math.min(8, ids.length);
    tasks.push({ id: 'weak', icon: '🎯', title: `Point faible : ${tagLabel(d.weak.tag)} (${d.weak.prof})`, sub: `${d.weak.acc} % de réussite jusqu’ici · ${Math.min(today, need)}/${need} questions aujourd’hui`, done: today >= need, html: `<button class="btn sm" data-weak="1">🎯 Série ciblée</button>` });
  }
  if (d.kind === 'faibles') {
    const sure = confidentErrors(pr.attempts).length;
    tasks.push({ id: 'sure', icon: '⚠️', title: 'Reprendre les erreurs « j’étais sûr »', sub: `${sure} à reprendre`, done: sure === 0, html: '<button class="btn sm" data-go="train">🎯 Ouvrir les séries</button>' });
  }
  const g = GAMES[d.game];
  const played = Object.entries(pr.drills).some(([id, m]) => id.startsWith(GAME_PREFIX[d.game]) && m.last >= t0);
  tasks.push({ id: 'game', icon: g.icon, title: `Jeu du jour : ${g.name}`, sub: d.kind === 'veille' ? 'Réciter les listes, sans rien apprendre de nouveau' : 'Choisi parmi ceux où vous vous trompez le plus', done: played, html: `<button class="btn sm" data-game="${d.game}">${g.icon} Jouer</button>` });
  // Étapes du jour terminées dès que le schéma est lu et la session faite : le lendemain prend la suite.
  const read = tasks.find((x) => x.id === 'read'); const sess = tasks.find((x) => x.id === 'session');
  if (steps.length && read?.done && sess.done && steps.some((st) => !pr.plan.done[st.id])) { steps.forEach((st) => { pr.plan.done[st.id] = pr.plan.done[st.id] || Date.now(); }); persist(); }
  return tasks;
}
const KIND_LABEL = { etude: 'Apprendre', consolidation: 'Consolider', blanc: 'Examen blanc', faibles: 'Points faibles', veille: 'Veille : léger', 'jour-j': 'Jour J', apres: 'Après l’épreuve' };
function dayCard() {
  const d = ensureDaily();
  if (d.kind === 'jour-j') return '<div class="card plan-card"><h2>Jour J 🍀</h2><p class="muted">Rien de nouveau. Relisez les chiffres clés, respirez, 3 minutes par question. Partie CAC : soignez-la.</p><button class="btn" data-open-fiche="15-schema-chiffres-cles.md">📊 Les chiffres à connaître</button></div>';
  if (d.kind === 'apres') return '';
  const tasks = dayTasks(); const n = tasks.filter((x) => x.done).length;
  setTimeout(() => { const b = $('[data-weak]'); if (b) b.onclick = () => { const ids = shuffle(weakIds(d.weak), Date.now()).slice(0, 10); trainOn(ids, `Point faible : ${tagLabel(d.weak.tag)}`); }; }, 0);
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="card plan-card"><div class="row" style="justify-content:space-between"><span class="badge warn">${esc(KIND_LABEL[d.kind])} · J-${d.n}</span><span class="muted">${n}/${tasks.length} fait</span></div>
    <h2 style="margin:8px 0 2px">Mon plan du ${esc(date)}</h2><div class="progress" style="margin:6px 0 10px"><div style="width:${Math.round((n / tasks.length) * 100)}%"></div></div>
    <ol class="todo">${tasks.map((x) => `<li class="${x.done ? 'done' : ''}"><div><strong>${x.icon} ${esc(x.title)}</strong></div><div class="muted">${esc(x.sub)}</div>${x.done ? '' : x.html}</li>`).join('')}</ol>
    ${n === tasks.length ? `<div class="gfb ok">🎉 Plan du jour terminé. La suite, en boucle :</div>${nextCard(true)}` : ''}
    <button class="btn sm" data-go="plan">📅 Mon plan jusqu’au 10 novembre</button></div>`;
}
// « Et maintenant ? » : la meilleure activité du moment, d'après l'état ; « Autre idée » fait tourner la liste.
function nextActions() {
  const pr = state.progress; const out = []; const now = Date.now();
  const due = dueNow();
  if (due) out.push({ icon: '🔁', title: `${due} carte${due > 1 ? 's' : ''} à revoir maintenant`, why: 'Revues au bon moment, elles tiennent jusqu’à l’épreuve.', run: () => { state.session = null; go('review'); } });
  const sure = confidentErrors(pr.attempts);
  if (sure.length) out.push({ icon: '⚠️', title: `${sure.length} erreur${sure.length > 1 ? 's' : ''} « j’étais sûr »`, why: 'Une erreur commise avec certitude se corrige le mieux si on y revient vite.', run: () => trainOn(sure.slice(-20), 'Mes erreurs « j’étais sûr »') });
  for (const w of P.tagStats(pr.attempts, state.byId).weak.slice(0, 3)) {
    out.push({ icon: '🎯', title: `Point faible : ${tagLabel(w.tag)} (${w.prof}, ${Math.round(w.acc * 100)} %)`, why: 'Votre sous-thème le moins réussi : une série ciblée de 10 questions.', run: () => trainOn(shuffle(weakIds(w), now).slice(0, 10), `Point faible : ${tagLabel(w.tag)}`) });
  }
  for (const [k, pre] of Object.entries(GAME_PREFIX)) {
    const n = Object.entries(pr.drills).filter(([id, m]) => id.startsWith(pre) && m.due <= now).length;
    if (n) out.push({ icon: GAMES[k].icon, title: `${GAMES[k].name} : ${n} à revoir`, why: 'Les items ratés reviennent : c’est le moment de les reprendre.', run: () => startGame(k) });
  }
  const weakQ = weakest(20);
  if (weakQ.length) out.push({ icon: '🔥', title: 'Mes questions les plus ratées', why: 'Les 20 questions où vous échouez le plus souvent.', run: () => trainOn(weakQ.map((q) => q.id), 'Mes questions les plus ratées') });
  const todo = state.clusters.groups.map((g, i) => ({ g, i, ok: g.filter((id) => pr.stats.q[id]?.ok > 0).length })).filter((x) => x.ok < 2 && x.g.some((id) => pr.stats.q[id]));
  if (todo.length) out.push({ icon: '🔁', title: 'Une notion récurrente, toutes ses variantes', why: 'Posée à plusieurs sessions : réussir chaque formulation prouve qu’on tient la règle.', run: () => trainOn(todo[0].g, 'Même notion, plusieurs sessions') });
  const unseen = state.bank.questions.filter((q) => !pr.cards[q.id]).length;
  if (unseen) out.push({ icon: '➕', title: '20 nouvelles questions de plus', why: `Prendre de l’avance : ${unseen} questions jamais vues.`, run: () => { state.bonusNew = true; state.session = null; go('review'); } });
  const last = pr.exams[pr.exams.length - 1];
  if (!last || now - last.t > 2 * DAY) out.push({ icon: '⏱', title: 'Un examen blanc', why: last ? 'Le dernier date de plus de deux jours.' : 'Pour situer votre niveau en conditions réelles.', run: () => go('exam') });
  out.push({ icon: '⚡', title: 'Vrai / Faux éclair', why: '20 propositions de QCM à juger, toujours utile.', run: () => startGame('vf') });
  out.push({ icon: '🏛', title: 'Réciter une liste du palais', why: 'Les listes à connaître par cœur, posées dans votre bureau.', run: () => startGame('palais') });
  return out;
}
function nextCard(inner = false) {
  const list = nextActions(); state.nextList = list;
  const i = state.nextIdx % list.length; const a = list[i];
  return `<div class="${inner ? 'next-inner' : 'card'} next"><div class="muted">Et maintenant ? (${i + 1}/${list.length})</div><strong>${a.icon} ${esc(a.title)}</strong><p class="muted" style="margin:4px 0 8px">${esc(a.why)}</p>
    <div class="btnrow"><button class="btn primary" data-next="${i}">C’est parti</button><button class="btn" data-next-other="1">↻ Autre idée</button></div></div>`;
}

// ---------- Estimation du niveau ----------
function currentEstimate() {
  const pr = state.progress;
  return estimate({ questions: state.bank.questions, stats: pr.stats, cards: pr.cards, attempts: pr.attempts, exams: pr.exams });
}
const fr = (x) => String(x).replace('.', ',');
function estimateLine() {
  if (!state.progress.attempts.length) return '<div class="estim muted">Niveau estimé : répondez à quelques questions pour l’obtenir.</div>';
  const e = currentEstimate();
  return `<button class="estim" data-go="stats"><span>Niveau estimé <strong>${fr(e.qcm.note)}</strong>/20 en QCM · <strong>${fr(e.qrc.note)}</strong>/20 en QRC</span><span class="muted">risque &lt; 6 : ${e.qcm.risk} % (QCM) · ${e.reliable ? 'fiable' : `indicatif, ${Math.round(e.coverage * 100)} % de la banque vue`} ›</span></button>`;
}
function estimateCard() {
  if (!state.progress.attempts.length) return '';
  const e = currentEstimate();
  const row = (m, l) => `<tr><td>${l}</td><td><strong>${fr(e[m].note)}</strong> <span class="muted">(${fr(e[m].low)} à ${fr(e[m].high)})</span></td><td>${e[m].ec} %</td><td>${e[m].cac} %</td><td>${e[m].pass} %</td><td>${e[m].risk} %</td></tr>`;
  const weaker = e.qcm.cac < e.qcm.ec ? 'CAC' : 'EC';
  return `<div class="card"><h2>Estimation à l’épreuve</h2><table><thead><tr><th>Format</th><th>Note /20</th><th>EC</th><th>CAC</th><th>≥ 10</th><th>&lt; 6</th></tr></thead><tbody>${row('qcm', 'QCM')}${row('qrc', 'QRC')}</tbody></table>
    <p class="muted">Pour chaque question de la banque, une chance de réussite d’après vos réponses (et, pour les questions jamais vues, votre réussite dans le même sous-thème) ; la note est celle d’un tirage de 10 EC + 10 CAC, la fourchette couvre deux tirages sur trois. Les examens blancs des 7 derniers jours comptent pour 40 %. ${e.reliable ? '' : `<strong>Estimation indicative</strong> tant que moins de 60 % de la banque est vue (${Math.round(e.coverage * 100)} %).`} Les QCM rédigés par IA peuvent flatter la note QCM.</p>
    <p class="muted">Le plus rentable : la partie <strong>${weaker}</strong> (${Math.min(e.qcm.ec, e.qcm.cac)} % contre ${Math.max(e.qcm.ec, e.qcm.cac)} %).</p></div>`;
}

function pct(a) { return a && a.max ? Math.round((a.points / a.max) * 100) + ' %' : '–'; }

const shortTitle = (file) => (state.fiches.find((f) => f.file === file)?.title || file).replace(/^(Schéma|Fiche)\s*\d+\s*[–-]\s*/, '');
// Calendrier jusqu'à l'épreuve : aujourd'hui (figé) puis la projection des jours suivants sur ce qui reste.
function calendar() {
  const pr = state.progress; const d = ensureDaily();
  const tomorrow = G.dayKey(Date.now() + DAY);
  const undone = P.STEPS.filter((st) => st.kind === 'schema' && !pr.plan.done[st.id] && !d.steps.includes(st.id)).map((st) => st.id);
  const later = d.n > 1 ? P.schedule(tomorrow, G.dayKey(examAt() || Date.now()), undone) : [];
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
      ? `${st.fiches.map((f) => `<button class="btn sm" data-open-fiche="${esc(f)}">📊 ${esc(shortTitle(f))}</button>`).join('')}${st.deep.length ? `<div class="muted" style="margin-top:6px">En détail : ${st.deep.map((f) => `<a href="#" data-open-fiche="${esc(f)}">${esc(shortTitle(f))}</a>`).join(' · ')}</div>` : ''}`
      : `<button class="btn sm" data-go="${st.action === 'weak' ? 'train' : st.action}">${st.action === 'exam' ? '⏱ Aller aux examens' : st.action === 'weak' ? '🎯 Mes questions les plus ratées' : '🔁 Réviser'}</button>`;
    return `<div class="card step ${done ? 'done' : ''} ${isCur ? 'cur' : ''}">
      <div class="row" style="justify-content:space-between"><span class="muted">${done ? 'faite' : stepDay[st.id] ? `prévue ${esc(dayLabel(stepDay[st.id]))}` : finalDay[st.id] && cal.find((x) => x.n === finalDay[st.id]) ? `prévue ${esc(dayLabel(cal.find((x) => x.n === finalDay[st.id])))}` : ''}${st.who ? ` · ${esc(st.who)}` : ''}</span>${done ? '<span class="badge">✔ terminée</span>' : isCur ? '<span class="badge warn">en cours</span>' : ''}</div>
      <strong>${i + 1}. ${esc(st.title)}</strong>
      ${prog ? `<div class="progress" style="margin:8px 0 4px"><div style="width:${prog.total ? Math.round((prog.seen / prog.total) * 100) : 0}%"></div></div><div class="muted">${prog.seen}/${prog.total} questions vues · ${prog.known} acquises</div>` : `<p class="muted" style="margin:6px 0">${esc(st.hint)}</p>`}
      <div class="btnrow" style="margin-top:8px;flex-wrap:wrap">${links}</div>
      <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-step-done="${st.id}">${done ? '↩ Rouvrir' : '✔ Marquer terminée'}</button>${!done && !isCur && st.kind === 'schema' ? `<button class="btn sm" data-step-focus="${st.id}">Commencer par celle-ci</button>` : ''}</div></div>`;
  }).join('');
  const calRows = cal.filter((day) => day.n >= 1).map((day) => {
    const what = [
      ...day.steps.map((id) => `📊 ${esc(P.stepById(id)?.title || id)}`),
      day.exam ? `⏱ Examen blanc ${day.exam.toUpperCase()}` : '',
      day.kind === 'faibles' ? '🎯 Points faibles et erreurs « j’étais sûr »' : '',
      day.kind === 'veille' ? '🔁 Cartes à revoir uniquement, listes du palais, dormir' : '',
      day.kind === 'consolidation' ? '🔁 Révisions, points faibles, jeux' : '',
      day.today && day.target ? `➕ ${day.target} nouvelles questions` : '',
    ].filter(Boolean);
    return `<li class="${day.today ? 'today' : ''}"><div class="row" style="justify-content:space-between"><strong>${esc(dayLabel(day))}</strong><span class="badge ${day.today ? 'warn' : ''}">${day.today ? 'aujourd’hui' : esc(KIND_LABEL[day.kind])}</span></div><div class="muted">${what.join('<br>') || '🔁 Révisions'}</div></li>`;
  }).join('');
  return `<div class="card"><h2>Mon plan jusqu’au 10 novembre</h2><p class="muted">Recalculé chaque matin d’après ce qui reste et vos résultats : une étape non finie est reportée, le nombre de nouvelles questions est recalé pour tout avoir vu à J-3, le point faible et le jeu du jour suivent vos erreurs. Les quatre derniers jours sont fixes.</p>
    <ol class="cal">${calRows}</ol><button class="btn primary" data-go="home">▶ Faire le plan du jour</button></div>
    <details class="card"><summary><strong>Les 15 étapes du parcours</strong> <span class="muted">(détail, schémas, marquer une étape)</span></summary><div style="margin-top:10px">${rows}</div></details>`;
};

views.review = () => {
  if (!state.session) {
    const { queue } = buildQueue(state.bank.questions, state.progress.cards, queueOpts());
    state.session = { queue: [...queue], done: 0, total: queue.length, ok: 0 };
    state.bonusNew = false;
  }
  const s = state.session;
  if (!s.queue.length) {
    const again = Object.values(state.progress.cards).filter((c) => c.due <= Date.now()).length;
    state.session = null;
    return `<div class="card center"><h2>Session terminée 🎉</h2><p>${s.done} cartes revues, ${s.ok} réussies du premier coup.</p>
      ${again ? `<p class="muted">${again} carte(s) « Encore » reviennent dans 10 min.</p>` : ''}</div>
      ${nextCard()}<button class="btn" data-go="home">Retour à l’accueil et plan du jour</button>`;
  }
  const q = s.queue[0];
  setTimeout(() => mountReviewCard(q), 0);
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="muted">${s.done + 1} / ${s.total}</span><span class="muted">${s.queue.length} restantes</span></div>
    <div class="progress"><div style="width:${(s.done / Math.max(1, s.total)) * 100}%"></div></div>
    <div class="card" id="qcard" style="margin-top:12px"></div><div id="grade"></div>`;
};
function mountReviewCard(q) {
  const box = $('#qcard'); if (!box) return;
  const mode = pickMode(q);
  const card = state.progress.cards[q.id];
  const set = state.progress.settings;
  const res = { conf: null, ratio: 0 };
  const showGrades = (suggest) => {
    $('#grade').innerHTML = `<div class="card"><div class="muted" style="margin-bottom:8px">Comment c’était ?${mode === 'qrc' ? ' (proposé d’après les éléments cochés)' : ''}</div><div class="btnrow4">${GRADES.map((g) => `<button class="btn ${g.g === suggest ? 'primary' : ''}" data-g="${g.g}">${g.label}<small>${intervalLabel(card, g.g, q.id)}</small></button>`).join('')}</div></div>`;
    $('#grade').querySelectorAll('button[data-g]').forEach((b) => { b.onclick = () => gradeCurrent(q, Number(b.dataset.g), mode, res); });
  };
  if (mode === 'qcm') {
    renderQcm(q, box, (ok, conf) => { res.conf = conf; answer(q.id, ok, mode, { conf }); showGrades(suggestGrade({ mode, ok, conf })); }, { hide: set.hideChoices, askConf: set.confidence });
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
    if (confidentError(g >= 2, res.conf)) toast('⚠️ Erreur commise avec certitude : relisez l’explication, elle revient dans la séance');
  }
  s.queue.shift(); s.done += 1; if (g >= 2 && wasNew) s.ok += 1;
  if (g === 0) { s.queue.push(q); s.total += 1; }
  if (wasNew) { const d = ensureDaily(); d.newDone = (d.newDone || 0) + 1; }
  state.progress.lastSession = Date.now();
  persist(); render();
}

views.train = () => {
  if (!state.train) state.train = { prof: 'all', theme: 'all', tag: 'all', mode: 'qcm', queue: null, idx: 0, ok: 0, n: 0 };
  const t = state.train;
  if (t.queue) {
    const q = t.queue[t.idx];
    if (!q) { const r = `<div class="card center"><h2>Série terminée</h2><p>${t.ok} / ${t.n} bonnes réponses</p><button class="btn primary" id="again">Nouvelle série</button></div>`; setTimeout(() => { $('#again').onclick = () => { t.queue = null; t.title = null; render(); }; }, 0); return r; }
    setTimeout(() => {
      const box = $('#qcard');
      const next = () => { $('#next').classList.remove('hidden'); };
      const set = state.progress.settings; let qconf = null;
      if (t.mode === 'qcm') renderQcm(q, box, (ok, conf) => { t.n++; if (ok) t.ok++; answer(q.id, ok, 'qcm', { conf }); next(); }, { hide: set.hideChoices, askConf: set.confidence });
      else {
        renderQrc(q, box, (conf) => { qconf = conf; $('#selfgrade').classList.remove('hidden'); }, (ratio) => {
          $('#sg-ok').classList.toggle('primary', ratio >= 1); $('#sg-ko').classList.toggle('primary', ratio < 1);
        }, { askConf: set.confidence });
      }
      $('#next').onclick = () => { t.idx++; render(); };
      $('#sg-ok').onclick = () => { t.n++; t.ok++; answer(q.id, true, 'qrc', { conf: qconf }); t.idx++; render(); };
      $('#sg-ko').onclick = () => { t.n++; answer(q.id, false, 'qrc', { conf: qconf }); if (confidentError(false, qconf)) toast('⚠️ Erreur commise avec certitude : relisez l’explication'); t.idx++; render(); };
      $('#stop').onclick = () => { t.queue = null; t.title = null; render(); };
    }, 0);
    return `${t.title ? `<div class="muted" style="margin-bottom:6px">🎯 ${esc(t.title)}</div>` : ''}<div class="row" style="justify-content:space-between"><span class="muted">${t.idx + 1} / ${t.queue.length} · ${t.ok}/${t.n} ✔</span><button class="btn sm" id="stop">Arrêter</button></div>
      <div class="card" id="qcard" style="margin-top:10px"></div>
      <div id="selfgrade" class="btnrow hidden"><button class="btn" id="sg-ko">✘ Je ne savais pas</button><button class="btn primary" id="sg-ok">✔ Je savais</button></div>
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
    <label class="field">Sujet précis<select id="f-tag"><option value="all">Tous</option>${Object.entries(tags).sort().map(([k, n]) => `<option value="${k}" ${t.tag === k ? 'selected' : ''}>${k.replace(/_/g, ' ')} (${n})</option>`).join('')}</select></label>
    <label class="field">Format<select id="f-mode"><option value="qcm" ${t.mode === 'qcm' ? 'selected' : ''}>QCM</option><option value="qrc" ${t.mode === 'qrc' ? 'selected' : ''}>QRC (réponse courte)</option></select></label>
    <p class="muted">${filtered.length} question(s) correspondent. Série de 20 max, sans effet sur la répétition espacée.</p>
    <button class="btn primary" id="start" ${filtered.length ? '' : 'disabled'}>Lancer la série</button>
    <div style="height:8px"></div><button class="btn" id="weak">🔥 Mes 20 questions les plus ratées</button>
    <div style="height:8px"></div><button class="btn" id="sure">⚠️ Mes erreurs « j’étais sûr » (${sure})</button>
    <p class="muted" style="margin-top:8px">Une erreur faite avec certitude se corrige mieux qu’une autre, à condition d’y revenir : c’est la liste à reprendre en priorité.</p></div>`;
};
const trainTabs = (cur) => `<div class="tabs">${[['train', '🎯 Séries'], ['jeux', '🎲 Jeux']].map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-go="${k}">${l}</button>`).join('')}</div>`;
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
    }, 0);
    const hist = state.progress.exams.slice(-8);
    return `<div class="card"><h2>Examen blanc</h2><p class="muted">20 questions tirées au sort (10 EC puis 10 CAC), 60 minutes, questions jamais passées en examen en priorité. QCM : 1 point par bonne réponse. QRC : barème du sujet d’origine, auto-correction à la fin, note ramenée sur 20.</p>
      <div class="btnrow"><button class="btn primary" id="ex-qcm">QCM</button><button class="btn primary" id="ex-qrc">QRC</button></div></div>
      ${hist.length ? `<div class="card"><h2>Historique</h2>${chart(hist)}<table><thead><tr><th>Date</th><th>Format</th><th>Note</th><th>EC</th><th>CAC</th></tr></thead><tbody>${hist.slice().reverse().map((e) => `<tr><td>${new Date(e.t).toLocaleDateString('fr-FR')}</td><td>${e.mode.toUpperCase()}</td><td><strong>${e.note}</strong></td><td>${pct(e.byProf.EC)}</td><td>${pct(e.byProf.CAC)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  }
  const ex = state.exam;
  const q = state.byId[ex.ids[ex.current]];
  setTimeout(() => mountExamQuestion(q), 0);
  return `<div class="row" style="justify-content:space-between"><span class="muted">Question ${ex.current + 1} / 20 · <span class="badge ${q.profession.toLowerCase()}">${q.profession}</span></span><span class="timer" id="timer">60:00</span></div>
    <div class="card" id="qcard" style="margin-top:10px"></div>
    <div class="btnrow"><button class="btn" id="prev" ${ex.current === 0 ? 'disabled' : ''}>← Précédente</button><button class="btn" id="next">${ex.current === 19 ? 'Terminer' : 'Suivante →'}</button></div>
    <div class="chips" style="margin-top:12px" id="grid">${ex.ids.map((id, i) => `<button class="chip ${i === ex.current ? 'on' : ''} ${ex.answers[id] !== undefined && ex.answers[id] !== '' ? '' : 'muted'}" data-i="${i}">${i + 1}${ex.answers[id] !== undefined && ex.answers[id] !== '' ? ' ✓' : ''}</button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn" id="finish">Rendre la copie</button></div>`;
};
// Examen en cours : sauvegardé à chaque réponse, repris après un rechargement.
function persistExam() {
  if (state.exam) store.saveExam(state.exam);
  else if (state.examResult?.pending) store.saveExam({ ...state.examResult.exam, pending: true });
}
function beginExam(mode) {
  state.exam = startExam(state.bank.questions, state.progress.examSeen, mode);
  persistExam();
  startExamTimer();
  render();
}
function resumeExam(saved) {
  if (!saved.ids.every((id) => state.byId[id])) { store.saveExam(null); return; }
  state.view = 'exam';
  if (saved.pending) { const { pending, ...ex } = saved; state.examResult = { pending: true, exam: ex }; return; }
  state.exam = saved;
  if (remainingMs(saved) <= 0) { toast('Temps écoulé pendant votre absence'); endExam(); return; }
  toast('Examen repris là où vous l’avez laissé');
  startExamTimer();
}
function startExamTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (!state.exam) return clearInterval(state.timer);
    const ms = remainingMs(state.exam); const el = $('#timer');
    if (el) { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; el.classList.toggle('low', ms < 5 * 60000); }
    if (ms <= 0) { toast('Temps écoulé'); endExam(); }
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
  $('#prev').onclick = () => { ex.current--; persistExam(); render(); };
  $('#next').onclick = () => { if (ex.current === 19) endExam(); else { ex.current++; persistExam(); render(); } };
  $('#finish').onclick = () => { if (confirm('Rendre la copie maintenant ?')) endExam(); };
  $('#grid').querySelectorAll('button[data-i]').forEach((b) => { b.onclick = () => { ex.current = Number(b.dataset.i); persistExam(); render(); }; });
}
function refreshGrid() {
  const ex = state.exam; const g = $('#grid'); if (!g) return;
  g.querySelectorAll('button[data-i]').forEach((b) => { const id = ex.ids[Number(b.dataset.i)]; const a = ex.answers[id]; const has = a !== undefined && a !== ''; b.textContent = `${Number(b.dataset.i) + 1}${has ? ' ✓' : ''}`; });
}
function endExam() {
  clearInterval(state.timer);
  const ex = state.exam;
  if (ex.mode === 'qcm') {
    const res = finishExam(ex, state.byId);
    recordExam(res);
  } else {
    state.examResult = { pending: true, exam: ex };
  }
  state.exam = null;
  if (state.examResult?.pending) persistExam(); else store.saveExam(null);
  render();
}
function recordExam(res) {
  const { rows, answers, ...summary } = res;
  state.progress.exams.push(summary);
  res.ids.forEach((id) => { state.progress.examSeen[id] = res.t; });
  rows.forEach((r) => answer(r.id, r.points >= r.max / 2, res.mode, { defer: true, t: res.t }));
  G.applyExam(state.progress.stats, summary);
  state.examResult = { res };
  store.saveExam(null);
  checkBadges();
}
// Corrigé d'une question QCM : les 4 propositions dans l'ordre vu à l'examen, bonne réponse et choix.
function qcmReview(q, chosen) {
  const order = shuffle([0, 1, 2, 3], q.id);
  return `<div class="choices review">${order.map((idx, i) => `<div class="choice ${idx === q.qcm.answer ? 'ok' : idx === chosen ? 'ko' : ''}"><span class="k">${LETTERS[i]}</span><span>${esc(q.qcm.choices[idx])}${idx === chosen ? ' <em>(votre réponse)</em>' : ''}${idx === q.qcm.answer ? ' ✔' : ''}</span></div>`).join('')}${chosen === undefined ? '<div class="muted">Question laissée en blanc.</div>' : ''}</div>`;
}
function renderExamResult() {
  const er = state.examResult;
  if (er.pending) {
    const ex = er.exam;
    setTimeout(() => {
      ex.ids.forEach((id) => {
        const q = state.byId[id]; const inp = $(`#g-${CSS.escape(id)}`); if (!inp) return;
        inp.oninput = () => { ex.grading[id] = Math.max(0, Math.min(q.points || 2, Number(inp.value) || 0)); persistExam(); };
        // Cocher les éléments attendus propose les points (modifiables ensuite).
        const boxes = [...document.querySelectorAll(`[data-exp-for="${CSS.escape(id)}"]`)];
        boxes.forEach((b) => { b.onchange = () => { inp.value = qrcPoints(q.points || 2, boxes.filter((x) => x.checked).length / boxes.length); inp.oninput(); }; });
      });
      $('#validate').onclick = () => { recordExam(finishExam(ex, state.byId)); render(); };
    }, 0);
    return `<div class="card"><h2>Auto-correction</h2><p class="muted">Cochez les éléments attendus présents dans votre réponse : les points sont proposés au prorata (barème du sujet), et restent modifiables.</p></div>
      ${ex.ids.map((id, i) => { const q = state.byId[id]; return `<div class="card">${qHeader(q)}<div class="q">${i + 1}. ${esc(q.qrc.question || q.question)}</div>
        <div class="muted"><strong>Votre réponse :</strong> ${esc(ex.answers[id] || '—')}</div>
        <div class="answer"><strong>Attendu :</strong><ul class="expected">${q.qrc.expected.map((e, k) => `<li><input type="checkbox" id="x-${esc(id)}-${k}" data-exp-for="${esc(id)}"><label for="x-${esc(id)}-${k}">${esc(e)}</label></li>`).join('')}</ul><div>${esc(q.qrc.model_answer)}</div></div>${qExplain(q)}
        <label class="field">Points obtenus (sur ${q.points || 2})<input type="number" id="g-${esc(id)}" min="0" max="${q.points || 2}" step="0.5" value="${ex.grading[id] || 0}"></label></div>`; }).join('')}
      <button class="btn primary" id="validate">Valider la note</button>`;
  }
  const r = er.res;
  setTimeout(() => { $('#close').onclick = () => { state.examResult = null; render(); }; }, 0);
  return `<div class="card center"><div class="muted">Examen blanc ${r.mode.toUpperCase()}</div><div class="big">${r.note}/20</div>
      <div class="muted">${r.note < 6 ? 'Éliminatoire (< 6)' : r.note < 10 ? 'Sous la moyenne' : r.note < 14 ? 'Validé' : 'Très bon'} · EC ${pct(r.byProf.EC)} · CAC ${pct(r.byProf.CAC)}</div></div>
    <div class="card"><h2>Par thème</h2><table><tbody>${Object.entries(r.byTheme).map(([k, v]) => `<tr><td>${THEMES[k]}</td><td>${v.points}/${v.max}</td></tr>`).join('')}</tbody></table></div>
    ${r.rows.map((row, i) => { const q = row.q; const ok = row.points >= row.max; return `<div class="card" style="border-left:4px solid ${ok ? 'var(--ok)' : row.points > 0 ? 'var(--warn)' : 'var(--ko)'}">${qHeader(q)}<div class="q" style="font-size:16px">${i + 1}. ${esc(r.mode === 'qcm' ? (q.qcm.question || q.question) : (q.qrc.question || q.question))}</div>
      ${r.mode === 'qcm'
    ? `${qcmReview(q, r.answers[q.id])}<details ${ok ? '' : 'open'}><summary>Explication</summary>${qExplain(q)}</details>`
    : `<div class="muted">Votre réponse : ${esc(r.answers[q.id] || '—')}</div><div class="answer">${esc(q.qrc.model_answer)}</div><details><summary>Explication</summary>${qExplain(q)}</details>`}</div>`; }).join('')}
    <button class="btn primary" id="close">Fermer</button>`;
}

views.fiches = () => {
  if (state.ficheOpen) {
    const meta = state.fiches.find((f) => f.file === state.ficheOpen) || {};
    const n = (meta.questions || []).length;
    const trainBtn = (id) => n ? `<button class="btn primary" id="${id}">🎯 S’entraîner sur ce schéma (${Math.min(20, n)} questions)</button>` : '';
    setTimeout(async () => {
      $('#back').onclick = () => { state.ficheOpen = null; render(); };
      document.querySelectorAll('#fiche-train, #fiche-train2').forEach((b) => { b.onclick = () => trainOn(shuffle(meta.questions, Date.now()).slice(0, 20), meta.title); });
      state.progress.plan.read = state.progress.plan.read || {}; state.progress.plan.read[state.ficheOpen] = Date.now(); persist();
      try { $('#fiche').innerHTML = renderMarkdown(await loadFiche(state.ficheOpen)); addToc($('#fiche')); } catch { $('#fiche').textContent = 'Fiche indisponible hors ligne (ouvrez-la une fois en ligne).'; }
    }, 0);
    return `<button class="btn sm" id="back">← Fiches</button>${n ? `<div style="margin-top:10px">${trainBtn('fiche-train')}</div>` : ''}<div class="card fiche" id="fiche" style="margin-top:10px">Chargement…</div>${trainBtn('fiche-train2')}`;
  }
  setTimeout(() => { document.querySelectorAll('[data-fiche]').forEach((b) => { b.onclick = () => openFiche(b.dataset.fiche); }); }, 0);
  if (!state.fiches.length) return `<div class="card"><h2>Fiches</h2><p class="muted">Aucune fiche disponible pour l’instant.</p></div>`;
  const read = state.progress.plan.read || {};
  const item = (f, label = '') => `<button class="btn" data-fiche="${esc(f.file)}"><span>${label ? `<span class="muted">${label}</span><br>` : ''}${esc(f.title)}</span><span>${read[f.file] ? '✔ ' : ''}${f.questions ? `<span class="muted">${f.questions.length} Q</span> ` : ''}›</span></button>`;
  // Schémas dans l'ordre du parcours (numéro d'étape), fiches de référence par profession.
  const steps = []; P.STEPS.forEach((st, i) => (st.fiches || []).forEach((file) => { if (!steps.some((x) => x.file === file)) steps.push({ file, n: i + 1 }); }));
  const visuels = state.fiches.filter((f) => f.kind === 'visuel').map((f) => ({ f, n: steps.find((x) => x.file === f.file)?.n || 99 })).sort((a, b) => a.n - b.n);
  const synth = state.fiches.filter((f) => f.kind !== 'visuel');
  const ec = synth.filter((f) => /-ec-/.test(f.file)); const cac = synth.filter((f) => /-cac-/.test(f.file));
  return `<div class="card plan-card"><strong>Par où commencer ?</strong><p class="muted" style="margin:4px 0 8px">Les schémas sont rangés dans l’ordre du parcours : lisez-les dans cet ordre. Les fiches de référence donnent le détail, à consulter au besoin. ✔ = déjà lu.</p><button class="btn primary" data-go="plan">🧭 Ouvrir le parcours</button></div>${visuels.length ? `<div class="card"><h2>Schémas, dans l’ordre du parcours</h2><p class="muted">Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision.</p><div class="list">${visuels.map(({ f, n }) => item(f, n < 99 ? `Étape ${n}` : '')).join('')}</div></div>` : ''}
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
// Une séance, une série, un jeu ou un examen est en cours : les liens s'ouvrent par-dessus, sans le quitter.
function inActivity() {
  const v = state.view;
  return (v === 'review' && !!state.session) || (v === 'train' && !!state.train?.queue) || (v === 'jeux' && !!state.game)
    || v === 'exam' || (v === 'carriere' && !!state.palais);
}
function sheet(html) {
  const el = $('#sheet');
  el.innerHTML = `<div class="sheet-head"><button class="btn sm" id="sheet-close">✕ Fermer et reprendre</button></div><div class="sheet-body">${html}</div>`;
  el.classList.add('show'); document.body.classList.add('noscroll');
  $('#sheet-close').onclick = closeSheet;
  el.scrollTop = 0;
}
function closeSheet() { $('#sheet')?.classList.remove('show'); document.body.classList.remove('noscroll'); }
// Fiche en surimpression : la lecture est notée pour le parcours.
async function ficheSheet(file) {
  const meta = state.fiches.find((f) => f.file === file) || {};
  const n = (meta.questions || []).length;
  sheet(`<div class="card fiche" id="sheet-fiche">Chargement…</div>${n && !inActivity() ? `<button class="btn primary" id="sheet-train">🎯 S’entraîner sur ce schéma (${Math.min(20, n)} questions)</button>` : ''}`);
  const tb = $('#sheet-train'); if (tb) tb.onclick = () => { closeSheet(); trainOn(shuffle(meta.questions, Date.now()).slice(0, 20), meta.title); };
  state.progress.plan.read = state.progress.plan.read || {};
  state.progress.plan.read[file] = Date.now(); persist();
  try { const box = $('#sheet-fiche'); box.innerHTML = renderMarkdown(await loadFiche(file)); addToc(box); } catch { $('#sheet-fiche').textContent = 'Fiche indisponible hors ligne (ouvrez-la une fois en ligne).'; }
}
// Même notion aux autres sessions : énoncés et réponses, en surimpression.
function variantsSheet(id) {
  const ids = siblings(id);
  sheet(`<div class="card"><h2>Même notion, autres sessions</h2><p class="muted">Le jury repose les mêmes règles sous d’autres formes : vérifiez que vous sauriez répondre à chaque variante.</p></div>
    ${ids.map((x) => { const q = state.byId[x]; return `<div class="card"><div class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n} · ${q.profession}</div><div class="q" style="font-size:16px">${esc(q.question)}</div><details><summary>Réponse</summary><div class="answer">${esc(q.qrc.model_answer)}</div><div class="ref">Réf. : ${esc(q.reference)}</div></details></div>`; }).join('')}
    <button class="btn primary" id="sheet-variants">🎯 S’entraîner sur ces ${ids.length + 1} questions</button>`);
  $('#sheet-variants').onclick = () => { closeSheet(); trainOn([id, ...ids], 'Même notion, plusieurs sessions', state.train?.mode || 'qcm'); };
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
  return `<div class="grid2"><div class="stat"><div class="n">${acc === null ? '–' : acc + ' %'}</div><div class="l">réussite (50 dernières)</div></div><div class="stat"><div class="n">${due7}</div><div class="l">à revoir sous 7 jours</div></div></div>
    <div class="card"><h2>Maîtrise par thème</h2><div class="muted" style="margin-bottom:8px"><i class="m3" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> acquise <i class="m2" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> en cours <i class="m1" style="display:inline-block;width:10px;height:10px;border-radius:2px"></i> apprentissage · gris = jamais vue</div>
      ${rows.map((r) => `<div class="mastery" style="margin:6px 0"><div><span class="badge ${r.p.toLowerCase()}">${r.p}</span> ${THEMES[r.t]}</div><div class="bar">${[3, 2, 1].map((k) => `<i class="m${k}" style="width:${(r.m[k] / Math.max(1, r.n)) * 100}%"></i>`).join('')}</div><div class="muted">${r.m[3]}/${r.n}</div></div>`).join('')}</div>
    ${estimateCard()}
    ${calibrationCard()}
    ${recurringCard()}
    ${weakTags.length ? `<div class="card"><h2>Points faibles</h2><table><tbody>${weakTags.map(([k, v]) => `<tr><td>${k.replace(/_/g, ' ')}</td><td>${Math.round((v.ok / v.n) * 100)} % (${v.n})</td></tr>`).join('')}</tbody></table></div>` : ''}
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
  setTimeout(() => {
    $('#s-new').onchange = (e) => { s.newPerDay = Math.max(0, Number(e.target.value) || 0); persist(); };
    $('#s-mode').onchange = (e) => { s.mode = e.target.value; persist(); };
    $('#s-low').onchange = (e) => { s.showLowConfidence = e.target.checked; persist(); };
    $('#s-conf').onchange = (e) => { s.confidence = e.target.checked; persist(); };
    $('#s-hide').onchange = (e) => { s.hideChoices = e.target.checked; persist(); };
    $('#s-focus').onchange = (e) => { s.focus = e.target.checked; persist(); };
    $('#s-timer').onchange = (e) => { s.gameTimer = e.target.value; persist(); };
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
    $('#update').onclick = async () => {
      try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch { /* ignore */ }
      location.reload();
    };
  }, 0);
  return `<div class="card"><h2>Réglages</h2>
    <label class="field">Nouvelles cartes par jour, au minimum (le plan en demande plus s’il le faut pour tout voir à J-3)<input type="number" id="s-new" min="0" max="100" value="${s.newPerDay}"></label>
    <label class="field">Format de révision<select id="s-mode"><option value="mixte" ${s.mode === 'mixte' ? 'selected' : ''}>Mixte (alterne QCM / QRC)</option><option value="qcm" ${s.mode === 'qcm' ? 'selected' : ''}>QCM uniquement</option><option value="qrc" ${s.mode === 'qrc' ? 'selected' : ''}>QRC uniquement</option></select></label>
    <label class="field"><input type="checkbox" id="s-low" ${s.showLowConfidence ? 'checked' : ''}> Afficher le badge « à vérifier » sur les réponses de confiance faible</label>
    <label class="field"><input type="checkbox" id="s-conf" ${s.confidence ? 'checked' : ''}> Indice de certitude avant la correction (sûr / hésitant / au hasard)</label>
    <label class="field"><input type="checkbox" id="s-hide" ${s.hideChoices ? 'checked' : ''}> QCM : réfléchir avant d’afficher les propositions</label>
    <label class="field"><input type="checkbox" id="s-focus" ${s.focus ? 'checked' : ''}> Mode concentration : badges annoncés sans animation, accueil épuré</label>
    <label class="field">Chrono des jeux (Vrai / Faux, Sprint chiffres)<select id="s-timer">${[['normal', 'Normal'], ['large', 'Large'], ['off', 'Sans chrono']].map(([k, l]) => `<option value="${k}" ${s.gameTimer === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field">Thème<select id="s-theme"><option value="">Automatique</option><option value="light" ${document.documentElement.dataset.theme === 'light' ? 'selected' : ''}>Clair</option><option value="dark" ${document.documentElement.dataset.theme === 'dark' ? 'selected' : ''}>Sombre</option></select></label></div>
    <div class="card"><h2>Données</h2><p class="muted">La progression est stockée uniquement sur ce téléphone. ${s.lastExportAt ? `Dernier export : ${new Date(s.lastExportAt).toLocaleString('fr-FR')}.` : '<strong>Aucun export pour l’instant.</strong>'}</p>
      <div class="btnrow"><button class="btn" id="export">⬇ Exporter</button><button class="btn" id="copy">📋 Copier</button></div>
      <div class="btnrow" style="margin-top:8px"><label class="btn" style="cursor:pointer">⬆ Importer un fichier<input type="file" id="import" accept="application/json,.json" class="hidden"></label></div>
      <details style="margin-top:10px"><summary>Importer un texte collé</summary><textarea id="paste" placeholder="Collez ici le texte de la sauvegarde"></textarea><button class="btn" id="paste-go" style="margin-top:8px">Importer ce texte</button></details>
      ${store.prevInfo() ? `<div style="height:8px"></div><button class="btn" id="undo">↩ Revenir à l’état précédent (${store.prevInfo().cards} cartes, ${new Date(store.prevInfo().t).toLocaleString('fr-FR')})</button>` : ''}
      <div style="height:8px"></div><button class="btn" id="reset">Effacer la progression</button>
      <p class="muted" style="margin-top:10px">Protection : ${state.persisted === true ? 'le navigateur a accepté de conserver ces données.' : state.persisted === false ? 'le navigateur peut effacer ces données s’il manque de place.' : 'état de protection inconnu.'} Sur iPhone, <strong>installez l’application sur l’écran d’accueil avant de commencer</strong> : Safari efface les données d’un site resté 7 jours sans visite, pas celles d’une application installée. Une copie automatique est faite toutes les 3 heures.</p></div>
    <div class="card"><h2>Application</h2><p class="muted">Version ${esc(state.bank.generatedAt || '')} · ${state.bank.count} questions. Fonctionne hors ligne une fois chargée.</p><button class="btn" id="update">Vérifier les mises à jour</button></div>`;
};

// ---------- Jeux ----------
// Items tirés des fiches (relues) et de la banque ; répétition par boîtes de Leitner (drill.js), échéances
// ramenées avant l'épreuve. Une erreur au Vrai / Faux remet la question d'origine dans la prochaine séance.
const GAMES = {
  duel: { icon: '⚔️', name: 'Duel EC / CAC', n: 15, why: 'Une règle, deux professions : à qui est-elle ? Opposer les règles voisines est le moyen le plus sûr de ne plus les confondre.' },
  vf: { icon: '⚡', name: 'Vrai / Faux éclair', n: 20, why: 'Chaque proposition d’un QCM, jugée seule et en temps limité : quatre rappels par question au lieu d’un.' },
  chiffres: { icon: '🔢', name: 'Sprint chiffres', why: 'Le plus de seuils, durées, majorités et peines en temps limité (réglable). Les chiffres sont exigés par le jury.' },
  arbre: { icon: '🌳', name: 'Arbres à trou', n: 10, why: 'Un morceau d’arbre de décision des schémas, avec une case vide : choisissez ce qui la remplit. On apprend la logique de la décision, pas une phrase.' },
  palais: { icon: '🏛', name: 'Palais de mémoire', why: 'Les listes à réciter, posées une à une sur les objets de votre bureau (méthode des lieux).' },
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
  const d = { duel: [], arbre: [], chiffres: [], vf: GM.vfItems(state.bank.questions) };
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
  g.phase = 'end'; persist();
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
          : `${it.path.map(inline).join(' › ')} → <strong>${inline(it.text)}</strong>`;
    return `<div class="card center"><div class="muted">${meta.icon} ${esc(meta.name)}</div><div class="big">${g.ok}/${g.n}</div>
      <div class="muted">${g.kind === 'chiffres' && g.limit ? `en ${g.limit} secondes` : `meilleure série : ${g.bestCombo} d’affilée`}${g.record ? ' · 🏆 nouveau record' : ''}</div></div>
      ${errs.length ? `<div class="card"><h2>À retenir</h2><ul class="errlist">${errs.map((it) => `<li>${line(it)}</li>`).join('')}</ul><p class="muted">Ces items reviennent dans 10 minutes, puis aux intervalles de la répétition.</p></div>` : '<div class="card center"><p>Sans faute. 👏</p></div>'}
      <div class="btnrow"><button class="btn" id="g-home">← Jeux</button><button class="btn primary" id="g-again">Rejouer</button></div>`;
  }
  const it = g.items[g.idx];
  const head = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="muted">${meta.icon} ${g.kind === 'chiffres' && g.endsAt ? `<span id="sprint" class="timer">${Math.ceil(Math.max(0, g.endsAt - (g.pausedAt || Date.now())) / 1000)} s</span>${g.pausedAt ? ' ⏸' : ''}` : `${g.idx + 1} / ${g.items.length}`} · ✔ ${g.ok}${g.combo >= 2 ? ` · <span class="combo">🔥×${g.combo}</span>` : ''}</span><button class="btn sm" id="g-stop">Arrêter</button></div>`;
  return head + ({ duel: duelCard, vf: vfCard, chiffres: chiffresCard, arbre: arbreCard })[g.kind](it, g);
}
function fbLine(g, okText, koText) {
  return `<div class="gfb ${g.last.ok ? 'ok' : 'ko'}">${g.last.ok ? `✔ ${okText}` : `✘ ${g.last.timeout ? 'Temps écoulé. ' : ''}${koText}`}</div>`;
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
    <button class="btn sm" data-open-fiche="${esc(it.file)}">📊 ${esc(it.title)}</button>${nextBtn()}</div>`;
}
function vfCard(it, g) {
  const q = state.byId[it.qid];
  if (g.phase === 'ask') {
    const secs = timer().vf ? timer().vf(it.stem.length + it.text.length) : null;
    g.secs = secs;
    return `<div class="card swipe" id="g-card"><div class="muted">${esc(q ? `DEC ${q.sessionLabel} · ${q.profession}` : '')}${secs ? ` · ${secs} s` : ''}</div><div class="stem">${esc(it.stem)}</div>
      <div class="prop">${esc(it.text)}</div>${secs ? `<div class="timebar"><div style="animation-duration:${secs}s"></div></div>` : ''}<p class="muted">Est-ce la bonne réponse à cette question ? Balayez ou touchez. Chrono réglable dans ⚙︎.</p></div>
      <div class="btnrow duel"><button class="btn ko" data-vf="0">✘ Faux</button><button class="btn okb" data-vf="1">✔ Vrai</button></div>`;
  }
  return `<div class="card">${fbLine(g, it.answer ? 'Exact : c’est la bonne réponse.' : 'Exact : ce n’est pas la bonne réponse.', it.answer ? 'C’était la bonne réponse.' : 'Ce n’était pas la bonne réponse.')}
    <div class="stem">${esc(it.stem)}</div>${it.answer ? '' : `<div class="muted">Proposition jugée : ${esc(it.text)}</div>`}<div class="answer"><strong>Bonne réponse :</strong> ${esc(it.good)}</div>
    ${q ? `<details><summary>Explication</summary>${qExplain(q)}</details>` : ''}${g.last.requeued ? '<p class="muted">🔁 Recoupement : la question d’origine revient dans votre prochaine séance.</p>' : ''}${nextBtn()}</div>`;
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
  const hole = done ? `<span class="node ok">${inline(it.text)}</span>` : '<span class="node hole">❓ case à compléter</span>';
  return `<div class="card"><div class="muted">🌳 ${esc(it.title)}</div>
    <p class="muted" style="margin:6px 0">Extrait d’un arbre de décision du schéma. Chaque niveau découle du précédent ; une case de la dernière branche est vide.</p>
    <ul class="tree">${it.path.map((p, i) => `<li style="--d:${i}"><span class="node ${i === depth - 1 ? 'parent' : ''}">${inline(p)}</span></li>`).join('')}
      ${kids.map((k) => `<li style="--d:${depth}">${k === null ? hole : `<span class="node">${inline(k)}</span>`}</li>`).join('')}</ul>
    <div class="muted" style="margin:8px 0">Qu’est-ce qui remplit la case vide ?</div>
    <div class="choices">${g.choices.map((c, i) => `<button class="choice ${done && c === it.text ? 'ok' : done && i === g.last.pick ? 'ko' : ''}" data-pick="${i}" ${done ? 'disabled' : ''}><span>${inline(c)}</span></button>`).join('')}</div>
    ${done ? `${fbLine(g, 'C’est bien cette case.', 'Ce n’est pas cette case : la bonne est surlignée.')}<p class="muted">Les autres propositions viennent d’autres branches du même arbre.</p><button class="btn sm" data-open-fiche="${esc(it.file)}">📊 Voir l’arbre entier</button>${nextBtn()}` : ''}</div>`;
}
function bindGame() {
  const g = state.game; if (!g) return;
  const stop = $('#g-stop'); if (stop) stop.onclick = () => { if (g.n) { endGame(); } else { stopGameTimer(); state.game = null; } render(); };
  const again = $('#g-again'); if (again) again.onclick = () => startGame(g.kind);
  const home = $('#g-home'); if (home) home.onclick = () => { state.game = null; render(); };
  const nx = $('#g-next'); if (nx) nx.onclick = nextGameItem;
  if (g.phase !== 'ask') return;
  const it = g.items[g.idx];
  const cardEl = $('#g-card');
  if (g.kind === 'duel') {
    document.querySelectorAll('[data-side]').forEach((b) => { b.onclick = () => gameAnswer(Number(b.dataset.side) === it.answer); });
    if (cardEl) onSwipe(cardEl, () => gameAnswer(it.answer === 0), () => gameAnswer(it.answer === 1));
  } else if (g.kind === 'vf') {
    document.querySelectorAll('[data-vf]').forEach((b) => { b.onclick = () => gameAnswer((b.dataset.vf === '1') === it.answer); });
    if (cardEl) onSwipe(cardEl, () => gameAnswer(!it.answer), () => gameAnswer(it.answer));
    if (g.secs) state.gameTimeout = setTimeout(() => gameAnswer(false, { timeout: true }), g.secs * 1000);
  } else {
    if (g.kind === 'chiffres') startSprintClock();
    const good = g.kind === 'chiffres' ? it.value : it.text;
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
    const grade = G.currentGrade(state.progress);
    return `<div class="card"><div class="scene-thumb">${sceneFor(grade.n)}</div><h2 style="margin-top:8px">Votre bureau, palais de mémoire</h2>
      <p class="muted">La méthode des lieux : on pose chaque élément d’une liste sur un objet d’un parcours familier, puis on refait le parcours pour réciter. Votre parcours : ${PAL.LOCI.slice(0, 6).map(([e, l]) => `${e} ${esc(l)}`).join(' › ')}…</p></div>
      ${PAL.LISTS.map((l) => { const s = m[`pal:${l.id}`]; return `<div class="card"><div class="row" style="justify-content:space-between"><strong>${esc(l.title)}</strong><span class="badge ${l.prof === 'EC' ? 'ec' : l.prof === 'CAC' ? 'cac' : ''}">${esc(l.prof)}</span></div>
        <div class="muted">${l.items.length} éléments · ${s ? (s.box >= 3 ? '✔ acquise' : s.due <= Date.now() ? 'à réciter' : `prochain récit dans ${Math.max(1, Math.round((s.due - Date.now()) / DAY))} j`) : 'jamais récitée'}</div>
        <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-pal="${l.id}" data-pal-mode="learn">Apprendre</button><button class="btn sm primary" data-pal="${l.id}" data-pal-mode="test">Réciter</button></div></div>`; }).join('')}`;
  }
  const l = PAL.LISTS.find((x) => x.id === p.id);
  if (p.mode === 'learn') {
    return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><h2>${esc(l.title)}</h2><p class="muted">${esc(l.hint)} ${l.ordered ? 'L’ordre compte.' : 'L’ordre est celui de la fiche ; le palais le fige pour vous.'} Initiales : <strong>${esc(PAL.initials(l))}</strong></p>
      <p class="muted">Pour chaque lieu, imaginez l’élément posé dessus : grossissez la scène, rendez-la absurde ou drôle, elle tiendra.</p>
      <ol class="loci">${l.items.map((x, i) => { const [e, lieu] = PAL.LOCI[i]; return `<li><span class="loc">${e}</span><div><div class="muted">${esc(lieu)}</div><strong>${esc(x)}</strong></div></li>`; }).join('')}</ol>
      <p class="muted">Fermez les yeux, refaites le parcours de la porte à ${esc(PAL.LOCI[l.items.length - 1][1])}, puis récitez.</p>
      <button class="btn primary" data-pal="${l.id}" data-pal-mode="test">Réciter maintenant</button> <button class="btn sm" data-open-fiche="${esc(l.source)}" style="margin-top:8px">📊 Source : la fiche</button></div>`;
  }
  const done = p.step >= l.items.length;
  const walk = l.items.slice(0, p.step).map((x, i) => `<li><span class="loc">${PAL.LOCI[i][0]}</span><div><div class="muted">${esc(PAL.LOCI[i][1])}</div><strong>${esc(x)}</strong></div></li>`).join('');
  if (done) {
    return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><h2>${p.errors ? `${p.errors} erreur${p.errors > 1 ? 's' : ''}` : 'Parcours sans faute 🏛'}</h2><ol class="loci">${walk}</ol>
      <p class="muted">${p.errors ? 'Repassez par « Apprendre », puis récitez à nouveau : la liste revient dans 10 minutes.' : 'La liste revient aux intervalles de la répétition, avant le 10 novembre.'}</p>
      <div class="btnrow"><button class="btn" data-pal="${l.id}" data-pal-mode="learn">Apprendre</button><button class="btn primary" data-pal="${l.id}" data-pal-mode="test">Réciter encore</button></div></div>`;
  }
  const [e, lieu] = PAL.LOCI[p.step];
  return `<button class="btn sm" id="pal-back">← Listes</button><div class="card" style="margin-top:10px"><div class="muted">${esc(l.title)} · ${p.step + 1}/${l.items.length} · erreurs : ${p.errors}</div>
    <ol class="loci">${walk}</ol><div class="q">${e} Sur ${esc(lieu)}, il y a…</div>
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
    ${b.ids && b.ids.length ? `<button class="btn primary" id="sheet-train">🎯 Réviser ces ${b.ids.length} questions</button>` : ''}</div>`;
  box.classList.add('show');
  box.onclick = (e) => { if (e.target.id === 'sheet-train') return; box.classList.remove('show'); };
  const tb = $('#sheet-train'); if (tb) tb.onclick = () => { box.classList.remove('show'); trainOn(b.ids, b.name); };
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
  const tabs = `<div class="tabs">${[['carriere', 'Ma carrière'], ['palais', '🏛 Palais'], ['collection', `Collection ${got}/${total}`], ['souvenirs', 'Souvenirs']].map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
  return tabs + (tab === 'collection' ? collectionView() : tab === 'souvenirs' ? souvenirsView() : tab === 'palais' ? palaisView() : careerView());
};
function careerView() {
  const pr = state.progress; const cur = G.currentGrade(pr);
  const has = (id) => !!pr.badges[id];
  return `<div class="card"><div class="scene-big">${sceneFor(cur.n)}</div>
    <div class="muted" style="margin-top:6px">Touchez un objet du bureau pour voir le badge qui l’a apporté.</div></div>
    <div class="timeline">${G.GRADES.map((g) => {
      const date = pr.grades[g.n];
      const conds = G.gradeConditions(g.n, has, pr.stats, state.gctx);
      return `<div class="tl-item ${date ? 'done' : 'locked'} ${g.n === cur.n ? 'current' : ''}">
        <div class="tl-dot">${g.n}</div>
        <div class="tl-body"><div class="tl-scene">${sceneFor(g.n, date ? {} : { badgeProps: [] })}</div>
          <strong>${esc(g.name)}</strong><div class="muted">${date ? `Atteint le ${new Date(date).toLocaleDateString('fr-FR')}` : 'À débloquer :'}</div>
          ${date ? '' : `<ul class="conds">${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✔' : '○'} ${esc(c.label)}</li>`).join('')}</ul>`}</div></div>`;
    }).join('')}</div>`;
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
  const chips = G.FAMILIES.map((f) => { const all = state.catalog.filter((b) => b.family === f.id); const n = all.filter((b) => pr.badges[b.id]).length; return `<button class="chip ${fam === f.id ? 'on' : ''}" data-fam="${f.id}">${f.icon} ${f.label} ${n}/${all.length}</button>`; }).join('');
  const list = state.catalog.filter((b) => b.family === fam);
  const main = list.filter((b) => b.sub !== 'tags');
  const tags = list.filter((b) => b.sub === 'tags');
  const sorted = (arr) => [...arr].sort((a, b) => (pr.badges[b.id] ? 1 : 0) - (pr.badges[a.id] ? 1 : 0) || G.RARITIES[a.rarity].rank - G.RARITIES[b.rarity].rank);
  return `<div class="chips scroll">${chips}</div>
    <div class="bgrid">${(fam === 'anecdotes' ? main : sorted(main)).map(badgeCard).join('')}</div>
    ${tags.length ? `<details class="card" style="margin-top:12px"><summary>Sous-thèmes ${tags.filter((b) => pr.badges[b.id]).length}/${tags.length}</summary><div class="bgrid" style="margin-top:10px">${sorted(tags).map(badgeCard).join('')}</div></details>` : ''}`;
}
function souvenirsView() {
  const pr = state.progress;
  const anecs = state.catalog.filter((b) => b.family === 'anecdotes');
  return PARTS.map(([k, label]) => {
    const items = anecs.filter((a) => a.part === k);
    const n = items.filter((a) => pr.badges[a.id]).length;
    return `<h3 class="section-title">${label} <span class="muted">${n}/${items.length}</span></h3><div class="memories">${items.map((a) => {
      const got = pr.badges[a.id]; const p = G.progressOf(a, pr.stats);
      const back = `<div class="memory-back"><div class="muted">Questions liées</div><ul>${a.ids.map((id) => { const q = state.byId[id]; const ok = pr.stats.q[id]?.ok > 0; return `<li>${ok ? '✔' : '○'} DEC ${esc(q?.sessionLabel || '')} Q${q?.n ?? ''} · ${esc((q?.question || '').slice(0, 70))}…</li>`; }).join('')}</ul>
        ${a.ids.length ? `<button class="btn sm" data-train-anec="${a.id}">🎯 Réviser ces questions</button>` : '<div class="muted">Se débloque avec les blocs EC et CAC maîtrisés.</div>'}</div>`;
      return `<div class="memory-card ${got ? 'got' : 'locked'}" data-flip><div class="memory-front">
        ${got ? `<div class="memory-date">${new Date(got).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>` : `<div class="memory-date">${p.cur}/${p.max} questions</div>`}
        <div class="memory-title">${got ? '📸' : '🔒'} ${esc(a.name)}</div>
        ${got ? `<p class="memory-text">« ${esc(a.desc)} »</p>` : '<p class="muted">Réussissez les questions liées pour révéler ce souvenir. Touchez la carte pour les voir.</p>'}
      </div>${back}</div>`;
    }).join('')}</div>`;
  }).join('');
}

const NAV = [
  ['home', '🏠', 'Accueil'], ['review', '🔁', 'Réviser'], ['train', '🎯', 'Entraîner'], ['exam', '⏱', 'Examen'], ['carriere', '🏆', 'Carrière'], ['fiches', '📚', 'Fiches'],
];
function render() {
  const main = $('#main');
  main.innerHTML = views[state.view]();
  document.querySelectorAll('nav.bottom button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view || ((state.view === 'stats' || state.view === 'plan') && b.dataset.view === 'home') || (state.view === 'jeux' && b.dataset.view === 'train')));
  updateStreakBadge();
  main.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
}
function go(v) {
  if (state.exam && v !== 'exam' && !confirm('Un examen est en cours. Le quitter ?')) return;
  if (v !== 'exam' && state.exam) { clearInterval(state.timer); state.exam = null; }
  // La séance, la série et le jeu en cours sont gardés : on les retrouve en revenant sur l'onglet.
  if (v !== 'jeux') stopGameTimer();
  closeSheet();
  state.view = v; window.scrollTo(0, 0); render();
}

function initGamify() {
  state.gctx = G.buildContext(state.bank);
  state.catalog = G.buildCatalog(state.gctx);
  state.badgeById = Object.fromEntries(state.catalog.map((b) => [b.id, b]));
  const pr = state.progress;
  pr.badges = pr.badges || {}; pr.grades = pr.grades || {};
  if (!pr.stats || pr.stats.v !== G.STATS_VERSION) {
    // Calcul rétroactif depuis l'historique existant, sans animation
    pr.stats = G.rebuildStats(pr, state.gctx);
    const f = G.evaluate(pr, state.catalog, state.gctx, pr.stats.lastT || Date.now());
    if (f.badges.length) setTimeout(() => toast(`${f.badges.length} badges récupérés depuis votre historique`), 800);
    persist();
  }
  G.applyOpen(pr.stats, Date.now());
  checkBadges();
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
    await Promise.all(['./', './index.html', './css/app.css', './js/app.js', './js/store.js', './js/bank.js', './js/srs.js', './js/plan.js', './js/exam.js', './js/gamify.js', './js/scene.js', './js/catalog-data.js', './js/cluster.js', './js/drill.js', './js/games.js', './js/palais.js', './js/estimate.js', './sw.js']
      .map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
  } catch { /* on relance quand même */ }
  location.reload();
  return true;
}

async function init() {
  if (store.STORE_VERSION !== STORE_EXPECTED && await recoverFromStaleCache()) return;
  try { const th = localStorage.getItem('dec1.theme'); if (th) document.documentElement.dataset.theme = th; } catch { /* ignore */ }
  const nav = $('nav.bottom');
  nav.innerHTML = NAV.map(([v, ico, label]) => `<button data-view="${v}"><span class="ico">${ico}</span>${label}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => { b.onclick = () => go(b.dataset.view); });
  $('#settingsBtn').onclick = () => go('settings');
  const sh = document.createElement('div'); sh.id = 'sheet'; sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); document.body.appendChild(sh);
  sh.addEventListener('click', (e) => { const b = e.target.closest('[data-open-fiche]'); if (b) ficheSheet(b.dataset.openFiche); });
  $('#main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-fiche]'); if (b) return ficheSheet(b.dataset.openFiche);
    const v = e.target.closest('[data-variants]'); if (v) return variantsSheet(v.dataset.variants);
    const nx = e.target.closest('[data-next]'); if (nx) return state.nextList[Number(nx.dataset.next)]?.run();
    const other = e.target.closest('[data-next-other]'); if (other) { state.nextIdx++; return render(); }
    const g = e.target.closest('[data-game]'); if (g) return startGame(g.dataset.game);
  });
  try {
    state.bank = await loadBank();
    state.bank.questions.forEach((q) => { state.byId[q.id] = q; });
    state.clusters = buildClusters(state.bank.questions);
    state.fiches = await loadFichesIndex();
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
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Mise à jour disponible : rechargez l’application'); });
      });
    } catch { /* hors ligne ou non supporté */ }
  }
}
init();
