// Empreinte des sources du PDF à imprimer (scripts/build_pdf.mjs) : tests/fiches.test.js vérifie que
// data/fiches-a-imprimer.pdf a été régénéré (npm run pdf) après toute modification d'une fiche ou de sa mise en page.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function inputsHash(root) {
  const h = createHash('sha256');
  const files = ['data/fiches/index.json', ...readdirSync(join(root, 'data/fiches')).filter((f) => f.endsWith('.md')).sort().map((f) => `data/fiches/${f}`), 'scripts/print.css', 'scripts/build_pdf.mjs'];
  for (const f of files) h.update(f).update('\0').update(readFileSync(join(root, f))).update('\0');
  return h.digest('hex');
}
