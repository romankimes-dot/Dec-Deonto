// Répétition des jeux (Duel, Vrai/Faux, Chiffres, Arbres, Palais) : boîtes de Leitner sur des items courts.
// Logique pure. memo : id -> { box, due, ok, n, last }.
import { DAY, capToExam } from './srs.js';

// Intervalle (jours) par boîte ; boîte 0 = à revoir dans la séance suivante.
export const BOX_DAYS = [0, 1, 2, 4, 8];

export function recordDrill(memo, id, ok, now = Date.now(), examAt = null) {
  const m = memo[id] || { box: 0, due: now, ok: 0, n: 0, last: null };
  const box = ok ? Math.min(BOX_DAYS.length - 1, (m.n ? m.box : 0) + 1) : 0;
  const days = BOX_DAYS[box];
  const due = days ? now + capToExam(days, now, examAt) * DAY : now + 10 * 60 * 1000;
  memo[id] = { box, due, ok: m.ok + (ok ? 1 : 0), n: m.n + 1, last: now };
  return memo[id];
}

// Tirage d'une série : items dus (les plus en retard d'abord), puis jamais vus, puis les autres par échéance.
// Dus et nouveaux sont entremêlés pour varier. rnd : générateur [0, 1[ (mélange des nouveaux).
export function pickDrill(items, memo, n, now = Date.now(), rnd = Math.random) {
  const due = []; const fresh = []; const later = [];
  for (const it of items) {
    const m = memo[it.id];
    if (!m) fresh.push(it);
    else if (m.due <= now) due.push(it);
    else later.push(it);
  }
  due.sort((a, b) => memo[a.id].due - memo[b.id].due);
  const shuffled = fresh.map((it) => ({ it, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.it);
  later.sort((a, b) => memo[a.id].due - memo[b.id].due);
  const out = [];
  while (out.length < n && (due.length || shuffled.length)) {
    if (due.length) out.push(due.shift());
    if (out.length < n && shuffled.length) out.push(shuffled.shift());
  }
  while (out.length < n && later.length) out.push(later.shift());
  return out;
}

export function drillStats(items, memo, now = Date.now()) {
  let seen = 0, due = 0, known = 0;
  for (const it of items) {
    const m = memo[it.id]; if (!m) continue;
    seen++; if (m.due <= now) due++; if (m.box >= 3) known++;
  }
  return { total: items.length, seen, due, known };
}

// Hachage court et stable (identifiants d'items tirés du texte des fiches).
export function hashId(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
