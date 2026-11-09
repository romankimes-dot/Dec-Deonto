import test from 'node:test';
import assert from 'node:assert/strict';

function mockStorage() {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
  return m;
}
mockStorage();
const store = await import('../js/store.js');
const SY = await import('../js/sync.js');
const worker = (await import('../cloudflare/worker.js')).default;

const card = (last, interval = 1) => ({ ease: 2.5, interval, reps: 1, lapses: 0, due: last + interval * 86400000, last });
const st = (patch = {}) => ({ ...store.defaultState(), ...patch });

test('fusion : cartes, réponses et badges des deux appareils réunis, révision la plus récente gardée', () => {
  const a = st({ updatedAt: 200, cards: { q1: card(100, 1), q2: card(50) }, attempts: [{ id: 'q1', ok: true, mode: 'qcm', t: 100 }], badges: { b1: 100 } });
  const b = st({ updatedAt: 150, cards: { q1: card(120, 6), q3: card(60) }, attempts: [{ id: 'q1', ok: true, mode: 'qcm', t: 120 }, { id: 'q3', ok: false, mode: 'qrc', t: 60 }], badges: { b1: 90, b2: 110 } });
  const m = SY.merge(a, b);
  assert.deepEqual(Object.keys(m.cards).sort(), ['q1', 'q2', 'q3']);
  assert.equal(m.cards.q1.interval, 6); // révisée plus tard sur l'autre appareil
  assert.deepEqual(m.attempts.map((x) => x.t), [60, 100, 120]);
  assert.deepEqual(m.badges, { b1: 90, b2: 110 });
  assert.equal(m.updatedAt, 200);
  assert.deepEqual(SY.merge(a, b), SY.merge(a, b), 'déterministe');
  assert.ok(SY.same(SY.merge(m, b), m), 'refusionner ne change rien');
});

test('fusion : un appareil neuf ne remplace pas les réglages de l’autre', () => {
  const phone = st({ updatedAt: 100, cards: { q1: card(10) } }); phone.settings.examDate = '2026-11-10T10:30:00'; phone.settings.mode = 'qcm';
  const fresh = st({ updatedAt: 999 }); fresh.settings.mode = 'mixte';
  assert.equal(SY.merge(fresh, phone).settings.mode, 'qcm');
  // réglage modifié ensuite sur l'appareil neuf : il l'emporte
  const changed = { ...fresh, settingsAt: 1000, settings: { ...fresh.settings, mode: 'qrc' } };
  assert.equal(SY.merge(phone, changed).settings.mode, 'qrc');
});

test('fusion : 400 réponses au plus et records conservés', () => {
  const many = (from) => Array.from({ length: 300 }, (_, i) => ({ id: `q${i}`, ok: true, mode: 'qcm', t: from + i }));
  const a = st({ attempts: many(0), games: { best: { vf: 12 } } });
  const b = st({ attempts: many(1000), games: { best: { vf: 8, chiffres: 3 } } });
  const m = SY.merge(a, b);
  assert.equal(m.attempts.length, 400);
  assert.equal(m.attempts.at(-1).t, 1299);
  assert.deepEqual(m.games.best, { vf: 12, chiffres: 3 });
});

test('adresse du Worker : https obligatoire, / final et /progress retirés', () => {
  assert.equal(SY.normalizeUrl(' https://x.workers.dev/progress/ '), 'https://x.workers.dev');
  assert.equal(SY.normalizeUrl('http://x.workers.dev'), null);
  assert.equal(SY.normalizeUrl('pas une adresse'), null);
});

// Worker branché sur un KV en mémoire, appelé à la place du réseau
function server(token = 'secret') {
  const kv = new Map(); const meta = new Map();
  const env = { TOKEN: token, DEC1: {
    get: async (k) => (kv.has(k) ? kv.get(k) : null),
    getWithMetadata: async (k) => ({ value: kv.has(k) ? kv.get(k) : null, metadata: meta.get(k) || null }),
    put: async (k, v, o = {}) => { kv.set(k, v); meta.set(k, o.metadata || null); },
    list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  } };
  const f = (url, opts = {}) => worker.fetch(new Request(url, { method: opts.method || 'GET', headers: opts.headers, body: opts.body }), env);
  return { kv, f };
}
const cfg = { url: 'https://dec1.example.workers.dev', token: 'secret' };

test('Worker : code secret exigé, progression non reconnue refusée', async () => {
  const { f } = server();
  assert.equal((await f(`${cfg.url}/progress`)).status, 401);
  assert.equal((await f(`${cfg.url}/progress`, { headers: { Authorization: 'Bearer faux' } })).status, 401);
  const bad = await f(`${cfg.url}/progress`, { method: 'PUT', headers: { Authorization: 'Bearer secret' }, body: '{"x":1}' });
  assert.equal(bad.status, 400);
  assert.equal((await f(`${cfg.url}/`)).status, 200);
});

