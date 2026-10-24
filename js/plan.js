// Parcours guidé pour démarrer de zéro : étapes dans l'ordre d'étude, avec les schémas à lire
// et, pour chaque étape, les questions qui s'y rattachent (index des fiches). Logique pure.

// kind 'schema' : lire les schémas, puis les questions rattachées arrivent en nouvelles cartes.
// kind 'action' : étape sans contenu à lire (examen blanc, révision des points faibles).
export const STEPS = [
  { id: 'cadre', kind: 'schema', title: 'Le cadre normatif et les niveaux d’assurance', who: 'EC', when: 'J-18 à J-17', fiches: ['10-schema-cadre-normatif.md', '11-schema-niveaux-assurance.md'], deep: ['01-ec-exercice.md'] },
  { id: 'institutions', kind: 'schema', title: 'Les institutions : Ordre, H2A, CNCC', who: 'EC + CAC', when: 'J-16', fiches: ['12-schema-institutions-ec-cac.md'], deep: ['05-cac-exercice.md'] },
  { id: 'activites', kind: 'schema', title: 'Activités permises, sociétés, publicité', who: 'EC', when: 'J-15', fiches: ['19-schema-activites-societes.md'], deep: ['01-ec-exercice.md', '02-ec-deontologie.md'] },
  { id: 'lettre', kind: 'schema', title: 'Lettre de mission, honoraires, reprise de dossier', who: 'EC + CAC', when: 'J-15', fiches: ['18-schema-lettre-mission-honoraires.md'], deep: ['01-ec-exercice.md'] },
  { id: 'mandat', kind: 'schema', title: 'Le mandat du commissaire aux comptes', who: 'CAC', when: 'J-14 à J-13', fiches: ['14-schema-mandat-cac.md'], deep: ['05-cac-exercice.md'] },
  { id: 'independance', kind: 'schema', title: 'L’indépendance du CAC', who: 'CAC', when: 'J-12 à J-11', fiches: ['16-schema-independance-cac.md'], deep: ['06-cac-deontologie.md'] },
  { id: 'secret', kind: 'schema', title: 'Secret professionnel et signalements', who: 'EC + CAC', when: 'J-10', fiches: ['17-schema-secret-signalements.md'], deep: ['02-ec-deontologie.md', '06-cac-deontologie.md'] },
  { id: 'discipline', kind: 'schema', title: 'Discipline et sanctions', who: 'EC + CAC', when: 'J-9', fiches: ['13-schema-discipline.md'], deep: ['04-ec-responsabilite.md', '08-cac-responsabilite.md'] },
  { id: 'controle', kind: 'schema', title: 'Contrôle de qualité et contrôle d’activité', who: 'EC + CAC', when: 'J-8', fiches: ['20-schema-controle-qualite.md'], deep: ['03-ec-controle-qualite.md', '07-cac-controle-activite.md'] },
  { id: 'responsabilites', kind: 'schema', title: 'Les quatre responsabilités', who: 'EC + CAC', when: 'J-7', fiches: ['21-schema-responsabilites.md'], deep: ['04-ec-responsabilite.md', '08-cac-responsabilite.md'] },
  { id: 'chiffres', kind: 'schema', title: 'Les chiffres à connaître par cœur', who: 'EC + CAC', when: 'J-6 à J-5', fiches: ['15-schema-chiffres-cles.md'], deep: [] },
  { id: 'blanc-qcm', kind: 'action', title: 'Premier examen blanc en QCM', when: 'J-4', action: 'exam', hint: 'Les QCM rédigés par IA flattent la note : sous 12, travaillez ; au-dessus, restez prudent.' },
  { id: 'blanc-qrc', kind: 'action', title: 'Examen blanc en réponses courtes (QRC)', when: 'J-3', action: 'exam', hint: 'Le test le plus fiable : il oblige à produire la réponse.' },
  { id: 'faibles', kind: 'action', title: 'Reprendre mes points faibles', when: 'J-2', action: 'weak', hint: 'Statistiques, puis « Mes 20 questions les plus ratées ».' },
  { id: 'veille', kind: 'action', title: 'Veille : cartes dues uniquement', when: 'J-1', action: 'review', hint: 'Rien de nouveau. Relire ses erreurs, dormir.' },
];

export const stepById = (id) => STEPS.find((s) => s.id === id);

// Indice de l'étape en cours : celle choisie (focus) si elle n'est pas terminée, sinon la première non terminée.
export function currentIndex(plan = {}) {
  const done = plan.done || {};
  const f = STEPS.findIndex((s) => s.id === plan.focus);
  if (f >= 0 && !done[STEPS[f].id]) return f;
  const i = STEPS.findIndex((s) => !done[s.id]);
  return i < 0 ? STEPS.length : i;
}

