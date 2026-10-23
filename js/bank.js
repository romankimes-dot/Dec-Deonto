// Chargement de la banque de questions et des fiches.
export const THEMES = {
  exercice: 'Exercice de la profession',
  deontologie: 'Éthique et déontologie',
  controle_qualite: 'Contrôle de qualité',
  responsabilite: 'Responsabilité',
};

export const SESSION_LABEL = (s) => {
  const [y, m] = s.split('-');
  return `${m === '05' ? 'mai' : 'nov.'} ${y}`;
};

export async function loadBank() {
  const res = await fetch('./data/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('questions.json introuvable');
  const data = await res.json();
  const questions = data.questions.map((q) => ({ ...q, sessionLabel: SESSION_LABEL(q.session) }));
  return { ...data, questions };
}

export async function loadFichesIndex() {
  const res = await fetch('./data/fiches/index.json', { cache: 'no-cache' });
  if (!res.ok) return [];
  return res.json();
}

export async function loadFiche(file) {
  const res = await fetch(`./data/fiches/${file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('fiche introuvable');
  return res.text();
}

// Entête facultative d'une fiche, entre deux lignes « --- » en tout début de fichier :
//   type: visuel
//   questions: EC:referentiel_normatif CAC:nep 2019-05-CAC-12
export function splitFrontMatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md.replace(/\r/g, ''));
  if (!m) return { meta: {}, body: md.replace(/\r/g, '') };
  const meta = {};
  for (const l of m[1].split('\n')) {
    const kv = /^(\w+)\s*:\s*(.*)$/.exec(l.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: md.replace(/\r/g, '').slice(m[0].length) };
}

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Pastilles : {EC}, {CAC}, {!} (piège), {?} (à vérifier)
const PILLS = { EC: '<span class="pill ec">EC</span>', CAC: '<span class="pill cac">CAC</span>', '!': '<span class="pill trap">piège</span>', '?': '<span class="pill check">à vérifier</span>' };
const inline = (s) => escHtml(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`(.+?)`/g, '<code>$1</code>')
  .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/\{(EC|CAC|!|\?)\}/g, (_, k) => PILLS[k]);
const cols = (l) => l.split('|').map((c) => c.trim());

// Blocs visuels : ```vs, ```echelle, ```frise, ```etapes, ```arbre
const BLOCKS = {
  // Critère | EC | CAC  (première ligne « = | A | B » pour changer les intitulés)
  vs(lines) {
    let labels = ['Expert-comptable', 'Commissaire aux comptes'];
    if (lines[0]?.startsWith('=')) labels = cols(lines.shift()).slice(1);
    const rows = lines.map((l) => {
      const [k, a = '', b = ''] = cols(l);
      return `<div class="vs-row"><div class="vs-k">${inline(k)}</div><div class="vs-a">${inline(a)}</div><div class="vs-b">${inline(b)}</div></div>`;
    });
    return `<div class="vs"><div class="vs-head"><span class="vs-a">${inline(labels[0])}</span><span class="vs-b">${inline(labels[1])}</span></div>${rows.join('')}</div>`;
  },
  // Niveau | missions | forme de la conclusion  (du plus élevé au plus faible)
  echelle(lines) {
    const n = lines.length;
    return `<div class="echelle">${lines.map((l, i) => {
      const [lvl, what = '', how = ''] = cols(l);
      return `<div class="ech-row" style="--w:${100 - (i * 45) / Math.max(1, n - 1)}%"><div class="ech-bar">${inline(lvl)}</div><div class="ech-txt"><div>${inline(what)}</div>${how ? `<div class="muted">${inline(how)}</div>` : ''}</div></div>`;
    }).join('')}</div>`;
  },
  // Repère | texte
  frise(lines) {
    return `<ol class="frise">${lines.map((l) => {
      const [k, ...rest] = cols(l);
      return `<li><span class="fr-k">${inline(k)}</span><span class="fr-t">${inline(rest.join(' | '))}</span></li>`;
    }).join('')}</ol>`;
  },
  // Acteur | action  (numérotées)
  etapes(lines) {
    return `<ol class="etapes">${lines.map((l) => {
      const [k, ...rest] = cols(l);
      return `<li>${rest.length ? `<span class="et-k">${inline(k)}</span>${inline(rest.join(' | '))}` : inline(k)}</li>`;
    }).join('')}</ol>`;
  },
  // Arbre par indentation (2 espaces) ; préfixes : « ? » question, « = » conclusion, « ! » interdit / piège
  arbre(lines) {
    const nodes = lines.map((l) => {
      const depth = Math.floor((/^ */.exec(l)[0].length) / 2);
      let t = l.trim(); let cls = '';
      const m = /^([?=!])\s*/.exec(t);
      if (m) { cls = { '?': 'q', '=': 'ok', '!': 'ko' }[m[1]]; t = t.slice(m[0].length); }
      return { depth, html: `<span class="node ${cls}">${inline(t)}</span>` };
    });
    let out = '<div class="arbre"><ul>'; let d = 0;
    nodes.forEach((nd, i) => {
      if (i > 0) {
        if (nd.depth > d) { out += '<ul>'.repeat(nd.depth - d); } else { out += '</li>'; out += '</ul></li>'.repeat(d - nd.depth); }
      }
      out += `<li>${nd.html}`; d = nd.depth;
    });
    out += '</li>' + '</ul></li>'.repeat(d) + '</ul></div>';
    return out;
  },
};

// Mini rendu Markdown (titres, listes, gras, italique, code, tableaux, paragraphes, blocs visuels).
export function renderMarkdown(md) {
  const lines = splitFrontMatter(md).body.split('\n');
  const out = [];
  let i = 0;
  let listStack = [];
  const closeLists = () => { while (listStack.length) out.push(`</${listStack.pop()}>`); };
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(\w+)\s*$/.exec(line);
    if (fence) {
      closeLists();
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { if (lines[i].trim()) body.push(lines[i].replace(/\s+$/, '')); i++; }
      i++;
      const fn = BLOCKS[fence[1]];
      out.push(fn ? fn(body) : `<pre>${escHtml(body.join('\n'))}</pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { closeLists(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      closeLists();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const depth = Math.floor(li[1].replace(/\t/g, '  ').length / 2);
      const type = /\d/.test(li[2]) ? 'ol' : 'ul';
      while (listStack.length > depth + 1) out.push(`</${listStack.pop()}>`);
      if (listStack.length < depth + 1) { out.push(`<${type}>`); listStack.push(type); }
      out.push(`<li>${inline(li[3])}</li>`);
      i++; continue;
    }
    if (/^\s*$/.test(line)) { closeLists(); i++; continue; }
    if (/^---+$/.test(line.trim())) { closeLists(); out.push('<hr>'); i++; continue; }
    closeLists();
    const para = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\s*[-*]\s|\s*\d+\.\s|\s*\||```)/.test(lines[i + 1])) { para.push(lines[i + 1]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
    i++;
  }
  closeLists();
  return out.join('\n');
}
