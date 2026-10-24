// Service worker : fonctionnement hors ligne.
// Précache atomique de l'app et des données à l'installation (fichiers relus sur le réseau, jamais depuis le
// cache HTTP, pour qu'une version ne mélange pas d'anciens et de nouveaux fichiers). Ensuite : réseau d'abord
// (revalidation à chaque chargement, repli sur le cache au-delà de 4 s ou hors ligne).
const VERSION = 'dec1-v17';
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
  './fonts/bricolage-grotesque.woff2',
  './data/shorts/index.json',
  './data/questions.json',
  './data/fiches/index.json',
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const network = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (!cached) return (await network) || new Response('Hors ligne et ressource absente du cache', { status: 503 });
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
    const res = await Promise.race([network, timeout]);
    if (res) return res;
    event.waitUntil(network);
    return cached;
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
