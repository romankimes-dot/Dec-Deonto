import test from 'node:test';
import assert from 'node:assert/strict';

// localStorage de remplacement, réinitialisé avant chaque test
function mockStorage() {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
  return m;
}
const store = await import('../js/store.js');
const fresh = () => { mockStorage(); store.notices.length = 0; };
const stateWith = (n) => { const s = store.defaultState(); for (let i = 0; i < n; i++) s.cards[`q${i}`] = { ease: 2.5, interval: 1, reps: 1, lapses: 0, due: 1, last: 1 }; return s; };

test('sauvegarde puis rechargement', () => {
  fresh();
  const s = stateWith(3);
  assert.equal(store.save(s), true);
  assert.equal(Object.keys(store.load().cards).length, 3);
  assert.equal(store.notices.length, 0);
});

test('texte illisible : conservé, signalé, jamais détruit en silence', () => {
  const m = mockStorage(); store.notices.length = 0;
  m.set('dec1.progress.v1', '{"cards": {');
  const s = store.load();
  assert.equal(Object.keys(s.cards).length, 0);
  assert.deepEqual(store.notices.map((n) => n.type), ['corrupt']);
  assert.equal(m.get('dec1.progress.corrupt'), '{"cards": {');
});

test('texte illisible avec sauvegarde automatique : restauration signalée', () => {
  const m = mockStorage(); store.notices.length = 0;
  const t0 = Date.now();
  store.save(stateWith(5));           // premier état sain
  store.save(stateWith(6));           // première sauvegarde automatique = état précédent (5 cartes)
  assert.equal(Object.keys(JSON.parse(m.get('dec1.progress.backup')).cards).length, 5);
  assert.ok(Number(m.get('dec1.progress.backup.t')) >= t0);
  m.set('dec1.progress.v1', 'pas du json');
  const s = store.load();
  assert.equal(Object.keys(s.cards).length, 5);
  assert.deepEqual(store.notices.map((n) => n.type), ['corrupt', 'restored']);
});

test('la copie automatique ne se renouvelle pas avant 3 h', () => {
  const m = mockStorage(); store.notices.length = 0;
  store.save(stateWith(1)); store.save(stateWith(2)); store.save(stateWith(3));
  assert.equal(Object.keys(JSON.parse(m.get('dec1.progress.backup')).cards).length, 1);
});

test('import : refuse les fichiers invalides avec un message précis', () => {
  fresh();
  assert.throws(() => store.importJSON('pas du json'), /illisible/);
  assert.throws(() => store.importJSON('[]'), /non reconnu/);
  assert.throws(() => store.importJSON('{"cards":"x"}'), /non reconnu/);
  assert.throws(() => store.importJSON('{"cards":{},"attempts":"x"}'), /attempts/);
  assert.throws(() => store.importJSON('{"cards":{"a":{"interval":1}}}'), /carte « a »/);
  assert.throws(() => store.importJSON('{"cards":{},"settings":[]}'), /settings/);
});

test('import : un export valide est relu à l’identique', () => {
  fresh();
  const s = stateWith(4); s.lastExportAt = 123; s.plan = { done: { cadre: 5 } };
  const back = store.importJSON(store.exportJSON(s));
  assert.equal(Object.keys(back.cards).length, 4);
  assert.equal(back.lastExportAt, 123);
  assert.deepEqual(back.plan.done, { cadre: 5 });
  assert.equal(back.exportedAt, undefined);
});

test('état précédent conservé avant un effacement, restaurable', () => {
  fresh();
  const s = stateWith(7);
  store.save(s);
  const empty = store.reset(s);
  assert.equal(Object.keys(empty.cards).length, 0);
  assert.equal(store.load().cards && Object.keys(store.load().cards).length, 0);
  const info = store.prevInfo();
  assert.equal(info.cards, 7);
  assert.equal(Object.keys(store.restorePrev().cards).length, 7);
});

test('effacement : la sauvegarde automatique ne ressuscite pas l’ancien état', () => {
  fresh();
  store.save(stateWith(2)); store.save(stateWith(3));
  store.reset(stateWith(3));
  assert.equal(Object.keys(store.load().cards).length, 0);
});

test('examen en cours : écrit, relu, refusé s’il est incohérent', () => {
  fresh();
  const ids = Array.from({ length: 20 }, (_, i) => `x${i}`);
  const ex = { mode: 'qcm', startedAt: 1, endsAt: 2, ids, answers: { x0: 2 }, current: 3 };
  store.saveExam(ex);
  const back = store.loadExam();
  assert.equal(back.answers.x0, 2);
  assert.equal(back.current, 3);
  store.saveExam({ ...ex, ids: ids.slice(1) });
  assert.equal(store.loadExam(), null);
  store.saveExam(ex); store.saveExam(null);
  assert.equal(store.loadExam(), null);
});
