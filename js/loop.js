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
