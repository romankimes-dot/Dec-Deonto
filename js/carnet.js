// Carnet d'erreurs : ce que l'on sait ne pas avoir retenu (questions d'annales et shorts), à repasser
// volontairement et à relire le soir et le matin du jour J. Logique pure.
// carnet : id -> { on, last, note } ; id d'une question de la banque, ou « sht:<id> » pour un short.
// Une entrée retirée reste (on: false) pour que le retrait l'emporte à la synchronisation (champ `last`).
export const isShort = (id) => String(id).startsWith('sht:');

export function has(carnet, id) { return !!carnet?.[id]?.on; }

export function toggle(carnet, id, on = !has(carnet, id), now = Date.now()) {
  const prev = carnet[id] || {};
  carnet[id] = { on: !!on, last: now, note: on ? prev.note || '' : '' };
  return carnet[id];
}

export function setNote(carnet, id, note, now = Date.now()) {
  if (!has(carnet, id)) return null;
  carnet[id] = { ...carnet[id], note: String(note || '').slice(0, 200), last: now };
  return carnet[id];
}

// Entrées actives, la plus récente d'abord ; `known` : questions existantes (map id -> question), shorts toujours gardés.
export function entries(carnet, known = null) {
  return Object.entries(carnet || {})
    .filter(([id, v]) => v && v.on && (!known || isShort(id) || known[id]))
    .sort((a, b) => (b[1].last || 0) - (a[1].last || 0))
    .map(([id, v]) => ({ id, note: v.note || '', t: v.last || 0, short: isShort(id) }));
}
