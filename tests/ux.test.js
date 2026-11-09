// Revue 2026-11 (lot UX) : textes de l'interface, correction courte, réglages par défaut, typographie à l'affichage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const app = read('js/app.js');
const css = read('css/app.css');
const fnBody = (src, start) => { const i = src.indexOf(start); assert.ok(i >= 0, `introuvable : ${start}`); return src.slice(i, src.indexOf('\n}', i)); };
// Fonctions pures d'app.js (le module entier a besoin du DOM) : extraites entre leurs marqueurs.
const typoSrc = app.slice(app.indexOf('// typo:start'), app.indexOf('// typo:end'));
const { typo, typoHtml } = new Function(`${typoSrc}; return { typo, typoHtml };`)();

test('typo : apostrophes, espaces insécables, points de suspension ; idempotente', () => {
  assert.equal(typo("l'Ordre"), 'l’Ordre');
  assert.equal(typo("aujourd'hui"), 'aujourd’hui');
  assert.equal(typo('Réf. : L.821-9'), 'Réf. : L.821-9');
  assert.equal(typo('Vraiment ?'), 'Vraiment ?');
  assert.equal(typo('« secret »'), '« secret »');
  assert.equal(typo('etc...'), 'etc…');
  assert.equal(typo('10:30 https://x.fr'), '10:30 https://x.fr', 'aucune espace ajoutée là où il n’y en avait pas');
  const s = "« l'EC : oui ? »"; assert.equal(typo(typo(s)), typo(s));
  assert.equal(typo('5 &lt; 6'), '5 &lt; 6', 'entités HTML intactes');
});

