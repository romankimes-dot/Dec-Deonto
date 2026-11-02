// Synchronisation en ligne de la progression, via un Worker Cloudflare personnel (cloudflare/worker.js).
// Le serveur garde une seule copie ; chaque appareil la lit, la fusionne avec la sienne et renvoie le résultat.
// La fusion ne perd rien de ce qui a été appris d'un côté ou de l'autre : pour chaque carte et chaque item de jeu,
// la révision la plus récente l'emporte ; réponses, examens, badges et schémas lus sont réunis. Réglages : ceux
// modifiés en dernier (settingsAt). L'adresse et le code secret restent sur l'appareil, hors de l'export.
import { importJSON } from './store.js';
import { mergeStats } from './gamify.js';

const CFG_KEY = 'dec1.sync';
const STATUS_KEY = 'dec1.sync.status';

const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeJSON = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// { url, token } ou null
export function config() {
  const c = readJSON(CFG_KEY);
  return c && typeof c.url === 'string' && typeof c.token === 'string' && c.url && c.token ? c : null;
}
// Adresse du Worker : https obligatoire (le code secret circule dans l'en-tête), sans / final.
export function normalizeUrl(u) {
  const s = String(u || '').trim().replace(/\/+$/, '').replace(/\/progress$/, '');
  try { const x = new URL(s); return x.protocol === 'https:' ? s : null; } catch { return null; }
}
export function setConfig(c) {
  if (!c) { writeJSON(STATUS_KEY, null); return writeJSON(CFG_KEY, null); }
  const url = normalizeUrl(c.url); const token = String(c.token || '').trim();
  if (!url || !token) return false;
  return writeJSON(CFG_KEY, { url, token });
}
// { at (dernière synchro réussie), error }
export function status() { return readJSON(STATUS_KEY) || { at: 0, error: null }; }
export function setStatus(s) { writeJSON(STATUS_KEY, { ...status(), ...s }); }

// ---------- Fusion ----------
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const obj = (v) => (isObj(v) ? v : {});
const nCards = (s) => Object.keys(obj(s.cards)).length;

// Par identifiant : l'entrée la plus récente (champ `last`), celle de `a` à égalité.
function byLast(a, b) {
  const out = { ...obj(a) };
  for (const [id, v] of Object.entries(obj(b))) { const u = out[id]; if (!isObj(u) || (isObj(v) && num(v.last) > num(u.last))) out[id] = v; }
  return out;
}
// Union de dates (nombres ou textes) : la première l'emporte (date de déblocage, première lecture).
function unionMin(a, b) {
  const out = { ...obj(a) };
  for (const [k, v] of Object.entries(obj(b))) if (!(k in out) || (v && out[k] && v < out[k])) out[k] = v;
  return out;
}
function unionMax(a, b) {
  const out = { ...obj(a) };
  for (const [k, v] of Object.entries(obj(b))) if (!(k in out) || num(v) > num(out[k])) out[k] = v;
  return out;
}
function unionList(a, b, key, limit = Infinity) {
  const seen = new Map();
  for (const x of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) if (isObj(x) && !seen.has(key(x))) seen.set(key(x), x);
  const all = [...seen.values()].sort((x, y) => num(x.t) - num(y.t));
  return all.length > limit ? all.slice(-limit) : all;
}
function mergePodcasts(a, b) {
  const out = { ...obj(a) };
  for (const [id, v] of Object.entries(obj(b))) {
    const u = out[id];
    if (!isObj(u)) { out[id] = v; continue; }
    if (!isObj(v)) continue;
    const r = num(v.t) > num(u.t) ? { ...v } : { ...u };
    if (u.done || v.done) r.done = true;
    out[id] = r;
  }
  return out;
}

