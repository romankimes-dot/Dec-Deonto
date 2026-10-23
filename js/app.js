import { newCard, review, buildQueue, mastery, DAY } from './srs.js';
import * as store from './store.js';
import { loadBank, loadFichesIndex, loadFiche, renderMarkdown, THEMES } from './bank.js';
import { startExam, remainingMs, finishExam } from './exam.js';
import * as G from './gamify.js';
import { renderScene, PROP_NAMES } from './scene.js';

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
};

function persist() { if (!store.save(state.progress)) toast('Stockage local indisponible : progression non sauvegardée'); }

// ---------- Gamification ----------
// Toute réponse passe par ici : historique, statistiques, badges.
function answer(id, ok, mode, { defer = false, t = Date.now() } = {}) {
  const att = { id, ok: !!ok, mode, t };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) att.off = 1;
  store.pushAttempt(state.progress, att);
  G.applyAnswer(state.progress.stats, att, state.gctx);
  if (!defer) checkBadges();
  updateStreakBadge();
}
function checkBadges() {
  const fresh = G.evaluate(state.progress, state.catalog, state.gctx, Date.now());
  persist();
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
function trainOn(ids, title) {
  const qs = ids.map((id) => state.byId[id]).filter(Boolean);
  state.train = { prof: 'all', theme: 'all', tag: 'all', mode: 'qcm', queue: qs, idx: 0, ok: 0, n: 0, title };
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
function intervalLabel(card, g) {
  const c = review(card || newCard(), g, Date.now());
  if (g === 0) return '10 min';
  return c.interval === 1 ? '1 j' : `${c.interval} j`;
}

// ---------- Rendu commun d'une question ----------
function qHeader(q) {
  const conf = q.confidence === 'low' ? '<span class="badge warn">à vérifier</span>' : q.confidence === 'medium' ? '<span class="badge">confiance moyenne</span>' : '';
  return `<div class="row" style="justify-content:space-between">
    <div class="row" style="gap:6px"><span class="badge ${q.profession.toLowerCase()}">${q.profession}</span><span class="badge">${esc(THEMES[q.theme])}</span>${state.progress.settings.showLowConfidence ? conf : ''}</div>
    <span class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n}</span></div>`;
}
function qExplain(q) {
  return `<div class="explain"><strong>Explication.</strong> ${esc(q.explanation)}${q.update_note ? `<div class="muted" style="margin-top:6px">⚠︎ ${esc(q.update_note)}</div>` : ''}</div>
    <div class="ref">Réf. : ${esc(q.reference)}</div>${relatedFiches(q.id).map((f) => `<button class="btn sm related" data-open-fiche="${esc(f.file)}">📊 Schéma : ${esc(f.title.replace(/^Schéma\s*\d+\s*[–-]\s*/, ''))}</button>`).join('')}`;
}
function renderQcm(q, container, onAnswered) {
  const order = shuffle([0, 1, 2, 3], q.id);
  const qt = q.qcm.question || q.question;
  container.innerHTML = `${qHeader(q)}<div class="q">${esc(qt)}</div><div class="choices"></div><div class="after"></div>`;
  const box = $('.choices', container);
  order.forEach((idx, i) => {
    const b = document.createElement('button');
    b.className = 'choice'; b.innerHTML = `<span class="k">${LETTERS[i]}</span><span>${esc(q.qcm.choices[idx])}</span>`;
    b.onclick = () => {
      const ok = idx === q.qcm.answer;
      [...box.children].forEach((c, j) => {
        c.disabled = true;
        if (order[j] === q.qcm.answer) c.classList.add('ok');
        else if (j === i) c.classList.add('ko');
      });
      $('.after', container).innerHTML = `<div class="answer"><strong>${ok ? '✔ Bonne réponse' : '✘ Mauvaise réponse'}.</strong> ${esc(q.qrc.model_answer)}</div>${qExplain(q)}`;
      onAnswered(ok);
    };
    box.appendChild(b);
  });
}
function renderQrc(q, container, onRevealed) {
  const qt = q.qrc.question || q.question;
  container.innerHTML = `${qHeader(q)}<div class="q">${esc(qt)}</div>
    <textarea placeholder="Votre réponse (facultatif : vous pouvez répondre de tête)…"></textarea>
    <div style="margin-top:10px"><button class="btn primary reveal">Voir la réponse</button></div><div class="after"></div>`;
  $('.reveal', container).onclick = () => {
    $('.reveal', container).disabled = true;
    $('.after', container).innerHTML = `
      <div class="answer"><strong>Éléments attendus</strong> (cochez ce que vous aviez) :
        <ul class="expected">${q.qrc.expected.map((e, i) => `<li><input type="checkbox" id="exp${i}"><label for="exp${i}">${esc(e)}</label></li>`).join('')}</ul>
        <div style="margin-top:6px"><strong>Réponse type.</strong> ${esc(q.qrc.model_answer)}</div></div>${qExplain(q)}`;
    onRevealed();
  };
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
  const { due, fresh } = buildQueue(qs, pr.cards, { newLimit: pr.settings.newPerDay });
  const lastExam = pr.exams[pr.exams.length - 1];
  const d = daysToExam();
  const grade = G.currentGrade(pr);
  const next = G.GRADES[grade.n];
  const has = (id) => !!pr.badges[id];
  const conds = next ? G.gradeConditions(next.n, has, pr.stats, state.gctx) : [];
  const nb = G.nextBadges(state.catalog, pr.stats, pr.badges, 3);
  const unlocked = Object.keys(pr.badges).length;
  return `
  <div class="card hero">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="muted">Épreuve n°1 · mardi 10 novembre · 10 h 30</div><div class="big">${d > 0 ? `J-${d}` : d === 0 ? 'Jour J' : 'Passée'}</div></div>
      <div class="muted hero-meta"><span>${Object.keys(pr.stats.q).length}/${qs.length} vues</span><span>${unlocked} badges</span></div>
    </div>
    <button class="btn primary big-btn" data-go="review">▶ Session du jour <span class="pill">${due.length + fresh.length}</span></button>
    <div class="btnrow" style="margin-top:10px"><button class="btn" data-go="exam">⏱ Examen blanc</button><button class="btn" data-go="train">🎯 Ciblé</button></div>
  </div>
  <div class="card career-card" data-go="carriere">
    <div class="scene-thumb">${sceneFor(grade.n)}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><div><div class="muted">Grade ${grade.n}/8</div><strong>${esc(grade.name)}</strong></div><span class="muted">Ma carrière ›</span></div>
    ${next ? `<div class="muted" style="margin-top:6px">Prochain grade : <strong>${esc(next.name)}</strong></div><ul class="conds">${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✔' : '○'} ${esc(c.label)}</li>`).join('')}</ul>` : '<div class="muted">Carrière complète. Bravo.</div>'}
  </div>
  ${nb.length ? `<div class="card"><h2>Presque débloqués</h2>${nb.map(({ b, p }) => `<div class="nb">${badgeIcon(b)}<div style="flex:1"><div><strong>${esc(b.name)}</strong></div><div class="progress"><div style="width:${Math.round((p.cur / p.max) * 100)}%"></div></div><div class="muted">${p.cur}/${p.max} · ${esc(b.cond)}</div></div></div>`).join('')}</div>` : ''}
  ${lastExam ? `<div class="card"><h2>Dernier examen blanc</h2><div class="row"><span class="big" style="font-size:28px">${lastExam.note}/20</span><span class="muted">${lastExam.mode.toUpperCase()} · ${new Date(lastExam.t).toLocaleDateString('fr-FR')}</span></div>
    <div class="muted">EC ${pct(lastExam.byProf.EC)} · CAC ${pct(lastExam.byProf.CAC)}</div></div>` : ''}
  <div class="card"><details><summary>Conseils du jury</summary><ul class="muted" style="padding-left:18px;margin:8px 0 0">
    <li>La partie CAC est systématiquement moins bien réussie : travaillez-la en priorité.</li>
    <li>Les candidats confondent les règles EC et CAC : pour chaque règle, demandez-vous « et pour l’autre profession ? ».</li>
    <li>Réponses courtes : un mot, un chiffre, une liste. 3 minutes par question.</li>
    <li>Références d’articles et quantum des sanctions ne sont pas exigés ; les chiffres (seuils, durées, délais) le sont.</li></ul></details>
    <div style="margin-top:10px"><button class="btn" data-go="stats">📈 Statistiques détaillées</button></div></div>`;
};
function pct(a) { return a && a.max ? Math.round((a.points / a.max) * 100) + ' %' : '–'; }

views.review = () => {
  if (!state.session) {
    const { queue } = buildQueue(state.bank.questions, state.progress.cards, { newLimit: state.progress.settings.newPerDay });
    state.session = { queue: [...queue], done: 0, total: queue.length, ok: 0 };
  }
  const s = state.session;
  if (!s.queue.length) {
    const again = Object.values(state.progress.cards).filter((c) => c.due <= Date.now()).length;
    state.session = null;
    return `<div class="card center"><h2>Session terminée 🎉</h2><p>${s.done} cartes revues, ${s.ok} réussies du premier coup.</p>
      ${again ? `<p class="muted">${again} carte(s) « Encore » reviennent dans 10 min.</p>` : ''}
      <button class="btn primary" data-go="home">Retour à l’accueil</button></div>`;
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
  const showGrades = (suggest) => {
    $('#grade').innerHTML = `<div class="card"><div class="muted" style="margin-bottom:8px">Comment c’était ?</div><div class="btnrow4">${GRADES.map((g) => `<button class="btn ${g.g === suggest ? 'primary' : ''}" data-g="${g.g}">${g.label}<small>${intervalLabel(card, g.g)}</small></button>`).join('')}</div></div>`;
    $('#grade').querySelectorAll('button[data-g]').forEach((b) => { b.onclick = () => gradeCurrent(q, Number(b.dataset.g), mode); });
  };
  if (mode === 'qcm') renderQcm(q, box, (ok) => { answer(q.id, ok, mode); showGrades(ok ? 2 : 0); });
  else renderQrc(q, box, () => showGrades(2));
}
function gradeCurrent(q, g, mode) {
  const s = state.session;
  const prev = state.progress.cards[q.id] || newCard();
  const wasNew = !state.progress.cards[q.id];
  state.progress.cards[q.id] = review(prev, g, Date.now());
  if (mode === 'qrc') answer(q.id, g >= 2, mode);
  s.queue.shift(); s.done += 1; if (g >= 2 && wasNew) s.ok += 1;
  if (g === 0) { s.queue.push(q); s.total += 1; }
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
      if (t.mode === 'qcm') renderQcm(q, box, (ok) => { t.n++; if (ok) t.ok++; answer(q.id, ok, 'qcm'); next(); });
      else renderQrc(q, box, () => { $('#selfgrade').classList.remove('hidden'); });
      $('#next').onclick = () => { t.idx++; render(); };
      $('#sg-ok').onclick = () => { t.n++; t.ok++; answer(q.id, true, 'qrc'); t.idx++; render(); };
      $('#sg-ko').onclick = () => { t.n++; answer(q.id, false, 'qrc'); t.idx++; render(); };
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
  }, 0);
  return `<div class="card"><h2>Entraînement ciblé</h2>
    <label class="field">Profession<select id="f-prof"><option value="all">EC + CAC</option><option value="EC" ${t.prof === 'EC' ? 'selected' : ''}>Expert-comptable</option><option value="CAC" ${t.prof === 'CAC' ? 'selected' : ''}>Commissaire aux comptes</option></select></label>
    <label class="field">Thème<select id="f-theme"><option value="all">Tous</option>${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${t.theme === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="field">Sujet précis<select id="f-tag"><option value="all">Tous</option>${Object.entries(tags).sort().map(([k, n]) => `<option value="${k}" ${t.tag === k ? 'selected' : ''}>${k.replace(/_/g, ' ')} (${n})</option>`).join('')}</select></label>
    <label class="field">Format<select id="f-mode"><option value="qcm" ${t.mode === 'qcm' ? 'selected' : ''}>QCM</option><option value="qrc" ${t.mode === 'qrc' ? 'selected' : ''}>QRC (réponse courte)</option></select></label>
    <p class="muted">${filtered.length} question(s) correspondent. Série de 20 max, sans effet sur la répétition espacée.</p>
    <button class="btn primary" id="start" ${filtered.length ? '' : 'disabled'}>Lancer la série</button>
    <div style="height:8px"></div><button class="btn" id="weak">🔥 Mes 20 questions les plus ratées</button></div>`;
};
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
function beginExam(mode) {
  state.exam = startExam(state.bank.questions, state.progress.examSeen, mode);
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (!state.exam) return clearInterval(state.timer);
    const ms = remainingMs(state.exam); const el = $('#timer');
    if (el) { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; el.classList.toggle('low', ms < 5 * 60000); }
    if (ms <= 0) { toast('Temps écoulé'); endExam(); }
  }, 500);
  render();
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
      b.onclick = () => { ex.answers[q.id] = idx; [...c.children].forEach((x, j) => x.classList.toggle('sel', j === i)); refreshGrid(); };
      c.appendChild(b);
    });
  } else {
    box.innerHTML = `<div class="muted">DEC ${esc(q.sessionLabel)} · Q${q.n} · ${q.points} pt${q.points > 1 ? 's' : ''}</div><div class="q">${esc(q.qrc.question || q.question)}</div><textarea id="ans" placeholder="Réponse courte…">${esc(ex.answers[q.id] || '')}</textarea>`;
    $('#ans', box).oninput = (e) => { ex.answers[q.id] = e.target.value; refreshGrid(); };
  }
  $('#prev').onclick = () => { ex.current--; render(); };
  $('#next').onclick = () => { if (ex.current === 19) endExam(); else { ex.current++; render(); } };
  $('#finish').onclick = () => { if (confirm('Rendre la copie maintenant ?')) endExam(); };
  $('#grid').querySelectorAll('button[data-i]').forEach((b) => { b.onclick = () => { ex.current = Number(b.dataset.i); render(); }; });
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
  render();
}
function recordExam(res) {
  const { rows, answers, ...summary } = res;
  state.progress.exams.push(summary);
  res.ids.forEach((id) => { state.progress.examSeen[id] = res.t; });
  rows.forEach((r) => answer(r.id, r.points >= r.max / 2, res.mode, { defer: true, t: res.t }));
  G.applyExam(state.progress.stats, summary);
  state.examResult = { res };
  checkBadges();
}
function renderExamResult() {
  const er = state.examResult;
  if (er.pending) {
    const ex = er.exam;
    setTimeout(() => {
      ex.ids.forEach((id) => { const q = state.byId[id]; const inp = $(`#g-${CSS.escape(id)}`); if (inp) inp.oninput = () => { ex.grading[id] = Math.max(0, Math.min(q.points || 2, Number(inp.value) || 0)); }; });
      $('#validate').onclick = () => { recordExam(finishExam(ex, state.byId)); render(); };
    }, 0);
    return `<div class="card"><h2>Auto-correction</h2><p class="muted">Comparez votre réponse aux éléments attendus et attribuez-vous les points (barème du sujet).</p></div>
      ${ex.ids.map((id, i) => { const q = state.byId[id]; return `<div class="card">${qHeader(q)}<div class="q">${i + 1}. ${esc(q.qrc.question || q.question)}</div>
        <div class="muted"><strong>Votre réponse :</strong> ${esc(ex.answers[id] || '—')}</div>
        <div class="answer"><strong>Attendu :</strong><ul class="expected">${q.qrc.expected.map((e) => `<li>• ${esc(e)}</li>`).join('')}</ul><div>${esc(q.qrc.model_answer)}</div></div>${qExplain(q)}
        <label class="field">Points obtenus (sur ${q.points || 2})<input type="number" id="g-${esc(id)}" min="0" max="${q.points || 2}" step="0.5" value="0"></label></div>`; }).join('')}
      <button class="btn primary" id="validate">Valider la note</button>`;
  }
  const r = er.res;
  setTimeout(() => { $('#close').onclick = () => { state.examResult = null; render(); }; }, 0);
  return `<div class="card center"><div class="muted">Examen blanc ${r.mode.toUpperCase()}</div><div class="big">${r.note}/20</div>
      <div class="muted">${r.note < 6 ? 'Éliminatoire (< 6)' : r.note < 10 ? 'Sous la moyenne' : r.note < 14 ? 'Validé' : 'Très bon'} · EC ${pct(r.byProf.EC)} · CAC ${pct(r.byProf.CAC)}</div></div>
    <div class="card"><h2>Par thème</h2><table><tbody>${Object.entries(r.byTheme).map(([k, v]) => `<tr><td>${THEMES[k]}</td><td>${v.points}/${v.max}</td></tr>`).join('')}</tbody></table></div>
    ${r.rows.map((row, i) => { const q = row.q; const ok = row.points >= row.max; return `<div class="card" style="border-left:4px solid ${ok ? 'var(--ok)' : row.points > 0 ? 'var(--warn)' : 'var(--ko)'}">${qHeader(q)}<div class="q" style="font-size:16px">${i + 1}. ${esc(r.mode === 'qcm' ? (q.qcm.question || q.question) : (q.qrc.question || q.question))}</div>
      <div class="muted">Votre réponse : ${esc(r.mode === 'qcm' ? (q.qcm.choices[r.answers[q.id]] ?? '—') : (r.answers[q.id] || '—'))}</div>
      <div class="answer">${esc(q.qrc.model_answer)}</div><details><summary>Explication</summary>${qExplain(q)}</details></div>`; }).join('')}
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
      try { $('#fiche').innerHTML = renderMarkdown(await loadFiche(state.ficheOpen)); } catch { $('#fiche').textContent = 'Fiche indisponible hors ligne (ouvrez-la une fois en ligne).'; }
    }, 0);
    return `<button class="btn sm" id="back">← Fiches</button>${n ? `<div style="margin-top:10px">${trainBtn('fiche-train')}</div>` : ''}<div class="card fiche" id="fiche" style="margin-top:10px">Chargement…</div>${trainBtn('fiche-train2')}`;
  }
  setTimeout(() => { document.querySelectorAll('[data-fiche]').forEach((b) => { b.onclick = () => openFiche(b.dataset.fiche); }); }, 0);
  if (!state.fiches.length) return `<div class="card"><h2>Fiches</h2><p class="muted">Aucune fiche disponible pour l’instant.</p></div>`;
  const item = (f) => `<button class="btn" data-fiche="${esc(f.file)}"><span>${esc(f.title)}</span><span>${f.questions ? `<span class="muted">${f.questions.length} Q</span> ` : ''}›</span></button>`;
  const visuels = state.fiches.filter((f) => f.kind === 'visuel');
  const synth = state.fiches.filter((f) => f.kind !== 'visuel');
  return `${visuels.length ? `<div class="card"><h2>Schémas et tableaux</h2><p class="muted">Une page pour plusieurs questions : comparatifs EC / CAC, échelles, frises, arbres de décision. Chaque schéma lance une série sur les questions qu’il résume.</p><div class="list">${visuels.map(item).join('')}</div></div>` : ''}
    <div class="card"><h2>Fiches de synthèse</h2><p class="muted">Chiffres, instances, listes : ce qu’il faut savoir restituer de mémoire.</p><div class="list">${synth.map(item).join('')}</div></div>`;
};
function openFiche(file) { state.ficheOpen = file; go('fiches'); }
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
    ${weakTags.length ? `<div class="card"><h2>Points faibles</h2><table><tbody>${weakTags.map(([k, v]) => `<tr><td>${k.replace(/_/g, ' ')}</td><td>${Math.round((v.ok / v.n) * 100)} % (${v.n})</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${state.progress.exams.length ? `<div class="card"><h2>Examens blancs</h2>${chart(state.progress.exams.slice(-12))}</div>` : ''}
    <div class="card"><h2>Banque</h2><div class="muted">${qs.length} questions · ${state.bank.sessions.length} sessions (${state.bank.sessions[0].session} → ${state.bank.sessions[state.bank.sessions.length - 1].session})<br>Confiance : ${['high', 'medium', 'low'].map((c) => `${c} ${qs.filter((q) => q.confidence === c).length}`).join(' · ')}</div></div>`;
};
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
    $('#s-theme').onchange = (e) => { document.documentElement.dataset.theme = e.target.value; try { localStorage.setItem('dec1.theme', e.target.value); } catch { /* ignore */ } };
    $('#export').onclick = () => {
      const blob = new Blob([store.exportJSON(state.progress)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dec1-progression-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    };
    $('#import').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { state.progress = store.importJSON(await f.text()); if (!state.progress.stats) state.progress.badges = {}; initGamify(); persist(); toast('Progression importée'); render(); } catch (err) { toast('Import impossible : ' + err.message); }
    };
    $('#reset').onclick = () => { if (confirm('Effacer toute la progression ?')) { state.progress = store.reset(); initGamify(); persist(); toast('Progression effacée'); render(); } };
    $('#update').onclick = async () => {
      try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch { /* ignore */ }
      location.reload();
    };
  }, 0);
  return `<div class="card"><h2>Réglages</h2>
    <label class="field">Nouvelles cartes par session<input type="number" id="s-new" min="0" max="100" value="${s.newPerDay}"></label>
    <label class="field">Format de révision<select id="s-mode"><option value="mixte" ${s.mode === 'mixte' ? 'selected' : ''}>Mixte (alterne QCM / QRC)</option><option value="qcm" ${s.mode === 'qcm' ? 'selected' : ''}>QCM uniquement</option><option value="qrc" ${s.mode === 'qrc' ? 'selected' : ''}>QRC uniquement</option></select></label>
    <label class="field"><input type="checkbox" id="s-low" ${s.showLowConfidence ? 'checked' : ''}> Afficher le badge « à vérifier » sur les réponses de confiance faible</label>
    <label class="field">Thème<select id="s-theme"><option value="">Automatique</option><option value="light" ${document.documentElement.dataset.theme === 'light' ? 'selected' : ''}>Clair</option><option value="dark" ${document.documentElement.dataset.theme === 'dark' ? 'selected' : ''}>Sombre</option></select></label></div>
    <div class="card"><h2>Données</h2><p class="muted">La progression est stockée uniquement sur cet appareil. Exportez-la régulièrement.</p>
      <div class="btnrow"><button class="btn" id="export">⬇ Exporter</button><label class="btn" style="cursor:pointer">⬆ Importer<input type="file" id="import" accept="application/json" class="hidden"></label></div>
      <div style="height:8px"></div><button class="btn" id="reset">Effacer la progression</button></div>
    <div class="card"><h2>Application</h2><p class="muted">Version ${esc(state.bank.generatedAt || '')} · ${state.bank.count} questions. Fonctionne hors ligne une fois chargée.</p><button class="btn" id="update">Vérifier les mises à jour</button></div>`;
};

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
  const tabs = `<div class="tabs">${[['carriere', 'Ma carrière'], ['collection', `Collection ${got}/${total}`], ['souvenirs', 'Souvenirs']].map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>`;
  return tabs + (tab === 'collection' ? collectionView() : tab === 'souvenirs' ? souvenirsView() : careerView());
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
  document.querySelectorAll('nav.bottom button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view || (state.view === 'stats' && b.dataset.view === 'home')));
  updateStreakBadge();
  main.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
}
function go(v) {
  if (state.exam && v !== 'exam' && !confirm('Un examen est en cours. Le quitter ?')) return;
  if (v !== 'exam' && state.exam) { clearInterval(state.timer); state.exam = null; }
  if (v !== 'review') state.session = null;
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

async function init() {
  try { const th = localStorage.getItem('dec1.theme'); if (th) document.documentElement.dataset.theme = th; } catch { /* ignore */ }
  const nav = $('nav.bottom');
  nav.innerHTML = NAV.map(([v, ico, label]) => `<button data-view="${v}"><span class="ico">${ico}</span>${label}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => { b.onclick = () => go(b.dataset.view); });
  $('#settingsBtn').onclick = () => go('settings');
  $('#main').addEventListener('click', (e) => { const b = e.target.closest('[data-open-fiche]'); if (b) openFiche(b.dataset.openFiche); });
  try {
    state.bank = await loadBank();
    state.bank.questions.forEach((q) => { state.byId[q.id] = q; });
    state.fiches = await loadFichesIndex();
    initGamify();
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
