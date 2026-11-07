// Carrière : cartouche de niveau, frise des grades et passage de niveau, dans l'esprit d'un dossier d'architecte
// (cartouche de plan, cotes, capitales espacées). Fonctions pures qui renvoient du HTML.
import { GRADES, LEVELS, GATES, levelInfo, gateConditions } from './gamify.js';
import { ROOMS } from './scene.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const pad2 = (n) => String(n).padStart(2, '0');
export const roomOf = (n) => ROOMS.find((r) => r.n === n);

// Résumé des points par source, pour le cartouche (ordre d'affichage fixe).
const PART_LABELS = [['questions', 'questions'], ['exams', 'examens'], ['shorts', 'shorts'], ['series', 'séries'], ['days', 'journées']];

// Condition courte d'une pièce fermée (pour le plan et la frise).
export const gateSummary = (n) => { const g = GATES[n]; if (!g) return ''; const p = [`${g.cov} % vues`]; if (g.exams) p.push('un examen blanc'); if (g.exam) p.push(`examen ≥ ${g.exam}`); if (g.acc) p.push(`réussite ≥ ${g.acc} %`); return p.join(' · '); };
export const gateSummaries = () => Object.fromEntries(GRADES.map((g) => [g.n, gateSummary(g.n)]));

// Cartouche de niveau : grade, pièce, barre de points, conditions du grade suivant.
export function levelCardHtml(info, { today = 0, parts = null, compact = false, conds = [], blocked = false } = {}) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n]; const room = roomOf(info.n);
  const pct = Math.round(info.pct * 100);
  const bar = `<div class="lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div style="width:${pct}%"></div></div>`;
  const line = next
    ? `<strong>${info.xp}</strong> / ${info.to} pts · encore <strong>${info.left}</strong> pour « ${esc(next.name)} »`
    : `<strong>${info.xp}</strong> pts · les huit pièces sont ouvertes`;
  const gate = conds.length
    ? `<div class="lvl-gate ${blocked ? 'blocked' : ''}"><div class="lvl-gate-h">${blocked ? 'Points acquis · résultats manquants' : 'Pour ouvrir'} ${next ? `la pièce ${pad2(next.n)}` : ''}</div><ul>${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '■' : '□'}</span> ${esc(c.label)}</li>`).join('')}</ul></div>` : '';
  const chips = parts && !compact
    ? `<dl class="lvl-parts">${PART_LABELS.filter(([k]) => parts[k]).map(([k, l]) => `<div><dt>${l}</dt><dd>${parts[k]}</dd></div>`).join('')}</dl>` : '';
  return `<div class="lvl ${compact ? 'compact' : ''}">
    <div class="lvl-head"><span class="lvl-no">${pad2(info.n)}<small>/ ${pad2(GRADES.length)}</small></span>
      <div><div class="lvl-kicker">Pièce ${pad2(info.n)} · ${esc(room.name)}</div><h2 class="lvl-name">${esc(g.name)}</h2></div>
      ${today > 0 ? `<span class="lvl-today">+${today} pts<small>aujourd’hui</small></span>` : ''}</div>
    ${bar}
    <div class="lvl-line">${line}</div>
    ${compact && !blocked ? '' : gate}
    ${chips}
  </div>`;
}

// Frise : les 8 pièces, ouvertes (datées), courante, fermées (seuil et conditions). dates = progress.grades.
export function timelineHtml(info, dates = {}, readiness = null) {
  return `<ol class="parcours">${GRADES.map((g) => {
    const done = g.n <= info.n; const cur = g.n === info.n; const room = roomOf(g.n);
    const when = dates[g.n] ? `ouverte le ${fmtDate(dates[g.n])}` : g.n === 1 ? 'départ' : `${LEVELS[g.n - 1]} pts · ${gateSummary(g.n)}`;
    const sub = cur && GRADES[info.n] ? `${info.xp} / ${info.to} pts` : when;
    const next = g.n === info.n + 1 && readiness ? `<ul class="fr-conds">${gateConditions(g.n, readiness).map((c) => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '■' : '□'}</span> ${esc(c.label)}</li>`).join('')}</ul>` : '';
    return `<li class="fr-item ${done ? 'done' : 'todo'} ${cur ? 'cur' : ''}">
      <span class="fr-dot">${pad2(g.n)}</span>
      <div class="fr-body"><strong>${esc(g.name)}</strong><div class="fr-sub">${esc(room.name)} · ${esc(sub)}</div>
      ${cur && GRADES[info.n] ? `<div class="lvl-bar sm"><div style="width:${Math.round(info.pct * 100)}%"></div></div>` : ''}${next}</div>
    </li>`;
  }).join('')}</ol>`;
}

// Écran de passage de niveau (célébration) : une pièce de plus sur le plan.
export function levelUpHtml(n, sceneSvg = '') {
  const g = GRADES[n - 1]; const room = roomOf(n);
  return `<div class="cel-level">
    ${sceneSvg ? `<div class="cel-plan">${sceneSvg}</div>` : ''}
    <span class="lvl-stamp">Pièce ${pad2(n)} ouverte</span>
    <h2>${esc(g.name)}</h2>
    <p>${esc(room.name)}</p>
    <p class="cel-hint">Touchez pour continuer</p>
  </div>`;
}

export { levelInfo };
