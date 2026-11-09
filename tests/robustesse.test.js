import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startExam, finishExam, remainingMs, EXAM_DURATION_MS } from '../js/exam.js';
import { buildContext, emptyStats, applyAnswer, rebuildStats, mergeStats } from '../js/gamify.js';

const bank = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));
const ctx = buildContext(bank);
const T0 = new Date(2026, 9, 1, 12).getTime();
const MIN = 60000;

// localStorage de remplacement ; quota : toute écriture échoue comme un stockage plein
function mockStorage({ quota = false } = {}) {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
  return m;
}
const store = await import('../js/store.js');

// ---------- Examen ----------
test('examen : 10 EC + 10 CAC, durée 60 min', () => {
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  assert.equal(ex.ids.length, 20);
  assert.equal(ex.ids.filter((id) => byId[id].profession === 'EC').length, 10);
  assert.equal(ex.endsAt - ex.startedAt, EXAM_DURATION_MS);
  assert.equal(remainingMs(ex, T0 + 10 * MIN), 50 * MIN);
});

test('finishExam QCM : note, détail par profession, durée réelle', () => {
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  ex.ids.forEach((id, i) => { if (i % 2 === 0) ex.answers[id] = byId[id].qcm.answer; });
  const r = finishExam(ex, byId, T0 + 25 * MIN);
  assert.equal(r.note, 10);
  assert.equal(r.durationMs, 25 * MIN);
  assert.equal(r.byProf.EC.n + r.byProf.CAC.n, 20);
  assert.equal(r.byProf.EC.points + r.byProf.CAC.points, 10);
  assert.equal(r.rows.length, 20);
});

test('finishExam QRC : points auto-attribués plafonnés au barème', () => {
  const ex = startExam(bank.questions, {}, 'qrc', T0);
  for (const id of ex.ids) ex.grading[id] = 99;
  const r = finishExam(ex, byId, T0 + MIN);
  assert.equal(r.note, 20);
  assert.ok(r.rows.every((x) => x.points === x.max));
});

test('reprise après expiration : temps écoulé, durée plafonnée à 60 min, réponses gardées', () => {
  mockStorage();
  const ex = startExam(bank.questions, {}, 'qcm', T0);
  ex.answers[ex.ids[0]] = byId[ex.ids[0]].qcm.answer; ex.current = 5;
  store.saveExam(ex);
  const back = store.loadExam();
  const later = T0 + 3 * 60 * MIN; // rouvert 3 h plus tard
  assert.equal(remainingMs(back, later), 0);
  assert.equal(back.current, 5);
  const r = finishExam(back, byId, later);
  assert.equal(r.durationMs, EXAM_DURATION_MS);
  assert.equal(r.note, 1);
  store.saveExam(null);
  assert.equal(store.loadExam(), null);
});

// ---------- Stockage plein ----------
test('save : quota plein, échec signalé sans exception ni perte de l’état sauvegardé', () => {
  const m = mockStorage();
  const s = store.defaultState(); s.cards.a = { due: 1 };
  assert.equal(store.save(s), true);
  const before = m.get('dec1.progress.v1');
  globalThis.localStorage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  s.cards.b = { due: 2 };
  assert.equal(store.save(s), false);
  assert.equal(m.get('dec1.progress.v1'), before);
  assert.deepEqual(Object.keys(store.load().cards), ['a']);
  mockStorage({ quota: true });
  assert.equal(store.save(s), false);
  assert.doesNotThrow(() => store.saveExam({ mode: 'qcm' }));
});

// ---------- Statistiques : historique tronqué ----------
test('rebuildStats : l’historique tronqué ne fait pas baisser compteurs ni records', () => {
  const ids = ctx.all.slice(0, 50);
  const attempts = [];
  for (let i = 0; i < 600; i++) attempts.push({ id: ids[i % 50], ok: i < 150 || i % 50 !== 49, t: T0 + i * MIN });
  const full = emptyStats();
  for (const a of attempts) applyAnswer(full, a, ctx);
  // Changement de version des stats : recalcul sur les 400 dernières réponses seulement
  const rebuilt = rebuildStats({ attempts: attempts.slice(-400), exams: [], stats: full }, ctx);
  const bare = rebuildStats({ attempts: attempts.slice(-400), exams: [] }, ctx);
  assert.ok(bare.streak.best < full.streak.best, 'le recalcul seul perdrait le record');
  assert.equal(rebuilt.streak.best, full.streak.best);
  for (const id of ids) assert.equal(rebuilt.q[id].seen, full.q[id].seen);
  assert.deepEqual(rebuilt.days, full.days);
});

