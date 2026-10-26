// Examen blanc : état et notation. Logique pure, l'affichage est dans app.js.
import { drawExam, scoreExam } from './srs.js';

export const EXAM_DURATION_MS = 60 * 60 * 1000;

// `fixed` : questions imposées (examen inédit : une session entière, dans l'ordre du sujet).
export function startExam(questions, seen, mode, now = Date.now(), fixed = null) {
  const qs = fixed || drawExam(questions, seen);
  return {
    mode,                     // 'qcm' | 'qrc'
    startedAt: now,
    endsAt: now + EXAM_DURATION_MS,
    ids: qs.map((q) => q.id),
    answers: {},              // id -> index (qcm) | texte (qrc)
    grading: {},              // qrc : id -> points attribués
    current: 0,
    finished: false,
    pausedAt: null,           // pause : chrono arrêté depuis cet instant
  };
}

// Temps restant ; figé pendant une pause.
export function remainingMs(exam, now = Date.now()) {
  return Math.max(0, exam.endsAt - (exam.pausedAt || now));
}

// Pause : le chrono s'arrête ; à la reprise, l'échéance est repoussée d'autant.
export function pauseExam(exam, now = Date.now()) {
  if (!exam.pausedAt) exam.pausedAt = now;
  return exam;
}
export function resumePaused(exam, now = Date.now()) {
  if (exam.pausedAt) { exam.endsAt += Math.max(0, now - exam.pausedAt); exam.pausedAt = null; }
  return exam;
}

// Questions répondues d'une copie (QRC : texte non vide).
export function answeredCount(exam) {
  return exam.ids.filter((id) => { const a = exam.answers[id]; return a !== undefined && a !== null && String(a).trim() !== ''; }).length;
}

// Une copie répondue à moins de 50 % ne mesure rien : exclue de l'estimation, des badges et du plan.
// Les copies enregistrées avant ce champ (answered absent) restent comptées.
export function isCounted(e) {
  return !!e && (e.answered == null || e.answered >= (e.ids?.length || 20) / 2);
}

export function qcmPoints(q, answer) {
  return answer === q.qcm.answer ? 1 : 0;
}

// Résultat final. Pour le QRC, `grading` contient les points auto-attribués (0..points).
export function finishExam(exam, byId, now = Date.now()) {
  const rows = exam.ids.map((id) => {
    const q = byId[id];
    const max = exam.mode === 'qcm' ? 1 : q.points || 2;
    const points = exam.mode === 'qcm' ? qcmPoints(q, exam.answers[id]) : Math.min(max, exam.grading[id] || 0);
    return { id, q, points, max };
  });
  const note = scoreExam(rows, exam.mode);
  const agg = (key) => {
    const m = {};
    for (const r of rows) {
      const k = r.q[key];
      m[k] = m[k] || { points: 0, max: 0, n: 0 };
      m[k].points += r.points; m[k].max += r.max; m[k].n += 1;
    }
    return m;
  };
  return {
    t: now, mode: exam.mode, note, ids: exam.ids, answered: answeredCount(exam),
    ...(exam.inedit ? { inedit: exam.inedit } : {}),
    byProf: agg('profession'), byTheme: agg('theme'),
    rows, answers: exam.answers,
    // Temps de composition effectif (pauses déduites).
    durationMs: Math.min(EXAM_DURATION_MS, Math.max(0, EXAM_DURATION_MS - remainingMs(exam, exam.pausedAt || now))),
  };
}
