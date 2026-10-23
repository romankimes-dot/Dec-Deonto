// Persistance locale (localStorage), sauvegardes de secours, export/import JSON.
// Rien n'est jamais écrasé sans copie : texte illisible conservé, sauvegarde automatique,
// état précédent gardé avant un import ou un effacement.
const KEY = 'dec1.progress.v1';
const BACKUP_KEY = 'dec1.progress.backup';     // copie automatique du dernier état sain (au plus une toutes les 3 h)
const BACKUP_T_KEY = 'dec1.progress.backup.t';
const PREV_KEY = 'dec1.progress.prev';         // état avant un import ou un effacement
const CORRUPT_KEY = 'dec1.progress.corrupt';   // texte illisible, conservé tel quel
const EXAM_KEY = 'dec1.exam.v1';               // examen blanc en cours
const BACKUP_EVERY_MS = 3 * 60 * 60 * 1000;

export const defaultState = () => ({
  version: 1,
  settings: { newPerDay: 20, mode: 'mixte', showLowConfidence: true, examDate: '2026-11-10T10:30:00' },
  cards: {},          // id -> carte SRS
  attempts: [],       // { id, ok, mode, t }  (400 derniers)
  examSeen: {},       // id -> timestamp
  exams: [],          // { t, mode, note, byProf, byTheme, ids, durationMs }
  lastSession: null,
  stats: null,        // statistiques agrégées de gamification (recalculées si absentes)
  badges: {},         // id -> date de déblocage
  grades: {},         // n° de grade -> date
  seenAnecdotes: {},  // anecdotes déjà montrées en carte-souvenir
  lastExportAt: 0,    // dernier export de la progression
  plan: { done: {} }, // parcours guidé : étapes terminées, étape choisie
});

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const del = (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function hydrate(s) {
  const d = defaultState();
  return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, plan: { done: {}, ...(s.plan || {}) } };
}

// Texte JSON -> état valide, ou null.
function parseState(raw) {
  try {
    const s = JSON.parse(raw);
    return isObj(s) && isObj(s.cards) ? s : null;
  } catch { return null; }
}

// Messages à montrer au démarrage : { type: 'corrupt' | 'restored', at }
export const notices = [];

export function load() {
  const raw = get(KEY);
  if (raw) {
    const s = parseState(raw);
    if (s) return hydrate(s);
    set(CORRUPT_KEY, raw); // le texte illisible reste récupérable
    notices.push({ type: 'corrupt' });
  }
  const bak = parseState(get(BACKUP_KEY) || '');
  if (bak) {
    notices.push({ type: 'restored', at: Number(get(BACKUP_T_KEY)) || 0 });
    return hydrate(bak);
  }
  return defaultState();
}

export function save(state) {
  try {
    const now = Date.now();
    const prevRaw = get(KEY);
    if (prevRaw && now - (Number(get(BACKUP_T_KEY)) || 0) > BACKUP_EVERY_MS && parseState(prevRaw)) {
      set(BACKUP_KEY, prevRaw);
      set(BACKUP_T_KEY, String(now));
    }
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// État précédent (avant import ou effacement) : conservé pour pouvoir annuler.
export function snapshotPrev(state) {
  return set(PREV_KEY, JSON.stringify({ t: Date.now(), state }));
}

export function prevInfo() {
  try {
    const p = JSON.parse(get(PREV_KEY));
    return p && isObj(p.state) && isObj(p.state.cards) ? { t: p.t, cards: Object.keys(p.state.cards).length } : null;
  } catch { return null; }
}

export function restorePrev() {
  try {
    const p = JSON.parse(get(PREV_KEY));
    return p && isObj(p.state) && isObj(p.state.cards) ? hydrate(p.state) : null;
  } catch { return null; }
}

export function reset(state) {
  if (state) snapshotPrev(state);
  del(KEY); del(BACKUP_KEY); del(BACKUP_T_KEY); del(EXAM_KEY);
  return defaultState();
}

export function exportJSON(state) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'dec1', ...state }, null, 2);
}

export function importJSON(text) {
  let s;
  try { s = JSON.parse(text); } catch { throw new Error('texte JSON illisible'); }
  if (!isObj(s) || !isObj(s.cards)) throw new Error('fichier non reconnu');
  for (const k of ['attempts', 'exams']) if (s[k] != null && !Array.isArray(s[k])) throw new Error(`champ « ${k} » invalide`);
  for (const k of ['settings', 'examSeen', 'stats', 'badges', 'grades', 'seenAnecdotes', 'plan']) if (s[k] != null && !isObj(s[k])) throw new Error(`champ « ${k} » invalide`);
  for (const [id, c] of Object.entries(s.cards)) if (!isObj(c) || typeof c.due !== 'number') throw new Error(`carte « ${id} » invalide`);
  const { exportedAt, app, ...rest } = s;
  return hydrate(rest);
}

export function pushAttempt(state, attempt) {
  state.attempts.push(attempt);
  if (state.attempts.length > 400) state.attempts = state.attempts.slice(-400);
}

// Examen blanc en cours : repris après un rechargement ou un retour dans l'application.
export function saveExam(exam) {
  if (!exam) { del(EXAM_KEY); return; }
  set(EXAM_KEY, JSON.stringify(exam));
}

export function loadExam() {
  try {
    const raw = get(EXAM_KEY);
    if (!raw) return null;
    const e = JSON.parse(raw);
    const ok = isObj(e) && (e.mode === 'qcm' || e.mode === 'qrc') && Array.isArray(e.ids) && e.ids.length === 20
      && isObj(e.answers) && typeof e.endsAt === 'number' && typeof e.startedAt === 'number';
    return ok ? { grading: {}, current: 0, finished: false, ...e } : null;
  } catch { return null; }
}