test('mergeStats : questions et examens disparus de l’historique conservés, drapeaux réunis', () => {
  const prev = emptyStats();
  applyAnswer(prev, { id: ctx.all[0], ok: true, t: T0 }, ctx);
  prev.flags.avion = true;
  prev.exams.push({ t: T0, mode: 'qcm', note: 15, durationMs: MIN, cacOk: false });
  const m = mergeStats(emptyStats(), prev);
  assert.equal(m.q[ctx.all[0]].ok, 1);
  assert.equal(m.flags.avion, true);
  assert.equal(m.exams.length, 1);
  assert.equal(mergeStats(emptyStats(), null).exams.length, 0);
});

// ---------- Service worker (sw.js) : simulation du gestionnaire fetch ----------
// sw.js tourne dans un contexte isolé avec self, caches et fetch simulés. Les réponses sont des objets simples
// (status, type) ; seules celles construites par sw.js lui-même (503) sont de vraies Response.
const SW_SRC = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://dec.test';
const BASE = `${ORIGIN}/app/`;
const res = (body, { status = 200, type = 'basic', delay = 0 } = {}) => ({ body, status, type, ok: status >= 200 && status < 300, delay, clone() { return this; } });
async function loadSw(net = {}) {
  const vm = await import('node:vm');
  const handlers = {}; const stores = new Map(); const fetched = [];
  const keyOf = (r, ignoreSearch) => { const u = new URL(typeof r === 'string' ? r : r.url, BASE); if (ignoreSearch) u.search = ''; return u.href; };
  const openCache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      match: async (r, o = {}) => { const k = keyOf(r, o.ignoreSearch); for (const [kk, v] of m) if ((o.ignoreSearch ? keyOf(kk, true) : kk) === k) return v; return undefined; },
      put: async (r, v) => { if (v.status === 206) throw new TypeError('Partial response'); m.set(keyOf(r), v); },
      add: async (r) => { const v = await ctx.fetch(r); if (!v.ok) throw new TypeError('bad'); m.set(keyOf(r), v); },
      addAll: async (rs) => { const vs = await Promise.all(rs.map((r) => ctx.fetch(r))); if (vs.some((v) => !v.ok)) throw new TypeError('bad'); rs.forEach((r, i) => m.set(keyOf(r), vs[i])); },
    };
  };
  class Req { constructor(u, init = {}) { this.url = keyOf(u); this.method = init.method || 'GET'; this.mode = init.mode || 'cors'; this.headers = new Headers(init.headers || {}); this.cache = init.cache; } }
  const ctx = vm.createContext({
    URL, Headers, Response, Promise, setTimeout: (fn, ms, ...a) => setTimeout(fn, Math.min(ms, 50), ...a), console,
    Request: Req,
    self: { location: { origin: ORIGIN }, addEventListener: (t, h) => { handlers[t] = h; }, skipWaiting: () => {}, clients: { claim: async () => {} } },
    caches: { open: async (n) => openCache(n), keys: async () => [...stores.keys()], delete: async (n) => stores.delete(n) },
    fetch: async (r) => {
      const u = new URL(typeof r === 'string' ? r : r.url, BASE); const path = u.pathname.replace('/app/', './');
      fetched.push(path);
      const h = net[path] ?? net['*'];
      const v = typeof h === 'function' ? h(path) : h;
      if (!v) throw new TypeError('Failed to fetch');
      if (v.delay) await new Promise((ok) => setTimeout(ok, v.delay));
      return v;
    },
  });
  vm.runInContext(SW_SRC, ctx);
  const version = vm.runInContext('VERSION', ctx);
  const send = async (path, { mode = 'cors', headers = {} } = {}) => {
    let p = null; const waits = [];
    handlers.fetch({ request: new Req(new URL(path, BASE).href, { mode, headers }), respondWith: (x) => { p = x; }, waitUntil: (x) => waits.push(x) });
    const r = p ? await p : null;
    await Promise.allSettled(waits);
    return r;
  };
  const install = async () => { let w; handlers.install({ waitUntil: (x) => { w = x; } }); await w; };
  return { send, install, cache: () => openCache(version), fetched, version, core: vm.runInContext('CORE', ctx), pdfs: vm.runInContext('PDFS', ctx) };
}
const shellNet = { './index.html': res('INDEX'), '*': (p) => res(`NET ${p}`) };

