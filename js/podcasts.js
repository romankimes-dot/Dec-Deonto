// Podcasts (résumés audio NotebookLM) : état d'un épisode, épisode suggéré dans le plan du jour, plage
// d'une requête Range (service worker). Logique pure, sans DOM.

export const AUDIO_CACHE = 'dec1-audio';  // cache dédié, jamais purgé à la mise à jour de version (sw.js)
export const DONE_AT = 0.9;               // écouté à 90 %
export const SPEEDS = [1, 1.25, 1.5, 1.75];

// Disponible : fichier déposé et durée renseignée dans data/podcasts.json.
export const isAvailable = (ep) => !!(ep && ep.file && ep.duration > 0);

// État d'un épisode : 'soon' (bientôt disponible), 'new', 'progress' ou 'done', avec la part écoutée (0 à 1).
// prog : progress.podcasts[id] = { pos, done, t }.
export function episodeState(ep, prog) {
  if (!isAvailable(ep)) return { state: 'soon', ratio: 0 };
  if (prog?.done) return { state: 'done', ratio: 1 };
  const ratio = Math.max(0, Math.min(1, (Number(prog?.pos) || 0) / ep.duration));
  return { state: ratio > 0 ? 'progress' : 'new', ratio };
}

// Position à reprendre : la dernière position, sauf épisode terminé ou à moins de 5 s de la fin.
export function resumeAt(ep, prog) {
  const pos = Number(prog?.pos) || 0;
  if (!ep?.duration || prog?.done || pos >= ep.duration - 5) return 0;
  return Math.max(0, pos);
}

// Nouvelle position d'écoute : écouté à 90 % (définitif), position gardée.
export function updateProgress(prev, pos, duration, t = Date.now()) {
  const done = !!prev?.done || (duration > 0 && pos / duration >= DONE_AT);
  return { pos: Math.max(0, Math.round(pos)), done, t };
}

// « 12 min », « 1 h 05 », « 3:07 »
export function fmtDuration(sec) {
  if (!(sec > 0)) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}
export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function fmtSize(bytes) {
  if (!(bytes > 0)) return '';
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(bytes / 1e3))} ko`;
}

// Épisodes couvrant une étape.
export const episodesForStep = (episodes, stepId) => episodes.filter((ep) => (ep.steps || []).includes(stepId));

const dnum = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const dkey = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const prevDay = (key) => dkey(dnum(key) - 1);

// Les quatre dernières journées du plan correspondent aux étapes « action » (plan.js, FINAL).
const FINAL_STEP = { 4: 'blanc-qcm', 3: 'blanc-qrc', 2: 'faibles', 1: 'veille' };

// Étapes étudiées la veille : terminées hier (plan.done), prévues hier (plan.sched), ou journée fixe d'hier
// (J-4 examen QCM… : n = J du jour, la veille était J-(n+1)). dayKeyOf : horodatage -> « AAAA-MM-JJ » local.
export function stepsStudiedOn(day, plan = {}, { n = null, dayKeyOf } = {}) {
  const out = new Set();
  for (const [id, t] of Object.entries(plan.done || {})) if (t && dayKeyOf && dayKeyOf(t) === day) out.add(id);
  for (const [id, k] of Object.entries(plan.sched || {})) if (k === day) out.add(id);
  if (n != null && FINAL_STEP[n + 1]) out.add(FINAL_STEP[n + 1]);
  return [...out];
}

// Épisode suggéré dans le plan du jour : disponible, couvrant une étape étudiée la veille, pas encore écouté
// (ou écouté aujourd'hui : la tâche reste affichée, cochée). Premier dans l'ordre des épisodes.
export function suggestEpisode(episodes, stepIds, podcasts = {}, startOfToday = 0) {
  const want = new Set(stepIds);
  for (const ep of episodes) {
    if (!isAvailable(ep) || !(ep.steps || []).some((s) => want.has(s))) continue;
    const p = podcasts[ep.id];
    if (!p?.done) return { ep, done: false };
    if ((p.t || 0) >= startOfToday) return { ep, done: true };
  }
  return null;
}

// En-tête Range « bytes=a-b » (une seule plage) pour une ressource de `size` octets.
// Renvoie { start, end } (bornes incluses), null sans en-tête exploitable (réponse complète 200),
// ou { invalid: true } pour une plage non satisfaisable (416).
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(String(header));
  if (!m || (m[1] === '' && m[2] === '')) return null;  // plusieurs plages ou syntaxe inconnue : réponse complète
  let start; let end;
  if (m[1] === '') {                                     // suffixe : les N derniers octets
    const n = Number(m[2]);
    if (n === 0) return { invalid: true };
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return { invalid: true };
  return { start, end };
}

// En-têtes et statut d'une réponse partielle construite depuis le cache.
export function rangeResponseInit(range, size, type = 'audio/mp4') {
  if (!range) return { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } };
  if (range.invalid) return { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } };
  return {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Length': String(range.end - range.start + 1), 'Content-Range': `bytes ${range.start}-${range.end}/${size}`, 'Accept-Ranges': 'bytes' },
  };
}

// Fichier audio d'un épisode (chemin servi par le service worker depuis AUDIO_CACHE).
export const isAudioPath = (pathname) => /\/data\/podcasts\/[^/]+\.(m4a|mp3|aac|mp4)$/i.test(pathname);
