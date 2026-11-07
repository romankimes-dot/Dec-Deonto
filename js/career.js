// Carrière : frise des grades et carte de niveau, dans le style des shorts (papier, personnages plats).
// Fonctions pures qui renvoient du HTML ; aucune lecture du DOM ni de l'état global.
import { GRADES, LEVELS, GATES, levelInfo, gateConditions } from './gamify.js';
import { person, CAST } from './scenes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Décors des 8 grades : un mot et une couleur de pastille, repris dans la frise et sur la carte.
export const STAGES = {
  1: { place: 'Open space, poste partagé', color: '#6b8e9e' },
  2: { place: 'Open space, poste attitré', color: '#5f8f7a' },
  3: { place: 'Bureau partagé à deux', color: '#1e7a5f' },
  4: { place: 'Tableau blanc couvert de schémas', color: '#8a6d3b' },
  5: { place: 'Bureau personnel, fenêtre', color: '#b8860b' },
  6: { place: 'Bibliothèque, médaille de l’Ordre', color: '#2b3a67' },
  7: { place: 'Porte vitrée, mallette d’audit', color: '#d4532b' },
  8: { place: 'Cabinet, plaque sur la porte', color: '#1c1b1a' },
};

// Résumé des points par source, pour la carte (ordre d'affichage fixe).
const PART_LABELS = [['questions', 'questions'], ['exams', 'examens blancs'], ['shorts', 'shorts'], ['series', 'séries'], ['days', 'journées']];

// Carte de niveau : personnage, grade, barre vers le grade suivant. info = levelInfo(xp) ; today = points du jour.
export function levelCardHtml(info, { today = 0, parts = null, compact = false, conds = [], blocked = false } = {}) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n];
  const st = STAGES[info.n];
  const bar = `<div class="lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(info.pct * 100)}"><div style="width:${Math.round(info.pct * 100)}%;background:${st.color}"></div></div>`;
  const line = next
    ? `<strong>${info.xp}</strong> / ${info.to} pts · encore <strong>${info.left}</strong> pour « ${esc(next.name)} »`
    : `<strong>${info.xp}</strong> pts · carrière complète`;
  const gate = conds.length
    ? `<div class="lvl-gate ${blocked ? 'blocked' : ''}"><div class="lvl-gate-h">${blocked ? 'Points acquis · il manque des résultats' : 'Pour franchir'}${next ? ` « ${esc(next.name)} »` : ''}</div><ul>${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✓' : '○'} ${esc(c.label)}</li>`).join('')}</ul></div>` : '';
  const chips = parts && !compact
    ? `<div class="lvl-parts">${PART_LABELS.filter(([k]) => parts[k]).map(([k, l]) => `<span class="lvl-chip">${parts[k]} <span>${l}</span></span>`).join('')}</div>` : '';
  return `<div class="lvl ${compact ? 'compact' : ''}" style="--c:${st.color};--soft:${CAST.ec.soft}">
    <div class="lvl-fig"><div class="lvl-disc"></div><div class="lvl-pers">${person('ec')}</div><span class="lvl-stamp">Niveau ${info.n}<span>/ ${GRADES.length}</span></span></div>
    <div class="lvl-body">
      <div class="lvl-kicker">${esc(st.place)}</div>
      <h2 class="lvl-name">${esc(g.name)}</h2>
      ${bar}
      <div class="lvl-line">${line}</div>
      ${today > 0 ? `<div class="lvl-today">+${today} pts aujourd’hui</div>` : ''}
      ${compact && !blocked ? '' : gate}
      ${chips}
    </div>
  </div>`;
}

// Frise : les 8 grades, acquis (datés), courant, à venir (seuil en points). dates = progress.grades.
const gateSummary = (n) => { const g = GATES[n]; if (!g) return ''; const p = [`${g.cov} % vues`]; if (g.exams) p.push('un examen blanc'); if (g.exam) p.push(`examen ≥ ${g.exam}`); if (g.acc) p.push(`réussite ≥ ${g.acc} %`); return p.join(', '); };
export function timelineHtml(info, dates = {}, readiness = null) {
  return `<ol class="parcours" style="--c:${STAGES[info.n].color}">${GRADES.map((g) => {
    const state = g.n <= info.n ? 'done' : 'todo';
    const cur = g.n === info.n;
    const st = STAGES[g.n];
    const when = dates[g.n] ? `Atteint le ${fmtDate(dates[g.n])}` : g.n === 1 ? 'Départ' : `${LEVELS[g.n - 1]} pts · ${gateSummary(g.n)}`;
    const sub = cur && GRADES[info.n] ? `${info.xp} / ${info.to} pts` : when;
    const next = g.n === info.n + 1 && readiness ? `<ul class="fr-conds">${gateConditions(g.n, readiness).map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✓' : '○'} ${esc(c.label)}</li>`).join('')}</ul>` : '';
    return `<li class="fr-item ${state} ${cur ? 'cur' : ''}" style="--c:${st.color}">
      <span class="fr-dot">${state === 'done' && !cur ? '✓' : g.n}</span>
      <div class="fr-body"><strong>${esc(g.name)}</strong><div class="fr-sub">${esc(st.place)} · ${esc(sub)}</div>
      ${cur && GRADES[info.n] ? `<div class="lvl-bar sm"><div style="width:${Math.round(info.pct * 100)}%;background:${st.color}"></div></div>` : ''}${next}</div>
    </li>`;
  }).join('')}</ol>`;
}

// Écran de passage de niveau (célébration).
export function levelUpHtml(n) {
  const g = GRADES[n - 1]; const st = STAGES[n];
  return `<div class="cel-level" style="--c:${st.color};--soft:${CAST.ec.soft}">
    <div class="lvl-fig big"><div class="lvl-disc"></div><div class="lvl-pers">${person('ec')}</div></div>
    <span class="lvl-stamp pop">Nouveau grade</span>
    <h2>${esc(g.name)}</h2>
    <p>${esc(st.place)}</p>
    <p class="cel-hint">Touchez pour continuer</p>
  </div>`;
}

export { levelInfo };
