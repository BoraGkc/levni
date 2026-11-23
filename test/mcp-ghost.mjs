// Ghost MCP tools with a fake Ghost: no network, no credentials.
import assert from 'node:assert/strict';
import { createClient } from '../adapters/ghost/index.mjs';
import { callGhost, GHOST_TOOLS } from '../src/mcp-ghost.mjs';
import { handle } from '../src/mcp.mjs';

const KEY = 'abc123:' + 'ab'.repeat(16);
const h2 = (t) => ({ type: 'extended-heading', tag: 'h2', children: [{ type: 'text', text: t }] });
const para = (t) => ({ type: 'paragraph', children: [{ type: 'text', text: t }] });
const posts = {
  a: { id: 'a', slug: 'a-post', title: 'A post', status: 'draft', updated_at: 't1', feature_image: null,
    html: '<h2>First part</h2><p>one</p><h2>Second part</h2><p>two</p>',
    lexical: JSON.stringify({ root: { children: [h2('First part'), para('one'), h2('Second part'), para('two')] } }) },
  b: { id: 'b', slug: 'b-post', title: 'B post', status: 'draft', updated_at: 't1', feature_image: 'https://x/c.jpg', html: '<p>x</p>', lexical: '{"root":{"children":[]}}' },
};
const calls = [];
const fetch = async (url, opts = {}) => {
  const path = url.replace('https://ghost.test/ghost/api/admin', '');
  calls.push({ path, method: opts.method || 'GET' });
  const json = (status, b) => ({ ok: status < 400, status, json: async () => b });
  if (path.startsWith('/posts/?')) return json(200, { posts: Object.values(posts), meta: { pagination: { next: null } } });
  if (path.startsWith('/images/upload/')) return json(200, { images: [{ url: `https://ghost.test/i/${calls.length}.webp` }] });
  const m = path.match(/^\/posts\/([^/]+)\//);
  if (m && opts.method === 'PUT') { Object.assign(posts[m[1]], JSON.parse(opts.body).posts[0], { updated_at: 't2' }); return json(200, {}); }
  if (m) return posts[m[1]] ? json(200, { posts: [posts[m[1]]] }) : json(404, {});
  return json(404, {});
};
const client = createClient({ url: 'https://ghost.test', key: KEY, fetch });
const run = (name, args) => callGhost(name, args, { client });

// tools appear only with credentials
const list = async () => (await handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result.tools.map((t) => t.name);
delete process.env.GHOST_ADMIN_API_URL; delete process.env.GHOST_ADMIN_API_KEY;
assert.ok(!(await list()).includes('ghost_drafts'));
process.env.GHOST_ADMIN_API_URL = 'https://ghost.test'; process.env.GHOST_ADMIN_API_KEY = KEY;
assert.deepEqual((await list()).slice(-3), GHOST_TOOLS.map((t) => t.name));

// drafts: only imageless, with headings
const d = (await run('ghost_drafts', {}))[0].text;
assert.match(d, /1 without images, 1 with their own images/);
assert.match(d, /h2: First part \| Second part/);
assert.match((await run('ghost_drafts', { id: 'a' }))[0].text, /- Second part/);

// preview: no writes, previews returned, token given
const scene = { seed: 1, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 300 }] };
const plan = { id: 'a', cover: { scene, alt: 'rocket' }, inline: [{ after: 'Second part', scene, alt: 'again' }] };
const before = calls.length;
const pv = await run('ghost_preview', plan);
assert.ok(calls.slice(before).every((c) => c.method === 'GET'), 'preview must not write');
assert.equal(pv.filter((c) => c.type === 'image').length, 2);
const token = pv[0].text.match(/token: (\w+)/)[1];

// apply: wrong token and changed plan refused; right token writes once
await assert.rejects(run('ghost_apply', { ...plan, token: 'nope' }), /token does not match/);
await assert.rejects(run('ghost_apply', { ...plan, inline: [], token }), /token does not match/);
const ap = await run('ghost_apply', { ...plan, token });
assert.match(ap[0].text, /^applied/);
assert.equal(calls.filter((c) => c.method === 'PUT').length, 1);
assert.ok(posts.a.feature_image && posts.a.status === 'draft');
// the draft changed, so the old token is dead, and a draft with images is skipped
await assert.rejects(run('ghost_apply', { ...plan, token }), /token does not match/);
assert.match((await run('ghost_preview', { id: 'b', cover: { scene } }))[0].text, /^skipped/);

console.log('mcp ghost: tools gated, preview read-only, token-guarded apply ok');
