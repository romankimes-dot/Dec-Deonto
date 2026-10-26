import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as PC from '../js/podcasts.js';
import { STEPS } from '../js/plan.js';

const ep = (id, steps, file = `data/podcasts/${id}.m4a`, duration = 600) => ({ n: Number(id.slice(0, 2)), id, title: id, steps, file, duration });
const dayKeyOf = (t) => new Date(t).toISOString().slice(0, 10);

test('data/podcasts.json : 10 épisodes, dans l’ordre, toutes les étapes du parcours couvertes une fois', () => {
  const list = JSON.parse(readFileSync(new URL('../data/podcasts.json', import.meta.url), 'utf8'));
  assert.equal(list.length, 10);
  list.forEach((e, i) => {
    assert.equal(e.n, i + 1);
    assert.match(e.id, new RegExp(`^${String(i + 1).padStart(2, '0')}-[a-z-]+$`));
    assert.ok(e.title && Array.isArray(e.steps) && e.steps.length);
    assert.ok('file' in e && 'duration' in e);
    for (const s of e.steps) assert.ok(STEPS.some((st) => st.id === s), `${e.id} : étape inconnue ${s}`);
    if (e.file !== null) {
      assert.equal(e.file, `data/podcasts/${e.id}.m4a`);
      assert.ok(e.duration > 0, `${e.id} : durée manquante`);
      assert.ok(existsSync(new URL(`../${e.file}`, import.meta.url)), `${e.file} absent`);
    }
  });
  const covered = list.flatMap((e) => e.steps);
  assert.deepEqual([...covered].sort(), STEPS.map((s) => s.id).sort());
});

test('état d’un épisode : bientôt, nouveau, en cours, écouté', () => {
  const e = ep('01-a', ['cadre']);
  assert.equal(PC.episodeState({ ...e, file: null }).state, 'soon');
  assert.equal(PC.episodeState({ ...e, duration: null }).state, 'soon');
  assert.deepEqual(PC.episodeState(e, undefined), { state: 'new', ratio: 0 });
  assert.deepEqual(PC.episodeState(e, { pos: 150 }), { state: 'progress', ratio: 0.25 });
  assert.deepEqual(PC.episodeState(e, { pos: 10, done: true }), { state: 'done', ratio: 1 });
});

test('reprise et écouté à 90 %', () => {
  const e = ep('01-a', ['cadre']);
  assert.equal(PC.resumeAt(e, { pos: 123 }), 123);
  assert.equal(PC.resumeAt(e, { pos: 598 }), 0, 'à moins de 5 s de la fin : depuis le début');
  assert.equal(PC.resumeAt(e, { pos: 300, done: true }), 0);
  assert.equal(PC.updateProgress(undefined, 539, 600, 1).done, false);
  assert.deepEqual(PC.updateProgress(undefined, 540.4, 600, 7), { pos: 540, done: true, t: 7 });
  assert.equal(PC.updateProgress({ done: true }, 10, 600).done, true, 'reste écouté si l’on revient au début');
});

test('formats : durée, horloge, taille', () => {
  assert.equal(PC.fmtDuration(745), '12 min');
  assert.equal(PC.fmtDuration(null), '');
  assert.equal(PC.fmtClock(187.9), '3:07');
  assert.equal(PC.fmtSize(4_620_000), '4,6 Mo');
  assert.equal(PC.fmtSize(800), '1 ko');
});

test('étapes étudiées la veille : terminées ou prévues hier, journée fixe d’hier', () => {
  const plan = { done: { cadre: Date.parse('2026-10-25T18:00:00Z'), institutions: Date.parse('2026-10-20T18:00:00Z') }, sched: { mandat: '2026-10-25' } };
  assert.deepEqual(PC.stepsStudiedOn('2026-10-25', plan, { n: 15, dayKeyOf }).sort(), ['cadre', 'mandat']);
  assert.equal(PC.prevDay('2026-11-01'), '2026-10-31');
  // Aujourd'hui J-3 : hier était J-4, l'examen blanc QCM.
  assert.deepEqual(PC.stepsStudiedOn('2026-11-06', {}, { n: 3, dayKeyOf }), ['blanc-qcm']);
  assert.deepEqual(PC.stepsStudiedOn('2026-11-08', {}, { n: 1, dayKeyOf }), ['faibles']);
});

