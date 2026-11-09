// Service worker : fonctionnement hors ligne.
// Précache atomique de l'app et des données à l'installation (fichiers relus sur le réseau, jamais depuis le
// cache HTTP). Le code (HTML, JS, CSS, polices, icônes) est servi uniquement depuis le cache de sa version :
// il ne change qu'avec un nouveau service worker, jamais module par module (un import manquant bloquerait
// le démarrage). Données (data/) : questions, glossaire, fiches et shorts en réseau d'abord (2,5 s au plus, cache
// en repli), pour qu'une réponse corrigée apparaisse dès l'ouverture suivante ; le reste (PDF), cache d'abord.
// Une navigation vers un fichier (data/*.pdf, iframe comprise) reçoit ce fichier, jamais la page de l'app.
// VERSION est calculée par scripts/build_bank.py (empreinte du contenu servi et de ce fichier) : relancer
// « npm run build » après toute modification du code ou des données ; « npm run check » vérifie qu'elle est à jour.
// CORE est aussi la liste unique des fichiers que app.js recharge après un cache incohérent (recoverFromStaleCache).
const VERSION = 'dec1-5b4eec6a40';
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
  './js/plan.js',
  './js/catalog-data.js',
  './js/cluster.js',
  './js/drill.js',
  './js/games.js',
  './js/palais.js',
  './js/estimate.js',
  './js/carnet.js',
  './js/shorts.js',
  './js/scenes.js',
  './js/career.js',
  './js/glossaire.js',
  './js/qrc.js',
  './js/sync.js',
  './js/icons.js',
  './js/ville.js',
  './js/ville3d.js',
  './js/villeplan.js',
  './js/maquette.js',
  './js/carte.js',
  './js/choices.js',
  './js/loop.js',
  './js/pdf.js',
  './js/format.js',
  './js/vendor/three.module.min.js',
  './fonts/bricolage-grotesque.woff2',
  './data/shorts/index.json',
  './data/questions.json',
  './data/fiches/index.json',
  './data/glossaire.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
// PDF : précachés sans bloquer l'installation (2,6 Mo ; hors ligne, ils s'ouvrent quand même).
const PDFS = [
  './data/fiches-a-imprimer.pdf',
  './data/fiches-a-imprimer-2-par-feuille.pdf',
  './data/ville-plan.pdf',
  './data/ville-compositions.pdf',
];
// Réseau d'abord : contenus qui portent des réponses (clés corrigées, fiches, shorts).
const NET_FIRST = /\/data\/(questions|glossaire)\.json$|\/data\/fiches\/(index\.json|[^/]+\.md)$|\/data\/shorts\/[^/]+\.json$/;
const NET_TIMEOUT = 2500;
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
    // PDF, un par un : un PDF absent n'empêche ni les autres ni l'installation
    await Promise.all(PDFS.map((u) => cache.add(FRESH(u)).catch(() => null)));
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
// Coquille de l'app : navigation hors data/ vers une page sans extension (./, ./?v=1) ou vers index.html.
const isShell = (req, url) => req.mode === 'navigate' && !isData(url) && !/\.[a-z0-9]+$/i.test(url.pathname.replace(/index\.html$/, ''));
// Seules les réponses complètes du site sont gardées (pas de 206 partielle, d'erreur ni de réponse opaque).
const cacheable = (res) => !!res && res.status === 200 && res.type === 'basic';
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Requêtes partielles (lecteurs PDF, médias) : laissées au navigateur, sans passer par le cache
  if (req.headers.has('range')) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const fromNetwork = () => fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then((res) => {
      if (cacheable(res)) event.waitUntil(cache.put(req, res.clone()).catch(() => null));
      return res;
    });
    const shell = isShell(req, url);
    // Navigation dans l'app : la page de la version en cache, quels que soient les paramètres d'URL
    const cached = await cache.match(shell ? './index.html' : req, { ignoreSearch: true });
    if (shell) {
      if (cached) return cached;
    } else if (isData(url) && (req.mode === 'navigate' || NET_FIRST.test(url.pathname))) {
      // Réseau d'abord ; s'il tarde (2,5 s) ou échoue, la copie en cache. La requête lente se termine quand même et
      // met le cache à jour pour la fois suivante.
      const net = fromNetwork();
      if (!cached) {
        try { return await net; } catch { return new Response('Hors ligne et ressource absente du cache', { status: 503 }); }
      }
      event.waitUntil(net.catch(() => null));
      const timer = new Promise((res) => setTimeout(res, NET_TIMEOUT, null));
      const res = await Promise.race([net.catch(() => null), timer]);
      return res && res.ok ? res : cached;
    } else if (cached) return cached; // code et PDF : version en cache
    // Absent du cache (fiche jamais chargée, nouvelle ressource) : réseau
    try { return await fromNetwork(); } catch { return new Response('Hors ligne et ressource absente du cache', { status: 503 }); }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
