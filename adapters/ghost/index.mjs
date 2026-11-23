// Levni Ghost adapter: pull imageless drafts, attach a cover and inline images drawn by Levni.
// Only global fetch and node:crypto; credentials come from the environment, never from files.
//   GHOST_ADMIN_API_URL  site URL, e.g. https://example.com
//   GHOST_ADMIN_API_KEY  Admin API key "id:secret"
// Only drafts are touched. Nothing here ever sends a newsletter or publishes a post.
import crypto from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export function makeToken(key, now = Math.floor(Date.now() / 1000)) {
  const [kid, secret] = String(key || '').split(':');
  if (!kid || !secret) throw new Error('GHOST_ADMIN_API_KEY must look like id:secret');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = b64({ alg: 'HS256', typ: 'JWT', kid });
  const p = b64({ iat: now, exp: now + 300, aud: '/admin/' });
  return `${h}.${p}.${crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${h}.${p}`).digest('base64url')}`;
}

export class GhostError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createClient({ url = process.env.GHOST_ADMIN_API_URL, key = process.env.GHOST_ADMIN_API_KEY, fetch: f = globalThis.fetch } = {}) {
  const base = String(url || '').replace(/\/$/, '');
  if (!base || !key) throw new Error('GHOST_ADMIN_API_URL and GHOST_ADMIN_API_KEY are required');
  makeToken(key); // validates the shape early
  async function api(path, opts = {}) {
    const res = await f(`${base}/ghost/api/admin${path}`, {
      ...opts,
      headers: { Authorization: `Ghost ${makeToken(key)}`, 'Accept-Version': 'v5.0', 'User-Agent': 'levni-ghost-adapter', ...(opts.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new GhostError(res.status, `${res.status} ${JSON.stringify(body).slice(0, 300)}`);
    return body;
  }
  return { api };
}

// ---- pulling drafts ----------------------------------------------------------------------------

export const hasImages = (post) => Boolean(post.feature_image) || /<img\b/i.test(post.html || '');

/** Drafts with no cover and no inline image. Drafts that already have any image are never offered. */
export async function listImagelessDrafts(client) {
  const posts = [];
  for (let page = 1; ; page++) {
    const j = await client.api(`/posts/?filter=status:draft&formats=html&limit=50&page=${page}&fields=id,slug,title,html,feature_image,updated_at`);
    posts.push(...(j.posts || []));
    if (!j.meta?.pagination?.next) break;
  }
  const imageless = posts.filter((p) => !hasImages(p));
  return { total: posts.length, imageless, withImages: posts.length - imageless.length };
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
export const htmlToMarkdown = (html) => decode(String(html || '').replace(/<h2[^>]*>/g, '\n## ').replace(/<h3[^>]*>/g, '\n### ').replace(/<\/h[23]>/g, '\n').replace(/<\/p>/g, '\n').replace(/<li>/g, '- ').replace(/<[^>]+>/g, '')).replace(/\n{2,}/g, '\n').trim();
const folderName = (slug) => slug.split('-').slice(0, 3).join('-').slice(0, 30) || 'post';

/** Pull imageless drafts into <dir>/<name>/article.md + meta.json. Without apply nothing is written. */
export async function pullDrafts(client, dir, { apply = false, log = console.log } = {}) {
  const { total, imageless, withImages } = await listImagelessDrafts(client);
  const known = new Set();
  if (existsSync(dir)) for (const d of readdirSync(dir)) {
    const m = join(dir, d, 'meta.json');
    if (existsSync(m)) known.add(JSON.parse(readFileSync(m, 'utf8')).id);
  }
  let pulled = 0, already = 0;
  for (const p of imageless) {
    if (known.has(p.id)) { already++; continue; }
    let name = folderName(p.slug), n = 2;
    while (existsSync(join(dir, name))) name = `${folderName(p.slug)}-${n++}`;
    if (apply) {
      mkdirSync(join(dir, name), { recursive: true });
      writeFileSync(join(dir, name, 'article.md'), `# ${p.title}\n\n${htmlToMarkdown(p.html)}\n`);
      writeFileSync(join(dir, name, 'meta.json'), JSON.stringify({ id: p.id, slug: p.slug, title: p.title, updated_at: p.updated_at }, null, 1) + '\n');
    }
    log(`${apply ? 'pulled' : 'would pull'}: ${name}  ${p.title.slice(0, 70)}`);
    pulled++;
  }
  log(`${total} drafts: ${pulled} imageless ${apply ? 'pulled' : '(dry run, use --apply to write)'}, ${already} already pulled, ${withImages} with their own images (left alone)`);
  return { total, pulled, already, withImages };
}

// ---- placing images in a Lexical document ------------------------------------------------------

