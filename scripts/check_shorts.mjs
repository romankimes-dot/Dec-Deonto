// Vérifie les fichiers data/shorts/<étape>.json : format, longueurs, sous-thèmes, ancrage dans la fiche.
// Usage : node scripts/check_shorts.mjs [fichier.json ...]   (sans argument : tous les fichiers)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { STEPS } from '../js/plan.js';
import { validateShort } from '../js/shorts.js';

const root = new URL('../', import.meta.url);
const bank = JSON.parse(readFileSync(new URL('data/questions.json', root), 'utf8'));
const tags = new Set(bank.questions.flatMap((q) => q.tags));
const fdir = new URL('data/fiches/', root);
const fiches = Object.fromEntries(readdirSync(fdir).filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(new URL(f, fdir), 'utf8')]));
const sdir = new URL('data/shorts/', root);
const steps = new Set(STEPS.filter((s) => s.kind === 'schema').map((s) => s.id));

const files = process.argv.slice(2).length ? process.argv.slice(2) : (existsSync(sdir) ? readdirSync(sdir).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => `data/shorts/${f}`) : []);
let bad = 0; let total = 0; const ids = new Set();
for (const file of files) {
  const step = file.split('/').pop().replace(/\.json$/, '');
  let data;
  try { data = JSON.parse(readFileSync(new URL(file, root), 'utf8')); } catch (e) { console.log(`${file} : JSON illisible (${e.message})`); bad++; continue; }
  if (!steps.has(step)) { console.log(`${file} : « ${step} » n'est pas une étape du parcours`); bad++; }
  if (data.step !== step || !Array.isArray(data.shorts)) { console.log(`${file} : attendu { "step": "${step}", "shorts": [...] }`); bad++; continue; }
  for (const s of data.shorts) {
    total++;
    const err = validateShort(s, { step, tags, fiches });
    if (ids.has(s.id)) err.push('id en double');
    ids.add(s.id);
    if (err.length) { bad++; console.log(`${file} › ${s.id} :\n  - ${err.join('\n  - ')}`); }
  }
  const types = {}; data.shorts.forEach((s) => { types[s.type] = (types[s.type] || 0) + 1; });
  console.log(`${file} : ${data.shorts.length} shorts (${Object.entries(types).map(([k, v]) => `${k} ${v}`).join(', ')})`);
}
if (!process.argv.slice(2).length) {
  const index = JSON.parse(readFileSync(new URL('index.json', sdir), 'utf8'));
  const onDisk = files.map((f) => f.split('/').pop().replace(/\.json$/, '')).filter((f) => f !== 'index');
  const missing = onDisk.filter((f) => !index.includes(f)); const absent = index.filter((f) => !onDisk.includes(f));
  if (missing.length || absent.length) { bad++; console.log(`index.json : à ajouter ${missing.join(', ') || '—'} ; sans fichier ${absent.join(', ') || '—'}`); }
}
console.log(bad ? `\n${bad} problème(s) sur ${total} shorts` : `\nOK : ${total} shorts valides`);
process.exit(bad ? 1 : 0);
