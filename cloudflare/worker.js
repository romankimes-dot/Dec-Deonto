// Worker Cloudflare : copies en ligne des applications DEC 1 (js/sync.js) et Ernest (romankimes-dot/Ernest, js/sync.js).
// Espace KV relié sous le nom DEC1, accès protégé par le secret TOKEN (en-tête Authorization: Bearer …).
//   /progress      progression de DEC 1 (clé « progress »)
//   /ernest        état d'Ernest (clé « ernest »)
//   /pont/<src>    plan déposé pour Ernest par une app de révision (clé « pont:<src> », src : deonto, revision, memoire…)
//   /ponts         GET : tous les plans déposés, { src: plan }
//   /              GET : { ok: true } pour vérifier l'adresse dans un navigateur
// GET renvoie la valeur (JSON), ou 204 (en-tête X-Dec1-Empty: 1) si rien n'est encore enregistré. Chaque valeur porte une
// révision (en-tête X-Rev) ; un PUT avec If-Match: <rev> (vide si rien n'est attendu) est refusé (412) si la valeur a
// changé entre-temps. Avant chaque remplacement de progress et ernest, la version précédente est gardée une fois par
// jour (clé « backup:<clé>:AAAA-MM-JJ », 30 jours).
const MAX_BYTES = 5 * 1024 * 1024;
const BACKUP_DAYS = 30;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match',
  'Access-Control-Expose-Headers': 'X-Dec1-Empty, X-Rev',
  'Access-Control-Max-Age': '86400',
};
const reply = (body, status = 200, extra = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Casiers acceptés : clé KV, contrôle du contenu, copie quotidienne
function slot(pathname) {
  if (pathname === '/progress') return { key: 'progress', ok: (s) => isObj(s) && isObj(s.cards), backup: true };
  if (pathname === '/ernest') return { key: 'ernest', ok: (s) => isObj(s) && (isObj(s.days) || (isObj(s.state) && isObj(s.state.days))), backup: true };
  const m = /^\/pont\/([a-z0-9-]{1,32})$/.exec(pathname);
  if (m) return { key: `pont:${m[1]}`, ok: (s) => isObj(s) && s.src === m[1], backup: false };
  return null;
}

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
    const sl = slot(pathname);
    if (!sl && pathname !== '/ponts') return reply({ error: 'introuvable' }, 404);
    if (!env.TOKEN || !env.DEC1) return reply({ error: 'Worker mal configuré : secret TOKEN ou espace KV DEC1 manquant' }, 500);
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !(await sameSecret(token, env.TOKEN))) return reply({ error: 'code secret refusé' }, 401);

    if (pathname === '/ponts') {
      if (request.method !== 'GET') return reply({ error: 'méthode non prise en charge' }, 405);
      const out = {};
      const { keys } = await env.DEC1.list({ prefix: 'pont:' });
      for (const k of keys) {
        const v = await env.DEC1.get(k.name);
        try { if (v !== null) out[k.name.slice(5)] = JSON.parse(v); } catch { /* ignoré */ }
      }
      return reply(out);
    }

    const cur = await env.DEC1.getWithMetadata(sl.key);
    const rev = (cur.metadata && cur.metadata.rev) || '';
    if (request.method === 'GET') {
      return cur.value === null
        ? new Response(null, { status: 204, headers: { ...CORS, 'Cache-Control': 'no-store', 'X-Dec1-Empty': '1' } })
        : reply(cur.value, 200, { 'X-Rev': rev });
    }
    if (request.method === 'PUT') {
      const expected = request.headers.get('If-Match');
      if (expected !== null && expected !== rev) return reply({ error: 'modifié entre-temps', rev }, 412, { 'X-Rev': rev });
      const text = await request.text();
      if (new TextEncoder().encode(text).length > MAX_BYTES) return reply({ error: 'trop volumineux' }, 413);
      let s;
      try { s = JSON.parse(text); } catch { return reply({ error: 'JSON illisible' }, 400); }
      if (!sl.ok(s)) return reply({ error: 'contenu non reconnu' }, 400);
      if (sl.backup && cur.value !== null) {
        const bkey = `backup:${sl.key}:${new Date().toISOString().slice(0, 10)}`;
        if ((await env.DEC1.get(bkey)) === null) await env.DEC1.put(bkey, cur.value, { expirationTtl: BACKUP_DAYS * 86400 });
      }
      const next = crypto.randomUUID();
      await env.DEC1.put(sl.key, text, { metadata: { rev: next } });
      return reply({ ok: true, rev: next }, 200, { 'X-Rev': next });
    }
    return reply({ error: 'méthode non prise en charge' }, 405);
  },
};
