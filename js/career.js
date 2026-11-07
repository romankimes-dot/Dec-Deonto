// Carrière : carte de grade, bandeau de session, frise et passage de niveau, dans l'esprit « bilan éditorial »
// (une couleur signature, de grands chiffres, des cartes pleines). Fonctions pures qui renvoient du HTML ;
// la couleur et la typographie viennent des variables CSS --g-* (thème « bilan » ou « classique »).
import { GRADES, LEVELS, GATES, levelInfo, gateConditions } from './gamify.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const pad2 = (n) => String(n).padStart(2, '0');

// Noms courts, pour les bandeaux étroits.
export const SHORT = ['', '1re année', '2e année', '3e année', 'Mémorialiste', 'Diplômé d’EC', 'Inscrit au tableau', 'Commissaire aux comptes', 'Installé'];

// Condition courte d'un grade (frise).
export const gateSummary = (n) => { const g = GATES[n]; if (!g) return ''; const p = [`${g.cov} % vues`]; if (g.exams) p.push('un examen blanc'); if (g.exam) p.push(`examen ≥ ${g.exam}`); if (g.acc) p.push(`réussite ≥ ${g.acc} %`); return p.join(' · '); };

const bar = (pct, cls = '') => `<div class="g-bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><div style="width:${Math.round(pct * 100)}%"></div></div>`;
const condList = (conds, cls = 'g-conds') => `<ul class="${cls}">${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '○'}</span> ${esc(c.label)}</li>`).join('')}</ul>`;

// Carte de grade (accueil, compacte ; carrière, complète) : numéro, nom, barre vers le suivant, conditions.
export function levelCardHtml(info, { today = 0, conds = [], blocked = false, compact = false } = {}) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n];
  const line = !next ? `<strong>${info.xp}</strong> pts · dernier grade atteint`
    : blocked ? `<strong>${info.xp}</strong> pts · les points y sont, il manque des résultats pour « ${esc(next.name)} »`
    : `<strong>${info.xp}</strong> / ${info.to} pts · encore <strong>${info.left}</strong> pour « ${esc(next.name)} »`;
  const gate = conds.length && (!compact || blocked)
    ? `<div class="g-gate ${blocked ? 'blocked' : ''}"><div class="g-gate__h">${blocked ? 'Points acquis · résultats manquants' : 'Pour passer'}${next ? ` au grade ${pad2(next.n)}` : ''}</div>${condList(conds)}</div>` : '';
  return `<div class="g-card ${compact ? 'compact' : ''}">
    <div class="g-card__top">
      <span class="g-no">${pad2(info.n)}</span>
      <div class="g-card__text"><span class="g-kicker">Grade ${info.n} sur ${GRADES.length}</span><span class="g-name">${esc(g.name)}</span></div>
      ${today > 0 ? `<span class="g-today">+${today}<small>pts aujourd’hui</small></span>` : ''}
    </div>
    ${bar(info.barPct ?? info.pct)}
    <div class="g-line">${line}</div>
    ${gate}
  </div>`;
}

// Carte-bilan pleine (haut de l'écran Carrière) : le grade en très grand, trois chiffres, le grade suivant.
export function heroHtml(info, readiness, { parts = null } = {}) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n];
  return `<div class="g-hero">
    <span class="g-kicker">Grade</span>
    <span class="g-big">${pad2(info.n)}</span>
    <span class="g-hero__name">${esc(g.name)}</span>
    <div class="g-stats">
      <span><b>${info.xp}</b>pts</span>
      <span><b>${Math.floor(readiness.cov)} %</b>annales vues</span>
      <span><b>${readiness.best ? readiness.best : '—'}</b>meilleur examen</span>
      ${parts ? `<span><b>${parts.exams ? Math.round(parts.exams) : 0}</b>pts d’examens</span>` : ''}
    </div>
    ${next ? `<div class="g-next"><span class="g-next__k">Prochain · ${esc(next.name)}</span><span class="g-next__v">${info.barPct !== undefined && info.barPct !== info.pct ? `${Math.round(info.barPct * 100)} % des résultats` : `${Math.min(info.xp, info.to) - info.from} / ${info.to - info.from} pts`}</span>${bar(info.barPct ?? info.pct, 'g-bar--light')}</div>` : '<div class="g-next"><span class="g-next__k">Les huit grades sont atteints.</span></div>'}
  </div>`;
}

// Bandeau de session : le grade et sa barre au-dessus de la question. gain = points gagnés depuis l'ouverture de la vue.
export function stripHtml(info, { gain = 0 } = {}) {
  return `<div class="g-strip">
    <div class="g-strip__text"><span class="g-kicker">Grade ${info.n} <span class="g-sep">/</span> ${GRADES.length}</span><span class="g-strip__name">${esc(SHORT[info.n])}</span></div>
    <span class="g-strip__pts">${gain > 0 ? `<em>+${gain}</em>` : ''}<strong>${info.xp}</strong><small> pts</small></span>
    ${bar(info.barPct ?? info.pct, 'g-bar--thin')}
  </div>`;
}

// Frise : les 8 grades, atteints (datés), courant, à venir (seuil et conditions). dates = progress.grades.
export function timelineHtml(info, dates = {}, readiness = null) {
  return `<ol class="parcours">${GRADES.map((g) => {
    const done = g.n <= info.n; const cur = g.n === info.n;
    const when = dates[g.n] ? `atteint le ${fmtDate(dates[g.n])}` : g.n === 1 ? 'départ' : `${LEVELS[g.n - 1]} pts · ${gateSummary(g.n)}`;
    const sub = cur && GRADES[info.n] ? `${info.xp} / ${info.to} pts` : when;
    const next = g.n === info.n + 1 && readiness ? condList(gateConditions(g.n, readiness), 'g-conds fr-conds') : '';
    return `<li class="fr-item ${done ? 'done' : 'todo'} ${cur ? 'cur' : ''}">
      <span class="fr-dot">${pad2(g.n)}</span>
      <div class="fr-body"><strong>${esc(g.name)}</strong><div class="fr-sub">${esc(sub)}</div>
      ${cur && GRADES[info.n] ? bar(info.pct, 'g-bar--thin') : ''}${next}</div>
    </li>`;
  }).join('')}</ol>`;
}

// Passage de grade (célébration) : la carte-bilan pleine page.
export function levelUpHtml(n, readiness = null, xp = null) {
  const g = GRADES[n - 1]; const next = GRADES[n];
  return `<div class="cel-level">
    <span class="g-kicker">Nouveau grade</span>
    <span class="g-big">${pad2(n)}</span>
    <span class="g-hero__name">${esc(g.name)}</span>
    ${readiness ? `<div class="g-stats"><span><b>${xp ?? LEVELS[n - 1]}</b>pts</span><span><b>${Math.floor(readiness.cov)} %</b>annales vues</span><span><b>${readiness.best || '—'}</b>meilleur examen</span></div>` : ''}
    ${next ? `<div class="g-next"><span class="g-next__k">Prochain · ${esc(next.name)}</span><span class="g-next__v">${LEVELS[n] - LEVELS[n - 1]} pts</span></div>` : ''}
    <p class="cel-hint">Touchez pour continuer</p>
  </div>`;
}

export { levelInfo };
