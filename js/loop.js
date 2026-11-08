// Série « ratées en boucle » : toutes les questions déjà ratées au moins une fois, les plus ratées d'abord ;
// une question ratée dans la série revient quelques questions plus loin, jusqu'à être réussie.

// statsQ : stats.q (id -> { seen, ok }) ; keep(id) : question disponible. Tri : plus faible réussite, puis plus d'erreurs.
export function missedOrder(statsQ, keep = () => true) {
  return Object.entries(statsQ || {})
    .map(([id, v]) => ({ id, seen: v?.seen || 0, ok: v?.ok || 0 }))
    .filter((x) => x.seen > x.ok && keep(x.id))
    .sort((a, b) => a.ok / a.seen - b.ok / b.seen || (b.seen - b.ok) - (a.seen - a.ok) || a.id.localeCompare(b.id))
    .map((x) => x.id);
}

// Remet `item` dans `queue` `gap` positions après l'indice courant `idx` (ou à la fin si la file est plus courte).
export function requeue(queue, idx, item, gap = 4) {
  queue.splice(Math.min(queue.length, idx + 1 + gap), 0, item);
  return queue;
}

// Erreurs pas encore confirmées : ratées un jour, et pas encore réussies sur 3 jours distincts depuis (stats.q.recovered),
// sauf celles déjà réussies aujourd'hui (une confirmation ne compte qu'un autre jour). Encore fausses d'abord,
// puis les plus ratées, puis les moins confirmées.
export function toConfirm(statsQ, today, keep = () => true) {
  return Object.entries(statsQ || {})
    .filter(([id, s]) => s && s.failed && !s.recovered && keep(id) && !(s.last === 'ok' && (s.recDays || []).includes(today)))
    .sort(([, a], [, b]) => (a.last === 'ok') - (b.last === 'ok') || (b.ko || 0) - (a.ko || 0) || (a.recDays || []).length - (b.recDays || []).length)
    .map(([id]) => id);
}

// Pièges : questions ratées au moins `min` fois, les plus ratées d'abord.
export function pitfalls(statsQ, keep = () => true, min = 3) {
  return Object.entries(statsQ || {})
    .filter(([id, s]) => s && (s.ko || 0) >= min && keep(id))
    .sort(([, a], [, b]) => b.ko - a.ko || b.ko / b.seen - a.ko / a.seen)
    .map(([id]) => id);
}
