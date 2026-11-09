// PDF de l'application (fiches à imprimer, livret, ville) et fichiers à enregistrer, sans jamais quitter l'app.
// Dans l'app installée (display-mode standalone, surtout sur iPhone), un lien vers un PDF ou vers un blob ouvre une
// vue plein écran sans Partager ni Retour : on y reste bloqué. On passe donc par la feuille de partage du système
// (Imprimer, Enregistrer dans Fichiers), ouverte dans le geste : Safari refuse navigator.share après un await. Le
// fichier est donc chargé à l'avance, une seule fois par URL (2,5 Mo pour les deux PDF des fiches), puis gardé ici.
// Hors app installée : téléchargement (<a download>, URL libérée ensuite). Sinon : feuille interne de l'app, avec
// « Fermer et reprendre ». Jamais de target=_blank ni de navigation de la page vers un PDF ou un blob.

const files = new Map(); // url -> File chargé
const pending = new Map(); // url -> Promise<File|null> en cours
const failedAt = new Map(); // url -> date du dernier échec (nouvel essai après RETRY_MS, ou à la demande)
const RETRY_MS = 30 * 1000;

const win = () => (typeof window !== 'undefined' ? window : globalThis);
const mq = (w, q) => { try { return !!w.matchMedia?.(q).matches; } catch { return false; } };

// App installée (écran d'accueil) : pas de barre du navigateur, donc pas de retour possible depuis un PDF.
export function isStandalone(w = win()) {
  return mq(w, '(display-mode: standalone)') || w.navigator?.standalone === true;
}
// Téléphone ou tablette : la feuille de partage y est le geste attendu (sur ordinateur, on télécharge).
export function isTouch(w = win()) {
  return mq(w, '(pointer: coarse)') || (w.navigator?.maxTouchPoints || 0) > 0;
}
// Aperçu intégré (iframe) réservé à l'ordinateur : pdfViewerEnabled vaut aussi true sur iOS 16.4+, d'où l'exclusion
// explicite du tactile.
export function canInline(w = win()) {
  return w.navigator?.pdfViewerEnabled === true && mq(w, '(hover: hover) and (pointer: fine)') && !isTouch(w);
}