// Identifiants des questions rattachées à une étape (selon l'index des fiches).
export function stepQuestionIds(step, fichesIndex) {
  const out = [];
  const seen = new Set();
  for (const file of step.fiches || []) {
    const f = fichesIndex.find((x) => x.file === file);
    for (const id of (f && f.questions) || []) if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

// Ordre de priorité des nouvelles cartes : étape en cours, puis les suivantes, puis les étapes terminées.
export function priorityIds(plan, fichesIndex) {
  const cur = currentIndex(plan);
  const order = [...STEPS.slice(cur), ...STEPS.slice(0, cur)];
  const out = [];
  const seen = new Set();
  for (const step of order) {
    if (step.kind !== 'schema') continue;
    for (const id of stepQuestionIds(step, fichesIndex)) if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

// Avancement d'une étape : questions vues et acquises (maîtrise ≥ 2), d'après les cartes SRS.
export function stepProgress(step, fichesIndex, cards, masteryFn) {
  const ids = stepQuestionIds(step, fichesIndex);
  let seen = 0; let known = 0;
  for (const id of ids) {
    const c = cards[id];
    if (c) { seen++; if (masteryFn(c) >= 2) known++; }
  }
  return { total: ids.length, seen, known };
}

// ---------- Plan jour par jour jusqu'à l'épreuve ----------
// Recalculé chaque matin sur ce qui reste : les étapes non terminées sont réparties sur les jours d'étude,
// les quatre derniers jours sont fixes (examen QCM, examen QRC, points faibles, veille).
const dnum = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const dkey = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const daysUntil = (today, exam) => dnum(exam) - dnum(today);
export const GAME_ROTATION = ['duel', 'vf', 'arbre', 'chiffres', 'palais'];
const FINAL = { 4: { kind: 'blanc', exam: 'qcm' }, 3: { kind: 'blanc', exam: 'qrc' }, 2: { kind: 'faibles' }, 1: { kind: 'veille' } };

// undone : identifiants des étapes « schéma » restantes, dans l'ordre. Renvoie un jour par date, d'aujourd'hui à J-1.
export function schedule(today, exam, undone) {
  const n0 = daysUntil(today, exam);
  if (n0 <= 0) return [{ key: today, n: n0, kind: n0 === 0 ? 'jour-j' : 'apres', steps: [], exam: null }];
  const days = []; let rest = [...undone];
  for (let n = n0; n >= 1; n--) {
    const key = dkey(dnum(today) + (n0 - n));
    if (FINAL[n]) { days.push({ key, n, steps: [], exam: null, ...FINAL[n] }); continue; }
    const studyLeft = n - 4;
    const k = rest.length ? Math.ceil(rest.length / studyLeft) : 0;
    const steps = rest.slice(0, k); rest = rest.slice(k);
    // Examens blancs intermédiaires : J-10 en QCM, J-7 en QRC (puis J-4 et J-3, ci-dessus).
    const exam = n === 10 ? 'qcm' : n === 7 ? 'qrc' : null;
    days.push({ key, n, kind: steps.length ? 'etude' : 'consolidation', steps, exam });
  }
  return days;
}

// Nouvelles cartes à voir aujourd'hui pour avoir tout vu à J-3 ; moins quand beaucoup de cartes attendent.
export function newTarget(unseen, n, minPerDay = 20, dueNow = 0) {
  if (n <= 2 || unseen <= 0) return 0;
  let t = Math.max(minPerDay, Math.ceil(unseen / Math.max(1, n - 3)));
  if (dueNow > 60) t = Math.ceil(t / 2);
  return Math.min(unseen, t);
}

// Réussite par sous-thème (tags) : faiblesses (au moins 3 réponses) et points forts (85 % et plus sur 5 réponses).
export function tagStats(attempts, byId) {
  const m = {};
  for (const a of attempts) {
    const q = byId[a.id]; if (!q) continue;
    for (const t of q.tags) { const k = `${q.profession}:${t}`; m[k] = m[k] || { ok: 0, n: 0 }; m[k].n++; if (a.ok) m[k].ok++; }
  }
  const rows = Object.entries(m).map(([k, v]) => ({ k, prof: k.split(':')[0], tag: k.split(':')[1], ...v, acc: v.ok / v.n }));
  const weak = rows.filter((r) => r.n >= 3 && r.acc < 0.7).sort((a, b) => a.acc - b.acc || b.n - a.n);
  const strong = rows.filter((r) => r.n >= 5 && r.acc >= 0.85).sort((a, b) => b.acc - a.acc);
  return { rows, weak, strong, byKey: m };
}

// Priorité d'une nouvelle carte : notion souvent posée, sous-thème faible en tête, point fort en retrait.
export function adaptiveWeight(q, ts, siblingsCount) {
  let w = siblingsCount;
  for (const t of q.tags) {
    const v = ts.byKey[`${q.profession}:${t}`]; if (!v || v.n < 3) continue;
    const acc = v.ok / v.n;
    if (acc < 0.7) w += 3 * (1 - acc) * 2;
    else if (v.n >= 5 && acc >= 0.85) w -= 2;
  }
  return w;
}

// Jeu du jour : celui où l'on se trompe le plus (au moins 5 réponses), sinon la rotation.
export function gameOfDay(today, drills) {
  const pre = { duel: 'duel:', vf: 'vf:', arbre: 'arb:', chiffres: 'num:', palais: 'pal:' };
  const acc = {};
  for (const [id, m] of Object.entries(drills || {})) {
    const k = Object.keys(pre).find((x) => id.startsWith(pre[x])); if (!k) continue;
    acc[k] = acc[k] || { ok: 0, n: 0 }; acc[k].ok += m.ok; acc[k].n += m.n;
  }
  const worst = Object.entries(acc).filter(([, v]) => v.n >= 5 && v.ok / v.n < 0.75).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
  return worst ? worst[0] : GAME_ROTATION[dnum(today) % GAME_ROTATION.length];
}