test('sw : une navigation vers data/*.pdf reçoit le PDF, jamais index.html ; ./?v=1 reçoit la coquille', async () => {
  const sw = await loadSw(shellNet);
  await sw.install();
  assert.equal((await sw.send('./data/fiches-a-imprimer.pdf', { mode: 'navigate' })).body, 'NET ./data/fiches-a-imprimer.pdf');
  assert.equal((await sw.send('./data/x.pdf', { mode: 'navigate' })).body, 'NET ./data/x.pdf');
  assert.equal((await sw.send('./?v=1', { mode: 'navigate' })).body, 'INDEX');
  assert.equal((await sw.send('./index.html', { mode: 'navigate' })).body, 'INDEX');
  assert.equal((await sw.send('./stats', { mode: 'navigate' })).body, 'INDEX');
});

test('sw : navigation vers un PDF hors ligne, copie en cache ; requête Range laissée au navigateur', async () => {
  const net = { ...shellNet };
  const sw = await loadSw(net);
  await sw.install();
  net['*'] = () => null; // hors ligne
  assert.equal((await sw.send('./data/ville-plan.pdf', { mode: 'navigate' })).body, 'NET ./data/ville-plan.pdf');
  assert.equal((await sw.send('./data/ville-plan.pdf')).body, 'NET ./data/ville-plan.pdf');
  assert.equal(await sw.send('./data/fiches-a-imprimer.pdf', { headers: { range: 'bytes=0-1023' } }), null);
});