// Fusionne deux progressions. `local` l'emporte à égalité ; ni l'une ni l'autre n'est modifiée.
export function merge(local, remote) {
  if (!isObj(remote)) return local;
  if (!isObj(local)) return remote;
  // n : la plus récemment modifiée ; o : l'autre
  const [n, o] = num(remote.updatedAt) > num(local.updatedAt) ? [remote, local] : [local, remote];
  // Réglages : ceux modifiés en dernier ; jamais modifiés des deux côtés : ceux de l'appareil le plus avancé
  // (un appareil neuf ne remplace pas la date d'examen saisie sur l'autre).
  const sa = num(local.settingsAt); const sb = num(remote.settingsAt);
  const settingsFrom = sa !== sb ? (sb > sa ? remote : local) : (nCards(remote) > nCards(local) ? remote : local);
  let stats = n.stats || o.stats || null;
  if (isObj(n.stats) && isObj(o.stats) && n.stats.v === o.stats.v) stats = mergeStats(JSON.parse(JSON.stringify(n.stats)), o.stats);
  const pn = obj(n.plan); const po = obj(o.plan);
  const starts = [pn.start, po.start].filter((x) => typeof x === 'string').sort();
  const plan = { ...po, ...pn, done: unionMin(pn.done, po.done), read: unionMax(pn.read, po.read), unread: unionMax(pn.unread, po.unread) };
  if (starts.length) plan.start = starts[0];
  const dn = n.daily; const dd = o.daily;
  const daily = isObj(dn) && isObj(dd) ? (String(dd.day || '') > String(dn.day || '') ? dd : dn) : (dn || dd || null);
  return {
    ...o, ...n,
    updatedAt: Math.max(num(local.updatedAt), num(remote.updatedAt)),
    settingsAt: Math.max(sa, sb),
    settings: { ...obj(settingsFrom.settings) },
    cards: byLast(n.cards, o.cards),
    attempts: unionList(n.attempts, o.attempts, (x) => `${x.t}|${x.id}|${x.mode}`, 400),
    examSeen: unionMax(n.examSeen, o.examSeen),
    exams: unionList(n.exams, o.exams, (x) => String(x.t)),
    lastSession: Math.max(num(n.lastSession), num(o.lastSession)) || null,
    stats,
    badges: unionMin(n.badges, o.badges),
    grades: unionMin(n.grades, o.grades),
    seenAnecdotes: unionMin(n.seenAnecdotes, o.seenAnecdotes),
    lastExportAt: Math.max(num(n.lastExportAt), num(o.lastExportAt)),
    plan,
    drills: byLast(n.drills, o.drills),
    games: { ...obj(o.games), ...obj(n.games), best: unionMax(obj(n.games).best, obj(o.games).best) },
    podcasts: mergePodcasts(n.podcasts, o.podcasts),
    daily,
  };
}

// Comparaison indépendante de l'ordre des clés
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}
export const same = (a, b) => stable(a) === stable(b);

// ---------- Échanges avec le serveur ----------
async function call(f, url, opts, timeout) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null;
  try { return await f(url, { ...opts, cache: 'no-store', signal: ctl?.signal }); } catch { throw new Error('serveur injoignable (hors ligne ou adresse incorrecte)'); } finally { clearTimeout(timer); }
}
function fail(res) {
  if (res.status === 401) return new Error('code secret refusé');
  if (res.status === 404) return new Error('adresse incorrecte (Worker introuvable)');
  return new Error(`erreur du serveur (${res.status})`);
}

// Lit la copie en ligne, la fusionne avec `local`, renvoie le résultat au serveur s'il diffère.
// → { state (fusion), changed (diffère de local), pushed }
export async function syncOnce(cfg, local, { fetch: f = globalThis.fetch, timeout = 15000 } = {}) {
  const url = `${cfg.url}/progress`;
  const headers = { Authorization: `Bearer ${cfg.token}` };
  const res = await call(f, url, { headers }, timeout);
  let remote = null;
  if (res.status === 200) {
    const text = await res.text();
    try { remote = importJSON(text); } catch (e) { throw new Error(`copie en ligne illisible (${e.message}) : rien n’a été écrasé`); }
  } else if (res.status === 204 || (res.status === 404 && res.headers.get('X-Dec1-Empty') === '1')) {
    remote = null; // serveur vide : premier envoi
  } else throw fail(res);
  const merged = remote ? merge(local, remote) : local;
  let pushed = false;
  if (!remote || !same(merged, remote)) {
    const put = await call(f, url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(merged) }, timeout);
    if (!put.ok) throw fail(put);
    pushed = true;
  }
  return { state: merged, changed: !same(merged, local), pushed };
}

// Plan du jour déposé pour Ernest (casier /pont/<src>), envoyé seulement s'il a changé depuis le dernier envoi.
// Une tâche déjà déposée comme faite (par un autre appareil) reste faite : un appareil en retard ne la décoche pas.
const PONT_KEY = 'dec1.sync.pont';
export async function pushPont(cfg, payload, { fetch: f = globalThis.fetch, timeout = 15000 } = {}) {
  let last0 = null; try { last0 = localStorage.getItem(PONT_KEY); } catch { /* ignore */ }
  if (last0 === JSON.stringify(payload)) return false;
  try {
    const cur = await call(f, `${cfg.url}/pont/${encodeURIComponent(payload.src)}`, { headers: { Authorization: `Bearer ${cfg.token}` } }, timeout);
    if (cur.status === 200) {
      const prev = await cur.json();
      const done = new Set((prev && Array.isArray(prev.things) ? prev.things : []).filter((t) => t && t.done === true).map((t) => `${t.day}|${t.title}`));
      if (done.size) payload = { ...payload, things: payload.things.map((t) => (!t.done && done.has(`${t.day}|${t.title}`) ? { ...t, done: true } : t)) };
    }
  } catch { /* lecture impossible : on dépose tel quel */ }
  const body = JSON.stringify(payload);
  let last = null; try { last = localStorage.getItem(PONT_KEY); } catch { /* ignore */ }
  if (last === body) return false;
  const res = await call(f, `${cfg.url}/pont/${encodeURIComponent(payload.src)}`, { method: 'PUT', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body }, timeout);
  if (!res.ok) throw fail(res);
  try { localStorage.setItem(PONT_KEY, body); } catch { /* ignore */ }
  return true;
}