export const pdfName = (url) => String(url).split('?')[0].split('/').pop() || 'document.pdf';
export const pdfFile = (url) => files.get(url) || null;
export const fmtSize = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo` : `${Math.max(1, Math.round(n / 1e3))} ko`);

export function canShareFile(file, nav = win().navigator) {
  try { return !!(file && nav?.canShare?.({ files: [file] })); } catch { return false; }
}

// Charge le PDF une seule fois (les appels suivants réutilisent le fichier ou le chargement en cours). Un échec
// n'est pas gardé : nouvel essai au plus tôt 30 s après, ou tout de suite avec { force: true }.
export function preloadPdf(url, { fetchFn, force = false, now = Date.now() } = {}) {
  if (files.has(url)) return Promise.resolve(files.get(url));
  if (pending.has(url)) return pending.get(url);
  if (!force && now - (failedAt.get(url) || -Infinity) < RETRY_MS) return Promise.resolve(null);
  const get = fetchFn || ((u) => win().fetch(u));
  const p = Promise.resolve()
    .then(() => get(url))
    .then((r) => (r && r.ok ? r.blob() : null))
    .then((b) => {
      // Une page HTML servie à la place du PDF (ancien service worker) n'est pas un PDF.
      if (!b || !b.size || /html/i.test(b.type || '')) return null;
      const f = new File([b], pdfName(url), { type: 'application/pdf' });
      files.set(url, f); failedAt.delete(url);
      return f;
    })
    .catch(() => null)
    .then((f) => { pending.delete(url); if (!f) failedAt.set(url, now); return f; });
  pending.set(url, p);
  return p;
}
export function forgetPdfs() { files.clear(); pending.clear(); failedAt.clear(); }

// Enregistre un fichier par <a download> (hors app installée seulement) : lien ajouté, cliqué, retiré, URL libérée.
// Renvoie false sans rien faire dans l'app installée, où ce lien ouvrirait le fichier en plein écran.
export function saveFile(blob, name, { doc = win().document, urlApi = win().URL, later = setTimeout, standalone = isStandalone() } = {}) {
  if (standalone || !blob || !doc?.body) return false;
  const href = urlApi.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = href; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
  doc.body.append(a); a.click(); a.remove();
  later(() => urlApi.revokeObjectURL(href), 60 * 1000);
  return true;
}

// Ce que fait un toucher sur un bouton PDF.
// print : bouton « Imprimer » d'une page imprimable (ville) ; ready : fichier déjà chargé ; shareable : partage de
// fichiers possible ; standalone : app installée ; touch : téléphone ou tablette.
export function pdfPlan({ print = false, ready = false, shareable = false, standalone = false, touch = false } = {}) {
  if (print && !standalone) return 'print'; // impression de la page par le navigateur
  if (ready && shareable && (standalone || touch)) return 'share';
  if (ready && !standalone) return 'download';
  return 'sheet'; // feuille interne : chargement en cours, hors ligne, ou app installée sans partage possible
}

// Bouton PDF touché. ui : { sheet, closeSheet, toast, esc } fournis par app.js.
export function openPdf(url, { title = '', print = false, ui } = {}) {
  const w = win(), file = pdfFile(url), standalone = isStandalone(w);
  const plan = pdfPlan({ print, ready: !!file, shareable: canShareFile(file, w.navigator), standalone, touch: isTouch(w) });
  if (plan === 'print') { ui.closeSheet?.(); setTimeout(() => w.print(), 300); return plan; }
  if (plan === 'share') {
    w.navigator.share({ files: [file], title: title || file.name }).catch((e) => { if (e?.name !== 'AbortError') pdfSheet(url, { title, ui }); });
    return plan;
  }
  if (plan === 'download') { saveFile(file, file.name, { standalone }); ui.toast?.('PDF enregistré dans vos téléchargements', 'download'); return plan; }
  pdfSheet(url, { title, ui });
  return plan;
}

// Feuille interne : état du chargement, puis Partager / Enregistrer, aperçu sur ordinateur.
export function pdfSheet(url, { title = '', ui } = {}) {
  const w = win(), esc = ui.esc || ((s) => String(s));
  const name = title || pdfName(url);
  ui.sheet(`<div class="card"><h2>${esc(name)}</h2><p class="muted" id="pdf-status" role="status">Chargement du PDF…</p><div class="btnrow" id="pdf-actions"></div><div id="pdf-view"></div></div>`);
  const status = w.document.getElementById('pdf-status');
  const show = (file) => {
    const box = w.document.getElementById('pdf-actions'), view = w.document.getElementById('pdf-view');
    if (!box || !status || !status.isConnected) return; // feuille fermée ou remplacée entre-temps
    box.innerHTML = '';
    const btn = (label, cls, onclick) => { const b = w.document.createElement('button'); b.className = `btn ${cls}`; b.textContent = label; b.onclick = onclick; box.append(b); return b; };
    if (!file) {
      status.textContent = 'PDF indisponible : il n’a pas encore été chargé sur cet appareil. Ouvrez l’app une fois avec du réseau, puis réessayez.';
      btn('Réessayer', 'primary', () => { status.textContent = 'Chargement du PDF…'; box.innerHTML = ''; preloadPdf(url, { force: true }).then(show); });
      return;
    }
    const standalone = isStandalone(w), shareable = canShareFile(file, w.navigator);
    status.textContent = `PDF prêt (${fmtSize(file.size)}).`;
    if (shareable) btn('Partager ou imprimer', 'primary', () => { w.navigator.share({ files: [file], title: name }).catch(() => {}); });
    if (!standalone) btn('Enregistrer le PDF', shareable ? '' : 'primary', () => { saveFile(file, file.name, { standalone }); ui.toast?.('PDF enregistré dans vos téléchargements', 'download'); });
    if (standalone && !shareable) status.textContent += ' Le partage n’est pas disponible dans l’app installée sur cet appareil : ouvrez le site dans votre navigateur (Safari, Chrome) pour enregistrer ou imprimer le PDF.';
    if (canInline(w) && view) {
      const f = w.document.createElement('iframe');
      f.title = name; f.src = url; f.style.cssText = 'width:100%;height:70vh;border:0;border-radius:8px;margin-top:10px;background:#fff';
      view.append(f);
    }
  };
  preloadPdf(url, { force: true }).then(show);
}
