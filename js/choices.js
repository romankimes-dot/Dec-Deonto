// Ordre d'affichage des 4 propositions d'un QCM : tiré au hasard à chaque nouvelle présentation,
// toujours différent du dernier ordre montré pour cette question (mémorisé dans progress.choiceOrder).

const asArray = (last) => (typeof last === 'string' ? [...last].map(Number) : Array.isArray(last) ? last : null);

// last : dernier ordre montré ("2031" ou [2, 0, 3, 1]) ou rien ; rnd : générateur dans [0, 1).
export function nextOrder(last, n = 4, rnd = Math.random) {
  const prev = asArray(last);
  const same = (a) => prev && prev.length === a.length && a.every((v, i) => v === prev[i]);
  for (let tries = 0; tries < 50; tries++) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (!same(a)) return a;
  }
  // Générateur dégénéré : rotation d'un cran, forcément différente.
  const base = prev && prev.length === n ? prev : Array.from({ length: n }, (_, i) => i);
  return [...base.slice(1), base[0]];
}
