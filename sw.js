// Service worker : fonctionnement hors ligne.
// Précache atomique de l'app et des données à l'installation (fichiers relus sur le réseau, jamais depuis le
// cache HTTP). Le code (HTML, JS, CSS, polices, icônes) est servi uniquement depuis le cache de sa version :
// il ne change qu'avec un nouveau service worker, jamais module par module (un import manquant bloquerait
// le démarrage). Les données (data/) : cache d'abord, rafraîchi en arrière-plan (stale-while-revalidate).
// Toute modification du code impose d'incrémenter VERSION.
const VERSION = 'dec1-v20';
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
  './fonts/bricolage-grotesque.woff2',
  './data/shorts/index.json',
  './data/questions.json',
  './data/fiches/index.json',
  './data/glossaire.json',
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
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isData = (url) => url.pathname.includes('/data/');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
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