test('épisode suggéré : disponible, couvrant une étape d’hier, pas encore écouté', () => {
  const eps = [ep('01-a', ['cadre', 'institutions']), ep('02-b', ['activites'], null, null), ep('03-c', ['mandat'])];
  assert.equal(PC.suggestEpisode(eps, [], {}), null);
  assert.equal(PC.suggestEpisode(eps, ['institutions'], {}).ep.id, '01-a');
  assert.equal(PC.suggestEpisode(eps, ['activites'], {}), null, 'épisode pas encore disponible');
  const t0 = 1000;
  assert.equal(PC.suggestEpisode(eps, ['cadre', 'mandat'], { '01-a': { done: true, t: 500 } }, t0).ep.id, '03-c', 'déjà écouté avant aujourd’hui');
  assert.deepEqual(PC.suggestEpisode(eps, ['cadre'], { '01-a': { done: true, t: 2000 } }, t0), { ep: eps[0], done: true }, 'écouté aujourd’hui : tâche cochée');
  assert.equal(PC.suggestEpisode(eps, ['cadre'], { '01-a': { pos: 100, done: false } }, t0).done, false);
});

test('plage Range : complète, ouverte, suffixe, bornée, invalide', () => {
  assert.equal(PC.parseRange(null, 100), null);
  assert.equal(PC.parseRange('bytes=0-1,5-6', 100), null, 'plusieurs plages : réponse complète');
  assert.equal(PC.parseRange('items=0-1', 100), null);
  assert.deepEqual(PC.parseRange('bytes=0-1', 100), { start: 0, end: 1 });
  assert.deepEqual(PC.parseRange('bytes=0-', 100), { start: 0, end: 99 });
  assert.deepEqual(PC.parseRange('bytes=90-500', 100), { start: 90, end: 99 });
  assert.deepEqual(PC.parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(PC.parseRange('bytes=-500', 100), { start: 0, end: 99 });
  assert.deepEqual(PC.parseRange('bytes=100-', 100), { invalid: true });
  assert.deepEqual(PC.parseRange('bytes=5-2', 100), { invalid: true });
  assert.deepEqual(PC.parseRange('bytes=-0', 100), { invalid: true });
  const init = PC.rangeResponseInit({ start: 10, end: 19 }, 100);
  assert.equal(init.status, 206);
  assert.equal(init.headers['Content-Range'], 'bytes 10-19/100');
  assert.equal(init.headers['Content-Length'], '10');
  assert.equal(PC.rangeResponseInit(null, 100).status, 200);
  assert.equal(PC.rangeResponseInit({ invalid: true }, 100).status, 416);
});

test('service worker : même parseRange que js/podcasts.js, audios hors précache, cache audio conservé', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const src = /function parseRange\(header, size\) \{[\s\S]*?\n\}/.exec(sw)[0];
  const swParse = new Function(`${src}; return parseRange;`)();
  const cases = [null, '', 'bytes=0-1', 'bytes=0-', 'bytes=-10', 'bytes=-0', 'bytes=50-10', 'bytes=200-', 'bytes=3-500', 'bytes=0-1,4-5', ' bytes = 4 - 8 '];
  for (const h of cases) for (const size of [1, 100]) assert.deepEqual(swParse(h, size), PC.parseRange(h, size), `${h} / ${size}`);
  assert.ok(!/\.m4a/.test(sw.slice(sw.indexOf('const CORE'), sw.indexOf('];'))), 'aucun audio dans le précache');
  assert.ok(sw.includes(`const AUDIO_CACHE = '${PC.AUDIO_CACHE}'`));
  assert.ok(/k !== VERSION && k !== AUDIO_CACHE/.test(sw), 'le cache audio survit aux mises à jour');
  assert.ok(sw.includes("'./data/podcasts.json'"));
  assert.ok(PC.isAudioPath('/Dec-Deonto/data/podcasts/01-cadre-institutions.m4a'));
  assert.ok(!PC.isAudioPath('/data/podcasts.json'));
});

test('progression des podcasts : par défaut vide, gardée et validée à l’import', async () => {
  const store = await import('../js/store.js');
  assert.deepEqual(store.defaultState().podcasts, {});
  assert.deepEqual(store.importJSON(JSON.stringify({ cards: {} })).podcasts, {});
  assert.deepEqual(store.importJSON(JSON.stringify({ cards: {}, podcasts: { '01-a': { pos: 3, done: false, t: 1 } } })).podcasts['01-a'].pos, 3);
  assert.throws(() => store.importJSON(JSON.stringify({ cards: {}, podcasts: [] })), /podcasts/);
});
