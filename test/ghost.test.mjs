// Ghost adapter tests with a mocked fetch: no network, no credentials.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, listImagelessDrafts, planPlacements, attachPost, attachPlan, ghostCli, makeToken } from '../adapters/ghost/index.mjs';

const KEY = 'abc123:' + 'ab'.repeat(16);
const h2 = (t) => ({ type: 'extended-heading', tag: 'h2', children: [{ type: 'text', text: t }] });
const para = (t) => ({ type: 'paragraph', children: [{ type: 'text', text: t }] });
const doc = (...c) => JSON.stringify({ root: { children: c } });

function fakeGhost(posts) {
  const calls = [];
  const f = async (url, opts = {}) => {
    const path = url.replace('https://ghost.test/ghost/api/admin', '');
    calls.push({ path, method: opts.method || 'GET', body: opts.body });
    const json = (status, b) => ({ ok: status < 400, status, json: async () => b });
    if (path.startsWith('/posts/?')) {
      const drafts = Object.values(posts).filter((p) => p.status === 'draft');
      return json(200, { posts: drafts, meta: { pagination: { next: null } } });
    }
    if (path.startsWith('/images/upload/')) return json(200, { images: [{ url: `https://ghost.test/content/images/${calls.length}.webp` }] });
    const m = path.match(/^\/posts\/([^/]+)\//);
    if (m && opts.method === 'PUT') { Object.assign(posts[m[1]], JSON.parse(opts.body).posts[0]); return json(200, { posts: [posts[m[1]]] }); }
    if (m) return posts[m[1]] ? json(200, { posts: [posts[m[1]]] }) : json(404, { errors: ['nope'] });
    return json(404, {});
  };
  return { f, calls };
}

// token shape
assert.equal(makeToken(KEY).split('.').length, 3);
assert.throws(() => makeToken('nocolon'));

// 1. draft filtering
{
  const { f } = fakeGhost({
    a: { id: 'a', slug: 'a', title: 'A', status: 'draft', html: '<p>x</p>', feature_image: null },
    b: { id: 'b', slug: 'b', title: 'B', status: 'draft', html: '<p>x</p>', feature_image: 'https://x/c.jpg' },
    c: { id: 'c', slug: 'c', title: 'C', status: 'draft', html: '<p><img src="u"></p>', feature_image: null },
    d: { id: 'd', slug: 'd', title: 'D', status: 'published', html: '<p>x</p>', feature_image: null },
  });
  const r = await listImagelessDrafts(createClient({ url: 'https://ghost.test', key: KEY, fetch: f }));
  assert.deepEqual(r.imageless.map((p) => p.id), ['a']);
  assert.equal(r.withImages, 2);
}

// 2. heading match with curly quotes, whitespace, case
{
  const lex = JSON.parse(doc(h2('Intro'), para('p'), h2('It’s  “quoted”  here'), para('p'), para('q'), h2('Last'), para('z')));
  const { slots, errors } = planPlacements(lex, [{ after: `it's "quoted" here`, alt: 'x' }]);
  assert.deepEqual(errors, []);
  assert.equal(slots[0].index, 4); // heading at 2, plus heading and first paragraph
}

// 3. refusal of two images in one section; unknown heading refused too
{
  const lex = JSON.parse(doc(h2('One'), para('p'), h2('Two'), para('p')));
  const r = planPlacements(lex, [{ after: 'One' }, { after: 'one' }]);
  assert.equal(r.slots.length, 1);
  assert.match(r.errors[0], /two images in one section/);
  assert.match(planPlacements(lex, [{ after: 'Missing heading' }]).errors[0], /not found/);
  // an image never lands past its section even when the section has only a heading
  const tight = JSON.parse(doc(h2('A'), h2('B'), para('p')));
  assert.equal(planPlacements(tight, [{ after: 'A' }]).slots[0].index, 1);
}

// 4. dry run writes nothing; refusal sends nothing; apply sends only safe fields
{
  const dir = mkdtempSync(join(tmpdir(), 'ghost-test-'));
  writeFileSync(join(dir, 'a.webp'), Buffer.from('RIFF'));
  const mk = () => ({
    p1: { id: 'p1', slug: 'first-post', status: 'draft', updated_at: 't0', feature_image: null, lexical: doc(h2('One'), para('p'), h2('Two'), para('p')) },
    p2: { id: 'p2', slug: 'live', status: 'published', updated_at: 't0', feature_image: null, lexical: doc(h2('One')) },
    p3: { id: 'p3', slug: 'owned', status: 'draft', updated_at: 't0', feature_image: 'https://x/own.jpg', lexical: doc(h2('One')) },
  });
  const entry = { id: 'p1', cover: { image: 'a.webp', alt: 'cover alt' }, inline: [{ image: 'a.webp', alt: 'i1', after: 'One' }, { image: 'a.webp', alt: 'i2', after: 'Two' }] };

  let posts = mk(), g = fakeGhost(posts);
  const client = createClient({ url: 'https://ghost.test', key: KEY, fetch: g.f });
  const lines = [];
  const plan = join(dir, 'plan.json');
  writeFileSync(plan, JSON.stringify({ posts: [entry, { id: 'p2', cover: { image: 'a.webp' } }, { id: 'p3', cover: { image: 'a.webp' } }, { id: 'gone', cover: { image: 'a.webp' } }] }));
  await attachPlan(client, plan, { log: (l) => lines.push(l) });
  const out = lines.join('\n');
  assert.match(out, /p1: planned/);
  assert.match(out, /would do: cover/);
  assert.match(out, /would do: inline after "One"/);
  assert.match(out, /p2: skipped/);
  assert.match(out, /already has images/);
  assert.match(out, /not found/);
  assert.match(out, /dry run/);
  assert.ok(g.calls.every((c) => c.method === 'GET'), 'dry run only reads');

  // refused plan: two images in one section, no write
  posts = mk(); g = fakeGhost(posts);
  const bad = await attachPost(createClient({ url: 'https://ghost.test', key: KEY, fetch: g.f }), { ...entry, inline: [{ image: 'a.webp', after: 'One' }, { image: 'a.webp', after: 'one' }] }, { apply: true, baseDir: dir });
  assert.equal(bad.status, 'refused');
  assert.ok(g.calls.every((c) => c.method === 'GET'));

  // apply
  posts = mk(); g = fakeGhost(posts);
  const ok = await attachPost(createClient({ url: 'https://ghost.test', key: KEY, fetch: g.f }), entry, { apply: true, baseDir: dir });
  assert.equal(ok.status, 'applied');
  const put = g.calls.find((c) => c.method === 'PUT');
  assert.ok(!/newsletter|email/i.test(put.path), 'never a newsletter');
  assert.deepEqual(Object.keys(JSON.parse(put.body).posts[0]).sort(), ['feature_image', 'feature_image_alt', 'lexical', 'updated_at']);
  const kids = JSON.parse(posts.p1.lexical).root.children;
  assert.deepEqual(kids.map((n) => n.type), ['extended-heading', 'paragraph', 'image', 'extended-heading', 'paragraph', 'image']);
  assert.equal(kids[2].alt, 'i1');
  assert.equal(g.calls.filter((c) => c.path.startsWith('/images/upload/')).length, 3);
}

// 5. CLI prints usage without env
{
  const saved = [process.env.GHOST_ADMIN_API_URL, process.env.GHOST_ADMIN_API_KEY];
  delete process.env.GHOST_ADMIN_API_URL; delete process.env.GHOST_ADMIN_API_KEY;
  const lines = [];
  assert.equal(await ghostCli(['drafts'], { log: (l) => lines.push(l) }), 1);
  assert.match(lines.join('\n'), /GHOST_ADMIN_API_KEY/);
  assert.match(lines.join('\n'), /levni ghost attach/);
  if (saved[0]) process.env.GHOST_ADMIN_API_URL = saved[0];
  if (saved[1]) process.env.GHOST_ADMIN_API_KEY = saved[1];
}
console.log('ghost adapter: ok');