test('synchro : premier envoi, puis un second appareil récupère et fusionne', async () => {
  const { kv, f } = server();
  const phone = st({ updatedAt: 100, cards: { q1: card(10) } });
  const r1 = await SY.syncOnce(cfg, phone, { fetch: f });
  assert.equal(r1.pushed, true); assert.equal(r1.changed, false);
  assert.ok(kv.has('progress'));

  const laptop = st({ updatedAt: 200, cards: { q2: card(20) } });
  const r2 = await SY.syncOnce(cfg, laptop, { fetch: f });
  assert.equal(r2.changed, true); assert.equal(r2.pushed, true);
  assert.deepEqual(Object.keys(r2.state.cards).sort(), ['q1', 'q2']);
  assert.ok(kv.has(`backup:progress:${new Date().toISOString().slice(0, 10)}`), 'version précédente gardée');

  const r3 = await SY.syncOnce(cfg, phone, { fetch: f });
  assert.deepEqual(Object.keys(r3.state.cards).sort(), ['q1', 'q2']);
  const r4 = await SY.syncOnce(cfg, r3.state, { fetch: f });
  assert.equal(r4.pushed, false, 'rien à envoyer quand tout est à jour');
  assert.equal(r4.changed, false);
});

test('synchro : export importé tel quel dans KV accepté ; copie illisible jamais écrasée', async () => {
  const { kv, f } = server();
  kv.set('progress', store.exportJSON(st({ cards: { q9: card(5) } })));
  const r = await SY.syncOnce(cfg, st(), { fetch: f });
  assert.ok(r.state.cards.q9);
  kv.set('progress', '{"cards": {');
  await assert.rejects(SY.syncOnce(cfg, st(), { fetch: f }), /illisible/);
  assert.equal(kv.get('progress'), '{"cards": {');
  await assert.rejects(SY.syncOnce({ ...cfg, token: 'faux' }, st(), { fetch: f }), /code secret/);
});

test('Worker : casiers Ernest et ponts, révision vérifiée (If-Match)', async () => {
  const { f } = server();
  const H = { Authorization: 'Bearer secret' };
  const u = 'https://dec1.example.workers.dev';
  assert.equal((await f(`${u}/ernest`, { headers: H })).status, 204);
  const p1 = await f(`${u}/ernest`, { method: 'PUT', headers: { ...H, 'If-Match': '' }, body: '{"days":{}}' });
  assert.equal(p1.status, 200); const rev = p1.headers.get('X-Rev'); assert.ok(rev);
  assert.equal((await f(`${u}/ernest`, { method: 'PUT', headers: { ...H, 'If-Match': '' }, body: '{"days":{}}' })).status, 412);
  assert.equal((await f(`${u}/ernest`, { method: 'PUT', headers: { ...H, 'If-Match': rev }, body: '{"days":{"x":1}}' })).status, 200);
  assert.equal((await f(`${u}/ernest`, { method: 'PUT', headers: H, body: '{"cards":{}}' })).status, 400);
  assert.equal((await f(`${u}/pont/deonto`, { method: 'PUT', headers: H, body: '{"src":"revision"}' })).status, 400);
  assert.equal((await f(`${u}/pont/deonto`, { method: 'PUT', headers: H, body: '{"v":1,"src":"deonto","things":[]}' })).status, 200);
  assert.deepEqual(await (await f(`${u}/ponts`, { headers: H })).json(), { deonto: { v: 1, src: 'deonto', things: [] } });
  assert.equal((await f(`${u}/ponts`)).status, 401);
});

test('pont vers Ernest : envoyé seulement s’il a changé', async () => {
  const { kv, f } = server();
  const p = { v: 1, src: 'deonto', things: [{ title: 'Déonto · Session', day: '2026-11-03' }], goals: [] };
  assert.equal(await SY.pushPont(cfg, p, { fetch: f }), true);
  assert.equal(await SY.pushPont(cfg, p, { fetch: f }), false);
  assert.ok(kv.has('pont:deonto'));
});

test('pont : une tâche déposée faite par un autre appareil n’est pas décochée par un appareil en retard', async () => {
  const { kv, f } = server();
  const t = (done) => ({ v: 1, src: 'deonto', things: [{ title: 'Déonto · Shorts', day: '2026-11-03', done }, { title: 'Déonto · Jeu', day: '2026-11-03', done: false }], goals: [] });
  await SY.pushPont(cfg, t(true), { fetch: f });
  localStorage.removeItem('dec1.sync.pont'); // autre appareil
  await SY.pushPont(cfg, t(false), { fetch: f });
  assert.deepEqual(JSON.parse(kv.get('pont:deonto')).things.map((x) => x.done), [true, false]);
});

test('synchro : une fiche décochée sur un appareil reste décochée après fusion', async () => {
  const P = await import('../js/plan.js');
  const base = store.defaults ? store.defaults() : {};
  const a = { ...base, plan: { done: {}, read: { 'x.md': 100 } } };
  const b = { ...base, plan: { done: {}, read: { 'x.md': 100 }, unread: { 'x.md': 200 } } };
  assert.equal(P.isRead(SY.merge(a, b).plan, 'x.md'), false);
  assert.equal(P.isRead(SY.merge(b, a).plan, 'x.md'), false);
  const c = { ...base, plan: { done: {}, read: { 'x.md': 300 } } };
  assert.equal(P.isRead(SY.merge(b, c).plan, 'x.md'), true, 'recochée plus tard ailleurs');
});

