// Persistance locale (localStorage) + export/import JSON.
const KEY = 'dec1.progress.v1';

export const defaultState = () => ({
  version: 1,
  settings: { newPerDay: 20, mode: 'mixte', showLowConfidence: true, examDate: '2026-11-10T10:30:00' },
  cards: {},          // id -> carte SRS
  attempts: [],       // { id, ok, mode, t }  (200 derniers)
  examSeen: {},       // id -> timestamp
  exams: [],          // { t, mode, note, byProf, byTheme, ids, durationMs }
  lastSession: null,
  stats: null,        // statistiques agrégées de gamification (recalculées si absentes)
  badges: {},         // id -> date de déblocage
  grades: {},         // n° de grade -> date
  seenAnecdotes: {},  // anecdotes déjà montrées en carte-souvenir
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return { ...defaultState(), ...s, settings: { ...defaultState().settings, ...(s.settings || {}) } };
  } catch {
    return defaultState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return defaultState();
}

export function exportJSON(state) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'dec1', ...state }, null, 2);
}

export function importJSON(text) {
  const s = JSON.parse(text);
  if (!s || typeof s !== 'object' || !s.cards) throw new Error('Fichier non reconnu');
  const { exportedAt, app, ...rest } = s;
  return { ...defaultState(), ...rest };
}

export function pushAttempt(state, attempt) {
  state.attempts.push(attempt);
  if (state.attempts.length > 400) state.attempts = state.attempts.slice(-400);
}