test('typoHtml : le texte change, jamais les attributs', () => {
  const html = `<button data-x="l'a : b" title="a ?">l'EC : oui</button>`;
  assert.equal(typoHtml(html), `<button data-x="l'a : b" title="a ?">l’EC : oui</button>`);
  assert.match(app, /const inline = \(s\) => typoHtml\(inlineRaw\(s\)\);/);
  assert.match(app, /const renderMarkdown = \(src\) => typoHtml\(renderMarkdownRaw\(src\)\);/);
  assert.match(app, /const esc = \(s\) => typo\(/);
  // Saisies de l'utilisateur : jamais retouchées (escA).
  assert.match(app, /value="\$\{escA\(state\.glQuery\)\}"/);
  assert.match(app, /<textarea id="ans"[^>]*>\$\{escA\(ex\.answers/);
});

test('correction QCM courte : « Bonne réponse », « Pourquoi ? » ouvert après une erreur, références dans le même bloc', () => {
  const qcm = fnBody(app, 'function renderQcm(');
  assert.ok(!/model_answer/.test(qcm), 'la réponse type (format QRC) n’est plus affichée après un QCM');
  assert.match(qcm, /Bonne réponse : <strong>\$\{good\}<\/strong>/);
  assert.match(qcm, /qExplain\(q, \{ open: !ok \}\)/);
  const ex = fnBody(app, 'function qExplain(');
  assert.match(ex, /<details class="explain why" \$\{open \? 'open' : ''\}><summary>Pourquoi \?<\/summary>/);
  assert.match(ex, /<div class="ref">\$\{esc\(q\.reference\)\}/);
  assert.ok(!/<summary>Références<\/summary>/.test(ex), 'plus de bloc « Références » séparé : redite avec « Pourquoi ? »');
  assert.match(fnBody(app, 'function renderQrc('), /model_answer/, 'la réponse type reste en QRC');
  assert.match(app, /sticky-next" id="next">Question suivante/);
  assert.match(css, /\.sticky-next \{ position: sticky;/);
});

test('qHeader : pastilles « Droit mis à jour » et « Réponse modifiée », badge « confiance moyenne » retiré, review_note jamais affiché', () => {
  const h = fnBody(app, 'function qHeader(');
  assert.match(h, /q\.answer_changed \?/);
  assert.match(h, /Droit mis à jour/);
  assert.match(h, /Réponse modifiée/);
  assert.ok(!/confiance moyenne/.test(app));
  assert.ok(!/\.review_note|\['review_note'\]|review_note\s*\}/.test(app), 'review_note n’est lu nulle part dans l’interface');
  assert.match(h, /settings\.qTimer !== false/, 'chrono désactivable');
});

test('certitude : « Je devine », expliquée au premier usage', () => {
  assert.match(app, /\[0, 'Je devine'\]/);
  assert.ok(!/'Au hasard'/.test(app));
  assert.match(fnBody(app, 'const certRow = '), /certHelpSeen/);
});

test('corrigé d’examen : filtre « Erreurs » par défaut, refaire ses erreurs, tout ajouter au carnet, corrigés repliés', () => {
  const r = fnBody(app, 'function renderExamResult(');
  assert.match(r, /er\.filter \|\| \(wrong\.length \? 'ko' : 'all'\)/);
  assert.match(r, /id="ex-redo"/);
  assert.match(r, /id="ex-carnet"/);
  assert.match(r, /<details class="card ex-row"/);
  assert.match(css, /\.ex-filter \{ position: sticky;/);
});

test('plan du jour : pas de tâche vide, numérotation continue, temps disponible, plan de survie', () => {
  const t = fnBody(app, 'function dayTasks(');
  assert.match(t, /if \(d\.target \|\| due \|\| \(pr\.lastSession \|\| 0\) >= t0\)/, 'séance sans question : pas de tâche cochée « faite »');
  assert.match(t, /if \(d\.sure0 > 0\)/);
  assert.match(t, /budgetTasks\(tasks, pr\.settings\.dayMinutes\)/);
  assert.match(t, /SURVIVAL_READS/);
  assert.ok(!/Regroupé aujourd’hui|\(regroupé/.test(app), 'jargon « regroupé » retiré');
  assert.ok(!/x\.optional \? '\+' : i \+ 1/.test(app), 'numéro = rang parmi les tâches restantes');
  const budget = new Function(`${fnBody(app, 'function budgetTasks(')}\n}; return budgetTasks;`)();
  const tasks = budget([{ id: 'a', est: 10 }, { id: 'b', est: 25, done: true }, { id: 'c', est: 10 }, { id: 'd', est: 20 }], 15);
  assert.deepEqual(tasks.map((x) => !!x.optional), [false, false, true, true]);
  const nums = new Function(`${fnBody(app, 'function taskNumbers(')}\n}; return taskNumbers;`)();
  const list = [{ done: true }, {}, { optional: true }, {}];
  const m = nums(list); assert.equal(m.get(list[1]), 1); assert.equal(m.get(list[3]), 2);
});

test('Réviser vide : « Rien à réviser pour l’instant » et deux actions, jamais « 0 cartes revues »', () => {
  const r = fnBody(app, 'views.review = () => {');
  assert.match(r, /Rien à réviser pour l’instant/);
  assert.match(r, /Faire 20 questions/);
  assert.match(r, /Voir mon plan/);
  assert.ok(!/cartes revues|Session terminée/.test(app));
});

test('premier lancement : date demandée, pas imposée ; QCM en deux touchers', async () => {
  const store = await import('../js/store.js');
  const s = store.defaultState().settings;
  assert.equal(s.examDate, ''); assert.equal(s.hideChoices, false); assert.equal(s.confidence, false);
  assert.match(fnBody(app, 'function examAskCard('), /Quand est votre épreuve \?/);
});

test('navigation : « ← Plus » en tête des vues de Plus, libellé « Glossaire » visible, en-tête qui passe à la ligne', () => {
  assert.match(fnBody(app, 'function backBar('), /← \$\{home \? 'Accueil' : 'Plus'\}/);
  assert.match(app, /main\.innerHTML = backBar\(\) \+ views\[state\.view\]\(\);/);
  assert.ok(!/vh-back/.test(app), 'plus de « ← Plus » en bas de la ville');
  const html = read('index.html');
  assert.match(html, /<span class="hbtn-l">Glossaire<\/span>/);
  assert.match(css, /header\.top \{ flex-wrap: wrap;/);
  assert.match(css, /@media \(max-width: 480px\) \{ header\.top \.sub \{ display: none; \} \}/);
});

test('contraste et cibles tactiles : orange des boutons foncé, 44 px au moins', () => {
  assert.match(css, /--primary-btn: #d63a0a/);
  assert.ok(!/--primary-btn: #ff4d1c/.test(css));
  assert.match(css, /--muted: #5b6b82/);
  assert.match(css, /button\.btn\.sm, a\.btn\.sm \{ min-height: 44px; \}/);
  assert.match(css, /\.chip \{ min-height: 44px;/);
  assert.match(css, /input\[type="checkbox"\] \{ width: 22px; height: 22px;/);
  // Luminance relative : blanc sur #d63a0a ≥ 4,5:1.
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  for (const bg of ['#d63a0a', '#c4501f']) assert.ok(1.05 / (lum(bg) + 0.05) >= 4.5, bg);
});

test('nom de l’application : « Épreuve 1 du DEC », plus de « UE1 »', () => {
  for (const f of ['manifest.webmanifest', 'index.html', 'css/app.css', 'js/app.js']) assert.ok(!/UE1/.test(read(f)), f);
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.match(m.name, /Épreuve 1/);
});

test('build_bank.py --check : date de génération, avertissements de longueur (jamais un échec)', () => {
  const src = read('scripts/build_bank.py');
  assert.match(src, /out\["generatedAt"\] = build_date\(current, out\)/);
  assert.match(src, /MAX_EXPLANATION = 350/);
  assert.match(src, /MAX_LONGEST_SHARE = 0\.40/);
  assert.match(src, /review_note/);
  assert.match(src, /answer_changed/);
  const out = (() => { try { return execFileSync('python3', ['-I', 'scripts/build_bank.py', '--check'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } })();
  assert.ok(!/^ERREUR:/m.test(out), out.split('\n').filter((l) => l.startsWith('ERREUR')).join('\n'));
});
