// POST /api/join: the newsletter and Folio crew sign-up, stored in our own D1 database.
// No IP address, no user agent, no tracking. Mail goes out later through a mail service.
interface Env { JOIN_DB: D1Database }

const ROLES = new Set(['illustrators', 'type', 'riso', 'icons', 'agents', 'sceptics', 'oss', 'brand', 'miniature', 'sketch']);
const SOURCES = new Set(['join', 'footer', 'home', 'community']);
const HOSTS = /^https?:\/\/(levni\.dev|[a-z0-9-]+\.levni\.pages\.dev|levni\.pages\.dev|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$/;
const EMAIL = /^[^\s@<>()",;:]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : '');

function reply(req: Request, ok: boolean, code: string, status = ok ? 200 : 400) {
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  if (wantsJson) return Response.json({ ok, code }, { status, headers: { 'cache-control': 'no-store' } });
  const back = new URL('/join/', req.url);
  back.searchParams.set(ok ? 'ok' : 'error', code);
  return Response.redirect(back.toString(), 303);
}

async function read(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  return { ...Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')), roles: form.getAll('roles') };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('origin');
  if (origin && !HOSTS.test(origin)) return reply(request, false, 'origin', 403);
  if (Number(request.headers.get('content-length') || 0) > 4000) return reply(request, false, 'size', 413);

  const body = await read(request);
  // Bots fill the hidden field or post faster than a person can type: say yes, store nothing.
  if (clean(body.website, 200)) return reply(request, true, 'joined');
  const t = Number(body.t);
  if (Number.isFinite(t) && t > 0 && Date.now() - t < 1500) return reply(request, true, 'joined');

  const email = clean(body.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return reply(request, false, 'email');
  const now = new Date().toISOString();

  if (body.action === 'leave') {
    await env.JOIN_DB.prepare('UPDATE crew SET unsubscribed_at = ?1, roles = NULL, name = NULL, link = NULL, updated_at = ?1 WHERE email = ?2').bind(now, email).run();
    return reply(request, true, 'left');
  }

  const rawRoles = Array.isArray(body.roles) ? body.roles : typeof body.roles === 'string' ? body.roles.split(',') : [];
  const roles = [...new Set(rawRoles.map((r) => clean(r, 20)).filter((r) => ROLES.has(r)))].join(',');
  const name = clean(body.name, 80) || null;
  let link: string | null = clean(body.link, 200) || null;
  if (link && !/^https:\/\/[^\s]+$/i.test(link)) link = null;
  const source = SOURCES.has(String(body.source)) ? String(body.source) : 'join';

  await env.JOIN_DB.prepare(
    `INSERT INTO crew (email, name, link, roles, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(email) DO UPDATE SET
       roles = COALESCE(NULLIF(excluded.roles, ''), crew.roles),
       name = COALESCE(excluded.name, crew.name),
       link = COALESCE(excluded.link, crew.link),
       unsubscribed_at = NULL,
       updated_at = excluded.updated_at`,
  ).bind(email, name, link, roles, source, now).run();
  return reply(request, true, roles ? 'crew' : 'joined');
};

