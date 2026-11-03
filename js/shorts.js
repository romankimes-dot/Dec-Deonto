// Shorts : fil vertical de courtes animations, chacune suivie d'une question. Logique pure.
// Un fichier par étape du parcours : data/shorts/<étape>.json (format : data/SHORTS.md).
// La réponse à la question passe par la répétition des jeux (drill.js), sous l'identifiant « sht:<id> ».
import { plain } from './games.js';

export const TYPES = ['duel', 'chiffre', 'liste', 'cas', 'vf'];
export const PREFIX = 'sht:';
export const memoId = (s) => PREFIX + s.id;

// Longueurs maximales (caractères, sans le gras) : un short tient sur un écran de téléphone.
const MAX = { title: 40, q: 120, main: 48, det: 150, trap: 120, big: 18, label: 90, k: 34, v: 100, situation: 280, statement: 170, choice: 90, why: 240 };

// Texte comparable : sans gras ni pastilles, apostrophes et espaces normalisées, en minuscules.
export const norm = (s) => plain(s).replace(/[’‘]/g, "'").replace(/[«»"]/g, '').replace(/ | /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// Erreurs d'un short (liste vide = valide). ctx : { step, tags: Set, fiches: { fichier: texte } }.
export function validateShort(s, ctx) {
  const err = [];
  const str = (k, v, max, req = true) => {
    if (v === undefined || v === null || v === '') { if (req) err.push(`${k} manquant`); return; }
    if (typeof v !== 'string') { err.push(`${k} : texte attendu`); return; }
    if (plain(v).length > max) err.push(`${k} trop long (${plain(v).length} > ${max})`);
  };
  if (!s || typeof s !== 'object') return ['short invalide'];
  if (typeof s.id !== 'string' || !s.id.startsWith(`${ctx.step}-`)) err.push(`id « ${s.id} » : doit commencer par « ${ctx.step}- »`);
  if (!TYPES.includes(s.type)) err.push(`type « ${s.type} » inconnu`);
  if (!['EC', 'CAC', 'EC+CAC'].includes(s.prof)) err.push('prof : EC, CAC ou EC+CAC');
  if (!Array.isArray(s.tags) || !s.tags.length) err.push('tags manquants');
  else for (const t of s.tags) if (!ctx.tags.has(t)) err.push(`tag « ${t} » absent de la banque`);
  const fiche = ctx.fiches[s.fiche];
  if (!fiche) err.push(`fiche « ${s.fiche} » introuvable`);
  str('title', s.title, MAX.title);
  if (s.type === 'duel') {
    str('q', s.q, MAX.q);
    for (const side of ['ec', 'cac']) { str(`${side}.main`, s[side]?.main, MAX.main); str(`${side}.det`, s[side]?.det, MAX.det); }
    str('trap', s.trap, MAX.trap, false);
  } else if (s.type === 'chiffre') {
    str('big', s.big, MAX.big); str('label', s.label, MAX.label); str('det', s.det, MAX.det, false); str('trap', s.trap, MAX.trap, false);
  } else if (s.type === 'liste') {
    str('q', s.q, MAX.q);
    if (!Array.isArray(s.items) || s.items.length < 2 || s.items.length > 5) err.push('items : 2 à 5');
    else s.items.forEach((it, i) => { str(`items[${i}].k`, it?.k, MAX.k); str(`items[${i}].v`, it?.v, MAX.v, false); });
    str('trap', s.trap, MAX.trap, false);
  } else if (s.type === 'cas') {
    str('situation', s.situation, MAX.situation);
  } else if (s.type === 'vf') {
    str('statement', s.statement, MAX.statement);
    if (typeof s.verdict !== 'boolean') err.push('verdict : true ou false');
    str('why', s.why, MAX.why);
  }
  if (s.type !== 'vf') {
    const qz = s.quiz;
    if (!qz || typeof qz !== 'object') err.push('quiz manquant');
    else {
      str('quiz.q', qz.q, MAX.q);
      if (!Array.isArray(qz.choices) || qz.choices.length < 2 || qz.choices.length > 4) err.push('quiz.choices : 2 à 4');
      else {
        qz.choices.forEach((c, i) => str(`quiz.choices[${i}]`, c, MAX.choice));
        if (new Set(qz.choices.map(norm)).size !== qz.choices.length) err.push('quiz.choices : doublons');
        if (!Number.isInteger(qz.answer) || qz.answer < 0 || qz.answer >= qz.choices.length) err.push('quiz.answer hors des choix');
      }
      str('quiz.why', qz.why, MAX.why);
    }
  }
  // Ancrage : chaque extrait cité doit se trouver tel quel dans la fiche.
  if (!Array.isArray(s.src) || !s.src.length || s.src.length > 4) err.push('src : 1 à 4 extraits de la fiche');
  else if (fiche) {
    const body = norm(fiche);
    for (const x of s.src) if (typeof x !== 'string' || norm(x).length < 12 || !body.includes(norm(x))) err.push(`src introuvable dans la fiche : « ${String(x).slice(0, 60)} »`);
  }
  return err;
}

// ---------- Fil ----------
const tagKeys = (s) => {
  const profs = s.prof === 'EC+CAC' ? ['EC', 'CAC'] : [s.prof];
  return profs.flatMap((p) => s.tags.map((t) => `${p}:${t}`));
};

// Ordre du fil : à revoir (les plus en retard d'abord), entremêlés avec les jamais vus ; parmi ceux-ci,
// étapes ciblées (focus), puis sous-thèmes faibles, étape en cours et étapes faites, puis les suivantes ;
// enfin les autres, par échéance. Deux shorts de même format ne se suivent pas quand on peut l'éviter.
// opts : { steps: ordre des étapes, cur: indice de l'étape en cours, done: { étape: t }, focus: [étapes],
//          weak: Set('EC:tag'), served: Set(id), now, rnd }
export function buildFeed(shorts, memo, opts = {}) {
  const { steps = [], cur = 0, done = {}, focus = [], weak = new Set(), served = new Set(), now = Date.now(), rnd = Math.random } = opts;
  const pos = (s) => { const i = steps.indexOf(s.step); return i < 0 ? steps.length : i; };
  const due = []; const fresh = []; const later = [];
  for (const s of shorts) {
    if (served.has(s.id)) continue;
    const m = memo[memoId(s)];
    if (!m) fresh.push(s); else if (m.due <= now) due.push(s); else later.push(s);
  }
  due.sort((a, b) => memo[memoId(a)].due - memo[memoId(b)].due);
  const rank = (s) => {
    if (focus.includes(s.step)) return 0;
    if (tagKeys(s).some((k) => weak.has(k))) return 1;
    const p = pos(s);
    if (p === cur) return 2;
    if (done[s.step] || p < cur) return 3;
    return 4 + p;
  };
  const freshSorted = fresh.map((s) => ({ s, r: rank(s), x: rnd() })).sort((a, b) => a.r - b.r || a.x - b.x).map((x) => x.s);
  later.sort((a, b) => memo[memoId(a)].due - memo[memoId(b)].due);
  const out = [];
  while (due.length || freshSorted.length) {
    if (due.length) out.push(due.shift());
    if (freshSorted.length) out.push(freshSorted.shift());
  }
  return spreadTypes([...out, ...later]);
}

// Évite deux formats identiques à la suite : on avance le premier short d'un autre format, pris dans les 4 suivants.
export function spreadTypes(list) {
  const out = [...list];
  for (let i = 1; i < out.length; i++) {
    if (out[i].type !== out[i - 1].type) continue;
    const j = out.findIndex((s, k) => k > i && k <= i + 4 && s.type !== out[i - 1].type);
    if (j > 0) out.splice(i, 0, out.splice(j, 1)[0]);
  }
  return out;
}

// Questions de la banque rattachées à un short : celles de sa fiche et des schémas de son étape (files),
// de même profession, qui partagent un sous-thème.
export function linkedQuestions(s, fichesIndex, byId, files = []) {
  const keys = new Set(tagKeys(s));
  const ids = new Set([s.fiche, ...files].flatMap((file) => fichesIndex.find((x) => x.file === file)?.questions || []));
  return [...ids].filter((id) => { const q = byId[id]; return q && q.tags.some((t) => keys.has(`${q.profession}:${t}`)); });
}

// Avancement : vus, acquis (boîte ≥ 3), à revoir.
export function shortsStats(shorts, memo, now = Date.now()) {
  let seen = 0, known = 0, due = 0;
  for (const s of shorts) {
    const m = memo[memoId(s)]; if (!m) continue;
    seen++; if (m.box >= 3) known++; if (m.due <= now) due++;
  }
  return { total: shorts.length, seen, known, due };
}
