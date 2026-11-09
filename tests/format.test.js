// Formats communs (js/format.js) : une même mesure s'affiche à l'identique sur tous les écrans.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NNBSP, pctInt, fmtPct, fmtFrac, fmtShare, fmtRate, fmtNote, fmtScore } from '../js/format.js';
import { gateConditions, readiness, buildContext } from '../js/gamify.js';
import { heroHtml, levelUpHtml, gateSummary } from '../js/career.js';
import { estimate } from '../js/estimate.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const app = read('js/app.js');
const fnBody = (src, start) => { const i = src.indexOf(start); assert.ok(i >= 0, `introuvable : ${start}`); return src.slice(i, src.indexOf('\n}', i)); };

test('fmtPct : entier, espace fine insécable, « – » sans donnée', () => {
  assert.equal(NNBSP, ' ');
  assert.equal(fmtPct(49.6), `49${NNBSP}%`);
  assert.equal(fmtPct(64.6), `64${NNBSP}%`);
  assert.equal(fmtPct(100), `100${NNBSP}%`);
  assert.equal(fmtPct(0), `0${NNBSP}%`);
  for (const v of [null, undefined, NaN, Infinity, 'x']) assert.equal(fmtPct(v), '–');
  assert.equal(fmtFrac(0.29), `29${NNBSP}%`, '0,29 × 100 = 28,999… : pas de 28 %');
  assert.equal(fmtShare(1, 3), `33${NNBSP}%`);
  assert.equal(fmtShare(2, 3), `66${NNBSP}%`, 'réussite : arrondi par défaut');
  assert.equal(fmtShare(3, 0), '–');
  assert.equal(fmtRate(5, 8), `62${NNBSP}% · 8 rép.`);
  assert.equal(fmtRate(0, 0), '–');
});

test('arrondis : par défaut (couverture, réussite), par excès (risques)', () => {
  assert.equal(pctInt(99.99), 99, 'jamais 100 % tant que tout n’est pas vu');
  assert.equal(pctInt(0.3, 'ceil'), 1, 'un risque non nul ne s’affiche pas 0 %');
  assert.equal(pctInt(0, 'ceil'), 0);
  assert.equal(pctInt(61, 'ceil'), 61);
  assert.equal(pctInt(61.2, 'ceil'), 62);
  assert.equal(pctInt(-1e-12), 0);
  assert.equal(Object.is(pctInt(-1e-12), -0), false);
});

test('fmtNote : virgule décimale, « – » sans note ; fmtScore : bonnes réponses sur total', () => {
  assert.equal(fmtNote(13.33), '13,33');
  assert.equal(fmtNote(12.5), '12,5');
  assert.equal(fmtNote(14), '14');
  assert.equal(fmtNote(null), '–');
  assert.equal(fmtScore(3, 10), '3/10');
  assert.equal(fmtScore(7.5, 20), '7,5/20');
  assert.equal(fmtScore(0, 0), '–');
});