const textOf = (n) => (n.text ?? '') + (n.children || []).map(textOf).join('');
/** Heading comparison: curly vs straight quotes, any whitespace, letter case. */
export const norm = (s) => String(s).replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
const isH2 = (n) => /heading$/.test(n.type) && (n.tag || 'h2') === 'h2';
const isImage = (n) => n.type === 'image';

export const imageCard = (src, alt, width = 1200, height = 673) => ({ type: 'image', version: 1, src, width, height, title: '', alt, caption: '', cardWidth: 'regular', href: '' });

/**
 * Work out where each inline image goes. Pure: no network, no writes.
 * inline: [{ after: 'Heading text', alt }]. Returns { slots: [{ index, section, heading, item }], errors: [] }.
 * Refuses (errors) a heading that is not found or ambiguous, and two images in the same section.
 */
export function planPlacements(lexical, inline) {
  const root = lexical.root.children;
  const hs = root.map((n, i) => [n, i]).filter(([n]) => isH2(n));
  const errors = [];
  const slots = [];
  const used = new Map();
  for (const item of inline) {
    const want = norm(item.after || '');
    if (!want) { errors.push('an inline image has no "after" heading'); continue; }
    let hits = hs.filter(([n]) => norm(textOf(n)) === want);
    if (!hits.length) hits = hs.filter(([n]) => norm(textOf(n)).startsWith(want.slice(0, 20)) && want.length >= 8);
    if (hits.length !== 1) { errors.push(hits.length ? `heading "${item.after}" matches ${hits.length} sections` : `heading not found: "${item.after}"`); continue; }
    const [hNode, hIndex] = hits[0];
    const section = hs.findIndex(([, i]) => i === hIndex);
    if (used.has(section)) { errors.push(`two images in one section: "${textOf(hNode).slice(0, 50)}"`); continue; }
    used.set(section, true);
    const next = hs[section + 1] ? hs[section + 1][1] : root.length;
    // after the heading and its first paragraph, but never past the end of the section
    slots.push({ index: Math.min(hIndex + 2, next), section, heading: textOf(hNode), item });
  }
  return { slots, errors };
}

/** Insert cards (bottom up so indexes stay valid). cards: [{ slot, card }]. */
export function insertCards(lexical, cards) {
  const root = lexical.root.children;
  for (const { slot, card } of [...cards].sort((a, b) => b.slot.index - a.slot.index)) root.splice(Math.min(slot.index, root.length), 0, card);
  return lexical;
}

// ---- attaching ---------------------------------------------------------------------------------

async function imageFile(spec, baseDir, tmp, which) {
  if (spec.image) return resolve(baseDir, spec.image);
  if (!spec.scene) throw new Error(`${which}: needs "scene" (a Levni scene file) or "image" (a webp/png/jpg file)`);
  const { render } = await import('../../src/index.mjs');
  const scene = typeof spec.scene === 'string' ? JSON.parse(readFileSync(resolve(baseDir, spec.scene), 'utf8')) : spec.scene;
  const out = join(tmp, `${which.replace(/[^a-z0-9]+/gi, '-')}.webp`);
  await render(scene, out);
  return out;
}
const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

async function uploadImage(client, file, ref) {
  const ext = file.split('.').pop().toLowerCase();
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: MIME[ext] || 'image/webp' }), ref);
  form.append('purpose', 'image');
  form.append('ref', ref);
  const url = (await client.api('/images/upload/', { method: 'POST', body: form })).images[0].url;
  let size = [1200, 673];
  try { const m = await (await import('sharp')).default(file).metadata(); if (m.width && m.height) size = [m.width, m.height]; } catch { /* keep default */ }
  return { url, size };
}

/**
 * Attach the images of one plan entry to one draft.
 * entry: { id, cover?: { scene|image, alt }, inline?: [{ scene|image, alt, after }] }
 * Returns { status, edits, notes }. status: 'planned' (dry), 'applied', 'skipped' or 'refused'.
 */