test('sw : les 4 PDF sont précachés sans bloquer l’installation', async () => {
  assert.deepEqual([...sw4()].sort(), ['./data/fiches-a-imprimer-2-par-feuille.pdf', './data/fiches-a-imprimer.pdf', './data/ville-compositions.pdf', './data/ville-plan.pdf']);
  function sw4() { return /const PDFS = \[([\s\S]*?)\];/.exec(SW_SRC)[1].match(/'[^']+'/g).map((s) => s.slice(1, -1)); }
  for (const f of sw4()) assert.ok(readFileSync(new URL(f, new URL('../', import.meta.url))).length > 1000, `${f} absent du dépôt`);
  // Un PDF introuvable : l'installation aboutit quand même, les autres PDF sont en cache
  const sw = await loadSw({ ...shellNet, './data/ville-plan.pdf': res('', { status: 404 }) });
  await sw.install();
  assert.ok(await sw.cache().match('./index.html'));
  assert.ok(await sw.cache().match('./data/fiches-a-imprimer.pdf'));
  assert.equal(await sw.cache().match('./data/ville-plan.pdf'), undefined);
});

test('sw : questions.json en réseau d’abord, copie en cache si le réseau tarde ou échoue', async () => {
  const net = { ...shellNet, './data/questions.json': res('NEUF') };
  const sw = await loadSw({ ...net, './data/questions.json': res('ANCIEN') });
  await sw.install();
  const sw2 = await loadSw(net);
  // même cache que l'installation précédente : on recopie l'entrée
  await sw2.cache().put('./data/questions.json', res('ANCIEN'));
  await sw2.cache().put('./index.html', res('INDEX'));
  assert.equal((await sw2.send('./data/questions.json')).body, 'NEUF');
  assert.equal((await sw2.cache().match('./data/questions.json')).body, 'NEUF', 'cache mis à jour');
  // Réseau lent (au-delà du délai) : la copie en cache, puis le cache est mis à jour à l'arrivée
  net['./data/questions.json'] = res('LENT', { delay: 200 });
  await sw2.cache().put('./data/questions.json', res('ANCIEN'));
  assert.equal((await sw2.send('./data/questions.json')).body, 'ANCIEN');
  assert.equal((await sw2.cache().match('./data/questions.json')).body, 'LENT');
  // Hors ligne : la copie en cache
  net['./data/questions.json'] = () => null;
  assert.equal((await sw2.send('./data/glossaire.json')).body, 'NET ./data/glossaire.json');
  assert.equal((await sw2.send('./data/questions.json')).body, 'LENT');
  // Absente du cache et hors ligne : 503
  net['*'] = () => null;
  assert.equal((await sw2.send('./data/fiches/99-absente.md')).status, 503);
  assert.ok(sw.version);
});

test('sw : le code est servi depuis le cache, seules les réponses 200 « basic » sont mises en cache', async () => {
  const net = { ...shellNet };
  const sw = await loadSw(net);
  await sw.install();
  net['./js/app.js'] = res('APP NEUF');
  assert.equal((await sw.send('./js/app.js')).body, 'NET ./js/app.js', 'version du précache');
  net['./data/nouveau.json'] = res('PARTIEL', { status: 206 });
  await sw.send('./data/nouveau.json');
  assert.equal(await sw.cache().match('./data/nouveau.json'), undefined);
  net['./data/opaque.json'] = res('OPAQUE', { type: 'opaque' });
  await sw.send('./data/opaque.json');
  assert.equal(await sw.cache().match('./data/opaque.json'), undefined);
  net['./data/fiches/nouvelle.md'] = res('FICHE');
  await sw.send('./data/fiches/nouvelle.md');
  assert.equal((await sw.cache().match('./data/fiches/nouvelle.md')).body, 'FICHE');
});

// ---------- PDF (js/pdf.js) ----------
const PDF = await import('../js/pdf.js');
const pdfRes = (type = 'application/pdf') => ({ ok: true, blob: async () => new Blob(['%PDF-1.7 contenu'], { type }) });

test('pdf : chargé une seule fois par URL, pas d’échec gardé, une page HTML refusée', async () => {
  PDF.forgetPdfs();
  let n = 0; const fetchFn = async () => { n++; return pdfRes(); };
  const [a, b] = await Promise.all([PDF.preloadPdf('./data/a.pdf', { fetchFn }), PDF.preloadPdf('./data/a.pdf', { fetchFn })]);
  assert.equal(n, 1); assert.equal(a, b);
  assert.equal(a.name, 'a.pdf'); assert.equal(a.type, 'application/pdf');
  await PDF.preloadPdf('./data/a.pdf', { fetchFn });
  assert.equal(n, 1, 'pas de nouveau téléchargement à chaque render()');
  assert.equal(PDF.pdfFile('./data/a.pdf'), a);
  // Ancien service worker : index.html servi à la place du PDF
  assert.equal(await PDF.preloadPdf('./data/b.pdf', { fetchFn: async () => pdfRes('text/html') }), null);
  // Hors ligne : nouvel essai seulement après 30 s, ou à la demande
  let m = 0; const off = async () => { m++; throw new TypeError('offline'); };
  assert.equal(await PDF.preloadPdf('./data/c.pdf', { fetchFn: off, now: 1000 }), null);
  assert.equal(await PDF.preloadPdf('./data/c.pdf', { fetchFn: off, now: 2000 }), null);
  assert.equal(m, 1);
  assert.ok(await PDF.preloadPdf('./data/c.pdf', { fetchFn, force: true }));
  PDF.forgetPdfs();
});

test('pdf : partage dans l’app installée, téléchargement ailleurs, jamais de navigation', () => {
  const plan = PDF.pdfPlan;
  assert.equal(plan({ ready: true, shareable: true, standalone: true }), 'share');
  assert.equal(plan({ ready: true, shareable: true, touch: true }), 'share');
  assert.equal(plan({ ready: true, shareable: true }), 'download', 'ordinateur : téléchargement');
  assert.equal(plan({ ready: true, shareable: false }), 'download');
  assert.equal(plan({ ready: true, shareable: false, standalone: true }), 'sheet', 'app installée sans partage : feuille interne');
  assert.equal(plan({ ready: false, standalone: true }), 'sheet');
  assert.equal(plan({ ready: false }), 'sheet');
  assert.equal(plan({ print: true }), 'print');
  assert.equal(plan({ print: true, standalone: true, ready: true, shareable: true }), 'share', 'Imprimer dans l’app installée : feuille de partage');
  assert.equal(plan({ print: true, standalone: true }), 'sheet');
  const src = readFileSync(new URL('../js/pdf.js', import.meta.url), 'utf8') + readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(!/target="_blank"|\.target\s*=|window\.open\(|location\.href\s*=/.test(src), 'aucune ouverture de PDF hors de l’app');
  assert.ok(!/href="\.\/data\/[^"]*\.pdf"/.test(src), 'aucun lien direct vers un PDF');
});

test('pdf : saveFile ajoute, clique, retire le lien puis libère l’URL ; rien dans l’app installée', () => {
  const log = []; let later = null;
  const a = { style: {}, click: () => log.push('click'), remove: () => log.push('remove') };
  const doc = { createElement: () => a, body: { append: (x) => { assert.equal(x, a); log.push('append'); } } };
  const urlApi = { createObjectURL: () => 'blob:x', revokeObjectURL: (u) => log.push(`revoke ${u}`) };
  assert.equal(PDF.saveFile(new Blob(['x']), 'x.json', { doc, urlApi, later: (fn) => { later = fn; }, standalone: false }), true);
  assert.equal(a.download, 'x.json');
  assert.deepEqual(log, ['append', 'click', 'remove']);
  later();
  assert.deepEqual(log.at(-1), 'revoke blob:x');
  assert.equal(PDF.saveFile(new Blob(['x']), 'x.json', { doc, urlApi, standalone: true }), false);
  assert.equal(log.length, 4);
});

test('pdf : app installée et aperçu intégré réservé à l’ordinateur (pas iOS 16.4+, qui a pdfViewerEnabled)', () => {
  const w = (queries, nav = {}) => ({ matchMedia: (q) => ({ matches: queries.includes(q) }), navigator: nav });
  assert.equal(PDF.isStandalone(w(['(display-mode: standalone)'])), true);
  assert.equal(PDF.isStandalone(w([], { standalone: true })), true);
  assert.equal(PDF.isStandalone(w([])), false);
  const desk = w(['(hover: hover) and (pointer: fine)'], { pdfViewerEnabled: true, maxTouchPoints: 0 });
  assert.equal(PDF.canInline(desk), true);
  assert.equal(PDF.canInline(w(['(pointer: coarse)'], { pdfViewerEnabled: true, maxTouchPoints: 5 })), false, 'iPhone');
  assert.equal(PDF.canInline(w(['(hover: hover) and (pointer: fine)'], { pdfViewerEnabled: true, maxTouchPoints: 5 })), false, 'iPad avec trackpad');
  assert.equal(PDF.fmtSize(1210311), '1,2 Mo');
  assert.equal(PDF.fmtSize(82701), '83 ko');
});

// ---------- Démarrage : secours d'index.html et erreurs d'affichage ----------
test('démarrage : le secours d’index.html épargne une app démarrée ; render() protégé ; attente de la synchro bornée', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(html, /if \(window\.__dec1Started \|\|/);
  const init = app.slice(app.indexOf('async function init() {'));
  assert.match(init.split('\n')[1], /window\.__dec1Started = true/, 'drapeau posé en tête d’init()');
  assert.match(init, /addEventListener\('unhandledrejection'/);
  assert.match(init, /addEventListener\('error'/);
  assert.match(init, /Promise\.race\(\[runSync\(\{ boot: true, timeout: 2500 \}\), new Promise\(\(r\) => setTimeout\(r, 3000\)\)\]\);\n\s*booting = false;/);
  assert.match(app, /const atBoot = boot && booting;/);
  const render = app.slice(app.indexOf('function render() {'), app.indexOf('function renderView('));
  assert.match(render, /try \{ renderView\(main\); \} catch/);
  assert.match(render, /Affichage impossible/);
  assert.match(app, /addEventListener\('controllerchange'/);
  assert.match(app, /setTimeout\(res, 15000\)/);
});

test('service worker : VERSION calculée par build_bank.py (empreinte du contenu servi), à jour', async () => {
  const { execFileSync } = await import('node:child_process');
  const src = readFileSync(new URL('../scripts/build_bank.py', import.meta.url), 'utf8');
  assert.match(src, /def sw_version\(/);
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /^const VERSION = 'dec1-[0-9a-f]{10}';$/m);
  const out = (() => { try { return execFileSync('python3', ['-I', 'scripts/build_bank.py', '--check'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } })();
  assert.ok(!/VERSION de sw\.js/.test(out), 'code ou données modifiés : relancer « npm run build » (VERSION de sw.js)');
});