test('49,6 % vues et 64,6 % de réussite : le même entier dans heroHtml, gateConditions et homeBilan', () => {
  const r = { cov: 49.6, acc: 64.6, answers: 120, exams: 1, best: 13.33 };
  const cov = fmtPct(r.cov), acc = fmtPct(r.acc);
  assert.equal(cov, `49${NNBSP}%`); assert.equal(acc, `64${NNBSP}%`);
  // Carrière (carte-bilan, passage de grade)
  const hero = heroHtml({ n: 3, pct: 0.5, met: 0, total: 2 }, r);
  assert.ok(hero.includes(`<b>${cov}</b>questions vues`), hero);
  assert.ok(hero.includes(`<b>${acc}</b>réussite globale`), hero);
  assert.ok(hero.includes('13,33/20'), 'meilleur examen : virgule décimale');
  assert.ok(!/\b(50|65) %|\b(50|65) %/.test(hero.replace(/width:[^"]*/g, '')), 'aucun arrondi au plus proche');
  assert.ok(levelUpHtml(4, r).includes(`<b>${cov}</b>questions vues`));
  // Conditions de grade : le libellé affiche le même entier, et la condition n'est pas cochée
  const c4 = gateConditions(4, r)[0];
  assert.ok(c4.label.includes(`(${cov})`), c4.label); assert.equal(c4.ok, false);
  const c6 = gateConditions(6, { ...r, cov: 80, best: 12 }).find((c) => /réussite/.test(c.label));
  assert.ok(c6.label.includes(`(${acc})`), c6.label); assert.equal(c6.ok, false);
  assert.ok(gateConditions(5, r).some((c) => c.label.includes('13,33/20')));
  assert.ok(!/annales vues/.test(gateConditions(4, r)[0].label + gateSummary(4)), 'le dénominateur compte aussi les questions de transfert');
  // Accueil : la couverture affichée est celle de la carrière (G.readiness), passée par fmtPct
  const home = fnBody(app, 'views.home = () => {');
  assert.match(home, /const cov = lv\.readiness\.cov;/);
  const bilan = fnBody(app, 'function homeBilan(');
  assert.match(bilan, /tile\('Questions vues', fmtPct\(cov\)\)/);
  assert.match(fnBody(app, 'function estimateLine('), /kpi\('Questions vues', fmtPct\(cov\)/);
});

test('readiness : la couverture de la carrière est celle de l’accueil (banque de révision)', () => {
  const questions = [...Array(125)].map((_, i) => ({ id: `q${i}`, profession: i % 2 ? 'CAC' : 'EC', theme: 'deontologie', tags: ['secret_professionnel'] }));
  const ctx = buildContext({ questions });
  const q = {}; for (let i = 0; i < 62; i++) q[`q${i}`] = { seen: 1, ok: i % 3 ? 1 : 0 };
  const r = readiness({ q, exams: [] }, ctx);
  assert.equal(fmtPct(r.cov), `49${NNBSP}%`, '62/125 = 49,6 %');
  assert.equal(r.answers, 62);
  assert.equal(readiness({ q: {}, exams: [] }, ctx).answers, 0);
});

test('estimation : pourcentages entiers, risque par excès', () => {
  const questions = [...Array(40)].map((_, i) => ({ id: `q${i}`, profession: i < 20 ? 'EC' : 'CAC', tags: ['t'] }));
  const e = estimate({ questions, stats: { q: {} }, cards: {}, attempts: [], repeat: 0.2 });
  for (const m of ['qcm', 'qrc']) for (const k of ['ec', 'cac', 'risk', 'pass']) assert.ok(Number.isInteger(e[m][k]), `${m}.${k}`);
  assert.ok(e.qcm.risk > 0);
});

test('app.js : un seul formateur, scores d’examen « EC 3/10 », points faibles par profession', () => {
  assert.ok(!/function pct\(/.test(app), 'ancien pct() (pourcentage d’un examen) supprimé');
  assert.ok(!app.includes("String(x).replace('.', ',')"), 'fr() passe par fmtNote');
  assert.ok(!/Annales vues|annales vues/.test(app), '« Questions vues » : le dénominateur compte les questions de transfert');
  assert.match(fnBody(app, 'function scoreOf('), /fmtScore\(a\.points, a\.max\)/);
  assert.match(app, /EC \$\{scoreOf\(r\.byProf\.EC\)\} · CAC \$\{scoreOf\(r\.byProf\.CAC\)\}/);
  const stats = fnBody(app, 'views.stats = () => {');
  assert.match(stats, /P\.tagStats\(state\.progress\.attempts, state\.byId\)\.rows/);
  assert.match(stats, /\(\$\{r\.prof\}\)/);
  assert.match(stats, /réussite récente/);
  assert.ok(!/Math\.round\([^)]*\* 100\)\s*\+\s*' %'|\} %`|' %'\)/.test(app), 'aucun pourcentage calculé en ligne');
  assert.ok(!/n \/ req\.length\)/.test(app), 'barre du plan : Math.max(1, req.length), pas de width:NaN%');
  assert.match(fnBody(app, 'function estimateCard('), /Math\.abs\(e\.qcm\.ec - e\.qcm\.cac\) >= 5/);
});

test('sigle unique LCB-FT dans les badges', () => {
  for (const f of ['js/gamify.js', 'js/catalog-data.js']) assert.ok(!/\bLAB\b/.test(read(f)), f);
});

test('format.js est précaché (CORE du service worker)', () => {
  assert.ok(read('sw.js').includes("'./js/format.js'"));
});
