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

// Mini rendu Markdown (titres, listes, gras, italique, code, tableaux, paragraphes).
export function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  let listStack = [];
  const closeLists = () => { while (listStack.length) out.push(`</${listStack.pop()}>`); };
  while (i < lines.length) {
    const line = lines[i];
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { closeLists(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      closeLists();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
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
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i + 1])) { para.push(lines[i + 1]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
    i++;
  }
  closeLists();
  return out.join('\n');
}