export async function attachPost(client, entry, { apply = false, baseDir = process.cwd() } = {}) {
  const label = entry.id;
  let post;
  try { ({ posts: [post] } = await client.api(`/posts/${entry.id}/?formats=lexical`)); } catch (err) {
    if (err.status === 404) return { status: 'skipped', edits: [], notes: [`${label}: post not found (deleted?)`] };
    return { status: 'skipped', edits: [], notes: [`${label}: read failed: ${String(err.message).slice(0, 80)}`] };
  }
  if (!post) return { status: 'skipped', edits: [], notes: [`${label}: post not found`] };
  if (post.status !== 'draft') return { status: 'skipped', edits: [], notes: [`${post.slug}: status ${post.status}, drafts only`] };
  const lexical = JSON.parse(post.lexical || '{"root":{"children":[]}}');
  if (post.feature_image || lexical.root.children.some(isImage)) return { status: 'skipped', edits: [], notes: [`${post.slug}: already has images, left untouched`] };

  const inline = entry.inline || [];
  const { slots, errors } = planPlacements(lexical, inline);
  if (errors.length) return { status: 'refused', edits: [], notes: errors.map((e) => `${post.slug}: ${e}`) };

  const edits = [];
  if (entry.cover) edits.push(`cover (feature image)${entry.cover.alt ? `: "${entry.cover.alt}"` : ''}`);
  for (const s of slots) edits.push(`inline after "${s.heading.slice(0, 50)}" (section ${s.section + 1})${s.item.alt ? `: "${s.item.alt}"` : ''}`);
  if (!apply) return { status: 'planned', edits, notes: [] };

  const tmp = mkdtempSync(join(tmpdir(), 'levni-ghost-'));
  const slug = post.slug.slice(0, 50);
  const update = { updated_at: post.updated_at };
  if (entry.cover) {
    const up = await uploadImage(client, await imageFile(entry.cover, baseDir, tmp, 'cover'), `${slug}-levni-cover.webp`);
    update.feature_image = up.url;
    update.feature_image_alt = entry.cover.alt || '';
  }
  const cards = [];
  for (const [i, s] of slots.entries()) {
    const up = await uploadImage(client, await imageFile(s.item, baseDir, tmp, `inline-${i + 1}`), `${slug}-levni-inline-${i + 1}.webp`);
    cards.push({ slot: s, card: imageCard(up.url, s.item.alt || '', up.size[0], up.size[1]) });
  }
  insertCards(lexical, cards);
  update.lexical = JSON.stringify(lexical);
  // Only these fields are sent: no status change, no newsletter, no email.
  await client.api(`/posts/${entry.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ posts: [update] }) });
  return { status: 'applied', edits, notes: [] };
}

/** Run a whole plan file ({ posts: [...] }). Dry run unless apply. */
export async function attachPlan(client, planPath, { apply = false, log = console.log } = {}) {
  const file = resolve(planPath);
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(plan.posts)) throw new Error('plan needs a "posts" array (see docs/ghost.md)');
  const results = [];
  for (const entry of plan.posts) {
    if (!entry.id) { log('skipped: an entry has no "id"'); continue; }
    const r = await attachPost(client, entry, { apply, baseDir: dirname(file) });
    results.push({ id: entry.id, ...r });
    log(`${entry.id}: ${r.status}`);
    for (const e of r.edits) log(`  ${apply ? 'did' : 'would do'}: ${e}`);
    for (const n of r.notes) log(`  ${n}`);
  }
  if (!apply) log('dry run: nothing uploaded or changed. Run again with --apply to write.');
  return results;
}

// ---- CLI ---------------------------------------------------------------------------------------

export const GHOST_USAGE = `levni ghost: attach Levni images to Ghost drafts

  levni ghost drafts [--dir <folder>] [--apply]
      List drafts that have no images at all; with --apply, pull them to <folder>/<name>/article.md + meta.json
      (default folder: ./levni-drafts). Drafts with their own cover or inline images are never touched.
  levni ghost attach <plan.json> [--apply]
      Upload a cover and inline images and place them after the planned h2 headings. Dry run unless --apply.

Environment (never put these in files):
  GHOST_ADMIN_API_URL   your site, e.g. https://example.com
  GHOST_ADMIN_API_KEY   Admin API key as id:secret (Ghost Admin > Settings > Integrations)

Only drafts are edited. No post is published and no newsletter is ever sent. Plan format: docs/ghost.md`;

export async function ghostCli(args, { log = console.log, client } = {}) {
  const [sub, ...rest] = args;
  const apply = rest.includes('--apply');
  const optv = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  if (sub !== 'drafts' && sub !== 'attach') { log(GHOST_USAGE); return sub && sub !== 'help' && sub !== '--help' ? 1 : 0; }
  if (sub === 'attach' && !rest.find((a) => !a.startsWith('--'))) { log(GHOST_USAGE); return 1; }
  if (!client) {
    if (!process.env.GHOST_ADMIN_API_URL || !process.env.GHOST_ADMIN_API_KEY) { log(`missing GHOST_ADMIN_API_URL or GHOST_ADMIN_API_KEY\n\n${GHOST_USAGE}`); return 1; }
    client = createClient();
  }
  if (sub === 'drafts') await pullDrafts(client, resolve(optv('dir') || 'levni-drafts'), { apply, log });
  else {
    const planFile = rest.find((a, i) => !a.startsWith('--') && rest[i - 1] !== '--dir');
    const results = await attachPlan(client, planFile, { apply, log });
    if (results.some((r) => r.status === 'refused')) return 1;
  }
  return 0;
}