test('fusion : un effacement, un import ou un retour en arrière (resetAt) remplace l’autre état au lieu d’être annulé', () => {
  const remote = st({ updatedAt: 100, cards: { a: card(10) }, attempts: [{ id: 'a', ok: true, mode: 'qcm', t: 10 }], badges: { b1: 10 } });
  const local = store.reset(remote); local.resetAt = 500; local.updatedAt = 500;
  for (const m of [SY.merge(local, remote), SY.merge(remote, local)]) {
    assert.deepEqual(m.cards, {}); assert.deepEqual(m.attempts, []); assert.deepEqual(m.badges, {});
    assert.equal(m.resetAt, 500); assert.equal(m.updatedAt, 500);
  }
  // l'état effacé, même modifié avant (updatedAt plus grand ailleurs), l'emporte ; updatedAt reste le plus grand
  const later = { ...remote, updatedAt: 900 };
  const m2 = SY.merge(later, local);
  assert.deepEqual(m2.cards, {}); assert.equal(m2.updatedAt, 900);
  // ensuite, même resetAt des deux côtés : fusion ordinaire
  const after = { ...local, cards: { c: card(600) }, updatedAt: 700 };
  assert.deepEqual(Object.keys(SY.merge(local, after).cards), ['c']);
  // import : l'état importé l'emporte sur l'état en ligne plus fourni
  const imported = store.importJSON(store.exportJSON(st({ cards: { z: card(1) } }))); imported.resetAt = 800;
  assert.deepEqual(Object.keys(SY.merge(imported, remote).cards), ['z']);
});

test('synchro : la progression effacée sur un appareil ne revient pas, et disparaît sur l’autre', async () => {
  const { kv, f } = server();
  const phone = st({ updatedAt: 100, cards: { q1: card(10) } });
  await SY.syncOnce(cfg, phone, { fetch: f });
  const laptop = (await SY.syncOnce(cfg, st({ updatedAt: 150, cards: { q2: card(20) } }), { fetch: f })).state;
  const cleared = store.reset(phone); cleared.resetAt = 1000; cleared.updatedAt = 1000;
  const r1 = await SY.syncOnce(cfg, cleared, { fetch: f });
  assert.deepEqual(r1.state.cards, {}); assert.equal(r1.changed, false); assert.equal(r1.pushed, true);
  assert.deepEqual(JSON.parse(kv.get('progress')).cards, {});
  const r2 = await SY.syncOnce(cfg, laptop, { fetch: f });
  assert.deepEqual(r2.state.cards, {}); assert.equal(r2.changed, true);
  // l'autre appareil reprend ensuite normalement
  const next = { ...r2.state, cards: { q3: card(2000) }, updatedAt: 2000 };
  const r3 = await SY.syncOnce(cfg, next, { fetch: f });
  assert.deepEqual(Object.keys(r3.state.cards), ['q3']);
});

test('synchro : PUT avec If-Match ; sur 412 (écriture concurrente), relecture et nouvelle fusion', async () => {
  const { kv, f } = server();
  await SY.syncOnce(cfg, st({ updatedAt: 100, cards: { q1: card(10) } }), { fetch: f });
  const log = []; let raced = false;
  const spy = async (url, opts = {}) => {
    const m = opts.method || 'GET'; log.push(`${m}${opts.headers?.['If-Match'] !== undefined ? ' if-match' : ''}`);
    if (m === 'PUT' && !raced) { // un autre appareil écrit juste avant
      raced = true;
      await SY.syncOnce(cfg, st({ updatedAt: 120, cards: { q9: card(30) } }), { fetch: f });
    }
    return f(url, opts);
  };
  const r = await SY.syncOnce(cfg, st({ updatedAt: 150, cards: { q2: card(20) } }), { fetch: spy });
  assert.deepEqual(log, ['GET', 'PUT if-match', 'GET', 'PUT if-match']);
  assert.equal(r.pushed, true);
  assert.deepEqual(Object.keys(JSON.parse(kv.get('progress')).cards).sort(), ['q1', 'q2', 'q9'], 'rien d’écrasé');
});

test('synchro : 412 répété, deux nouvelles tentatives au plus puis erreur explicite', async () => {
  const { f } = server();
  let puts = 0;
  const spy = async (url, opts = {}) => {
    if (opts.method === 'PUT') { puts++; return new Response('{"error":"modifié entre-temps"}', { status: 412 }); }
    return f(url, opts);
  };
  await assert.rejects(SY.syncOnce(cfg, st({ cards: { q1: card(1) } }), { fetch: spy }), /autre appareil/);
  assert.equal(puts, 3);
  // casier vide : If-Match vide, refusé si un autre appareil a écrit entre-temps
  const { f: g } = server();
  const H = { Authorization: 'Bearer secret', 'If-Match': '' };
  await SY.syncOnce(cfg, st({ cards: { q1: card(1) } }), { fetch: g });
  assert.equal((await g(`${cfg.url}/progress`, { method: 'PUT', headers: H, body: '{"cards":{}}' })).status, 412);
});
