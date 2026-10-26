// Service worker : fonctionnement hors ligne.
// Précache atomique de l'app et des données à l'installation (fichiers relus sur le réseau, jamais depuis le
// cache HTTP). Le code (HTML, JS, CSS, polices, icônes) est servi uniquement depuis le cache de sa version :
// il ne change qu'avec un nouveau service worker, jamais module par module (un import manquant bloquerait
// le démarrage). Les données (data/) : cache d'abord, rafraîchi en arrière-plan (stale-while-revalidate).
// Podcasts (data/podcasts/*.m4a) : jamais précachés (trop lourds). L'utilisateur les télécharge un par un dans
// AUDIO_CACHE, conservé d'une version à l'autre ; servis depuis ce cache s'il les contient (réponses 206 construites
// depuis le blob pour les requêtes Range, exigées par Safari iOS), sinon depuis le réseau, sans mise en cache.
// Toute modification du code impose d'incrémenter VERSION.
const VERSION = 'dec1-v25';
const AUDIO_CACHE = 'dec1-audio';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/srs.js',
  './js/store.js',
  './js/bank.js',
  './js/exam.js',
  './js/gamify.js',
  './js/scene.js',
  './js/plan.js',
  './js/catalog-data.js',
  './js/cluster.js',
  './js/drill.js',
  './js/games.js',
  './js/palais.js',
  './js/estimate.js',
  './js/shorts.js',
  './js/scenes.js',
  './js/glossaire.js',
  './js/qrc.js',
  './js/podcasts.js',
  './fonts/bricolage-grotesque.woff2',
  './data/shorts/index.json',
  './data/questions.json',
  './data/fiches/index.json',
  './data/glossaire.json',
  './data/podcasts.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const FRESH = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE.map(FRESH));
    // Fiches listées dans l'index
    try {
      const idx = await (await fetch(FRESH('./data/fiches/index.json'))).json();
      await cache.addAll(idx.map((f) => FRESH(`./data/fiches/${f.file}`)));
    } catch { /* pas bloquant */ }
    // Shorts listés dans leur index
    try {
      const steps = await (await fetch(FRESH('./data/shorts/index.json'))).json();
      await cache.addAll(steps.map((st) => FRESH(`./data/shorts/${st}.json`)));
    } catch { /* pas bloquant */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isData = (url) => url.pathname.includes('/data/');
const isAudio = (url) => /\/data\/podcasts\/[^/]+\.(m4a|mp3|aac|mp4)$/i.test(url.pathname);

// Même logique que parseRange de js/podcasts.js (vérifié par tests/podcasts.test.js) : { start, end }, null
// (réponse complète) ou { invalid: true } (416).
function parseRange(header, size) {
  if (!header) return null;
  const m = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(String(header));
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start; let end;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return { invalid: true };
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return { invalid: true };
  return { start, end };
}

// Épisode téléchargé : réponse complète ou partielle depuis le blob en cache. Sinon : réseau, sans cache.
async function audioResponse(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const hit = await cache.match(req.url, { ignoreSearch: true });
  if (!hit) return fetch(req);
  const blob = await hit.blob();
  const size = blob.size;
  const type = hit.headers.get('Content-Type') || 'audio/mp4';
  const range = parseRange(req.headers.get('Range'), size);
  if (!range) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  if (range.invalid) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
  return new Response(blob.slice(range.start, range.end + 1, type), {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Length': String(range.end - range.start + 1), 'Content-Range': `bytes ${range.start}-${range.end}/${size}`, 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (isAudio(url)) { event.respondWith(audioResponse(req).catch(() => new Response('Épisode non téléchargé et hors ligne', { status: 503 }))); return; }
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const fromNetwork = () => fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) event.waitUntil(cache.put(req, res.clone()));
      return res;
    });
    // Navigation : la page de la version en cache, quels que soient les paramètres d'URL
    const cached = await cache.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
    if (isData(url)) {
      if (cached) { event.waitUntil(fromNetwork().catch(() => null)); return cached; }
    } else if (cached) return cached;
    // Absent du cache (fiche jamais chargée, nouvelle ressource) : réseau
    try { return await fromNetwork(); } catch { return new Response('Hors ligne et ressource absente du cache', { status: 503 }); }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
