// Carrière : carte de grade, bandeau de session, frise et passage de niveau, dans l'esprit « bilan éditorial »
// (une couleur signature, de grands chiffres, des cartes pleines). Fonctions pures qui renvoient du HTML ;
// la couleur et la typographie viennent des variables CSS --g-* (thème « bilan » ou « classique »).
// Le grade ne dépend que des résultats ; aucun point n'est affiché.
import { GRADES, GATES, gateConditions } from './gamify.js';
import { fmtPct, fmtNote, pctInt } from './format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const pad2 = (n) => String(n).padStart(2, '0');

// Noms courts, pour les bandeaux étroits.
export const SHORT = ['', '1re année', '2e année', '3e année', 'Mémorialiste', 'Diplômé d’EC', 'Inscrit au tableau', 'Commissaire aux comptes', 'Installé'];

// Condition courte d'un grade (frise).
export const gateSummary = (n) => { const g = GATES[n]; if (!g) return ''; const p = [`${fmtPct(g.cov)} des questions vues`]; if (g.exams) p.push('un examen blanc'); if (g.exam) p.push(`examen ≥ ${g.exam}/20`); if (g.acc) p.push(`réussite globale ≥ ${fmtPct(g.acc)}`); return p.join(' · '); };

const bar = (pct, cls = '') => `<div class="g-bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pctInt(pct * 100)}"><div style="width:${Math.round(pct * 100)}%"></div></div>`;
const condList = (conds, cls = 'g-conds') => `<ul class="${cls}">${conds.map((c) => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '○'}</span> ${esc(c.label)}</li>`).join('')}</ul>`;
const condsLine = (info) => `${info.met} / ${info.total} condition${info.total > 1 ? 's' : ''}`;

// Carte de grade (accueil, compacte ; carrière, complète) : numéro, nom, barre vers le suivant, conditions.
export function levelCardHtml(info, { conds = [], compact = false } = {}) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n];
  const missing = conds.find((c) => !c.ok);
  const line = !next ? 'Dernier grade atteint' : `<strong>${condsLine(info)}</strong> pour « ${esc(next.name)} »`;
  const detail = !next ? '' : compact
    ? (missing ? `<div class="g-line">Prochaine étape : ${esc(missing.label)}</div>` : '')
    : `<div class="g-gate"><div class="g-gate__h">Pour passer au grade ${pad2(next.n)}</div>${condList(conds)}</div>`;
  return `<div class="g-card ${compact ? 'compact' : ''}">
    <div class="g-card__top">
      <span class="g-no">${pad2(info.n)}</span>
      <div class="g-card__text"><span class="g-kicker">Grade ${info.n} sur ${GRADES.length}</span><span class="g-name">${esc(g.name)}</span></div>
    </div>
    ${bar(info.pct)}
    <div class="g-line">${line}</div>
    ${detail}
  </div>`;
}

// Carte-bilan pleine (haut de l'écran Carrière) : le grade en très grand, les résultats, le grade suivant.
export function heroHtml(info, readiness) {
  const g = GRADES[info.n - 1]; const next = GRADES[info.n];
  return `<div class="g-hero">
    <span class="g-kicker">Grade</span>
    <span class="g-big">${pad2(info.n)}</span>
    <span class="g-hero__name">${esc(g.name)}</span>
    <div class="g-stats">
      <span><b>${fmtPct(readiness.cov)}</b>questions vues</span>
      <span><b>${readiness.best ? `${fmtNote(readiness.best)}/20` : '–'}</b>meilleur examen</span>
      <span><b>${readiness.answers === 0 ? '–' : fmtPct(readiness.acc)}</b>réussite globale${readiness.answers ? ` · ${readiness.answers} rép.` : ''}</span>
    </div>
    ${next ? `<div class="g-next"><span class="g-next__k">Prochain · ${esc(next.name)}</span><span class="g-next__v">${condsLine(info)}</span>${bar(info.pct, 'g-bar--light')}</div>` : '<div class="g-next"><span class="g-next__k">Les huit grades sont atteints.</span></div>'}
  </div>`;
}

// Bandeau de session : le grade et sa progression au-dessus de la question.
export function stripHtml(info) {
  return `<div class="g-strip">
    <div class="g-strip__text"><span class="g-kicker">Grade ${info.n} <span class="g-sep">/</span> ${GRADES.length}</span><span class="g-strip__name">${esc(SHORT[info.n])}</span></div>
    ${bar(info.pct, 'g-bar--thin')}
  </div>`;
}

// Frise : les 8 grades, atteints (datés), courant, à venir (conditions). dates = progress.grades.
export function timelineHtml(info, dates = {}, readiness = null) {
  return `<ol class="parcours">${GRADES.map((g) => {
    const done = g.n <= info.n; const cur = g.n === info.n;
    const when = dates[g.n] ? `atteint le ${fmtDate(dates[g.n])}` : g.n === 1 ? 'départ' : gateSummary(g.n);
    const sub = cur && GRADES[info.n] ? `${condsLine(info)} pour le suivant` : when;
    const next = g.n === info.n + 1 && readiness ? condList(gateConditions(g.n, readiness), 'g-conds fr-conds') : '';
    return `<li class="fr-item ${done ? 'done' : 'todo'} ${cur ? 'cur' : ''}">
      <span class="fr-dot">${pad2(g.n)}</span>
      <div class="fr-body"><strong>${esc(g.name)}</strong><div class="fr-sub">${esc(sub)}</div>
      ${cur && GRADES[info.n] ? bar(info.pct, 'g-bar--thin') : ''}${next}</div>
    </li>`;
  }).join('')}</ol>`;
}

// Passage de grade (célébration) : la carte-bilan pleine page.
export function levelUpHtml(n, readiness = null) {
  const g = GRADES[n - 1]; const next = GRADES[n];
  return `<div class="cel-level">
    <span class="g-kicker">Nouveau grade</span>
    <span class="g-big">${pad2(n)}</span>
    <span class="g-hero__name">${esc(g.name)}</span>
    ${readiness ? `<div class="g-stats"><span><b>${fmtPct(readiness.cov)}</b>questions vues</span><span><b>${readiness.best ? `${fmtNote(readiness.best)}/20` : '–'}</b>meilleur examen</span></div>` : ''}
    ${next ? `<div class="g-next"><span class="g-next__k">Prochain · ${esc(next.name)}</span><span class="g-next__v">${esc(gateSummary(n + 1))}</span></div>` : ''}
    <p class="cel-hint">Touchez pour continuer</p>
  </div>`;
}

