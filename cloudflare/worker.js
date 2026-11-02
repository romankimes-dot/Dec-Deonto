// Worker Cloudflare : copie en ligne de la progression de l'application DEC 1 (js/sync.js).
// Une seule valeur dans l'espace KV relié sous le nom DEC1 (clé « progress »), protégée par le secret TOKEN.
// Avant chaque remplacement, la version précédente est gardée une fois par jour (clé « backup:AAAA-MM-JJ », 30 jours).
//   GET  /progress  → la progression (JSON), ou 204 (en-tête X-Dec1-Empty: 1) si rien n'est encore enregistré
//   PUT  /progress  → remplace la progression (corps JSON, 5 Mo au plus)
//   GET  /          → { ok: true } : pour vérifier l'adresse dans un navigateur
const KEY = 'progress';
const MAX_BYTES = 5 * 1024 * 1024;
const BACKUP_DAYS = 30;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'X-Dec1-Empty',
  'Access-Control-Max-Age': '86400',
};
const reply = (body, status = 200, extra = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});

// Comparaison à durée constante (empreintes SHA-256 de même longueur)
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x); const v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { pathname } = new URL(request.url);
    if (pathname === '/') return reply({ ok: true, app: 'dec1-sync' });
    if (pathname !== '/progress') return reply({ error: 'introuvable' }, 404);
    if (!env.TOKEN || !env.DEC1) return reply({ error: 'Worker mal configuré : secret TOKEN ou espace KV DEC1 manquant' }, 500);
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !(await sameSecret(token, env.TOKEN))) return reply({ error: 'code secret refusé' }, 401);

    if (request.method === 'GET') {
      const v = await env.DEC1.get(KEY);
      return v === null ? new Response(null, { status: 204, headers: { ...CORS, 'Cache-Control': 'no-store', 'X-Dec1-Empty': '1' } }) : reply(v);
    }
    if (request.method === 'PUT') {
      const text = await request.text();
      if (new TextEncoder().encode(text).length > MAX_BYTES) return reply({ error: 'trop volumineux' }, 413);
      let s;
      try { s = JSON.parse(text); } catch { return reply({ error: 'JSON illisible' }, 400); }
      if (!s || typeof s !== 'object' || Array.isArray(s) || !s.cards || typeof s.cards !== 'object' || Array.isArray(s.cards)) {
        return reply({ error: 'progression non reconnue' }, 400);
      }
      const prev = await env.DEC1.get(KEY);
      const bkey = `backup:${new Date().toISOString().slice(0, 10)}`;
      if (prev !== null && (await env.DEC1.get(bkey)) === null) await env.DEC1.put(bkey, prev, { expirationTtl: BACKUP_DAYS * 86400 });
      await env.DEC1.put(KEY, text);
      return reply({ ok: true, at: Date.now() });
    }
    return reply({ error: 'méthode non prise en charge' }, 405);
  },
};
