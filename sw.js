// Service worker : fonctionnement hors ligne.
// Stratégie : précache de l'app et des données à l'installation, puis
// "stale-while-revalidate" (réponse immédiate depuis le cache, mise à jour en arrière-plan).
const VERSION = 'dec1-v3';
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
  './js/catalog-data.js',
  './data/questions.json',
  './data/fiches/index.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // Fiches listées dans l'index
    try {
      const idx = await (await fetch('./data/fiches/index.json', { cache: 'no-cache' })).json();
      await cache.addAll(idx.map((f) => `./data/fiches/${f.file}`));
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
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response('Hors ligne et ressource absente du cache', { status: 503 });
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
