// Examen blanc : état et notation. Logique pure, l'affichage est dans app.js.
import { drawExam, scoreExam } from './srs.js';

export const EXAM_DURATION_MS = 60 * 60 * 1000;

export function startExam(questions, seen, mode, now = Date.now()) {
  const qs = drawExam(questions, seen);
  return {
    mode,                     // 'qcm' | 'qrc'
    startedAt: now,
    endsAt: now + EXAM_DURATION_MS,
    ids: qs.map((q) => q.id),
    answers: {},              // id -> index (qcm) | texte (qrc)
    grading: {},              // qrc : id -> points attribués
    current: 0,
    finished: false,
  };
}

export function remainingMs(exam, now = Date.now()) {
  return Math.max(0, exam.endsAt - now);
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
    t: now, mode: exam.mode, note, ids: exam.ids,
    byProf: agg('profession'), byTheme: agg('theme'),
    rows, answers: exam.answers,
    durationMs: Math.min(EXAM_DURATION_MS, now - exam.startedAt),
  };
}
