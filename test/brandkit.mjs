// Brand kit: brandFromHtml on fixtures (no network), expandKit shapes, a reduced renderKit into a temp dir, determinism.
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { brandFromHtml, brandFromUrl, expandKit, renderKit, KIT_ASSETS, seededInks } from '../src/brandkit.mjs';

const HEX = /^#[0-9A-F]{6}$/;

// 1. rich page: meta tags, theme colour, CSS variables, a few repeated colours, greys and white that must be dropped
const rich = `<!doctype html><html><head>
<title>Home | Feneri &amp; Co. &ndash; Slow ferries across the Bosphorus</title>
<meta property="og:site_name" content="Feneri">
<meta name="description" content="Slow ferries across the Bosphorus. Daily crossings, quiet decks and good tea. Book a seat in two taps and skip the queue entirely.">
<meta name="theme-color" content="#14213D">
<meta name="msapplication-TileColor" content="#FCA311">
<style>
:root{--brand-primary:#3A86A8;--text:#222222;--bg:#ffffff;--muted:#999999}
.hero{background:#14213d;color:#fff}
.btn{background:rgb(252,163,17);border:1px solid #cccccc}
.tag{color:#3a86a9}
</style>
<script>var x = "#ff00ff"; // never read</script>
</head><body style="background:#FFFFFF"><p style="color:#000">hi</p></body></html>`;
const a = brandFromHtml(rich, 'https://feneri.example/');
assert.equal(a.name, 'Feneri');
assert.equal(a.source.name, 'og:site_name');
assert.ok(a.tagline.startsWith('Slow ferries across the Bosphorus'), a.tagline);
assert.ok(a.tagline.length <= 90, 'tagline is a short line');
assert.ok(a.inks.length >= 3 && a.inks.length <= 4, `inks: ${a.inks}`);
assert.ok(a.inks.every((c) => HEX.test(c)), 'inks are #RRGGBB');
assert.equal(a.inks[0], '#14213D', 'theme-color leads');
assert.ok(a.inks.includes('#FCA311'), 'tile colour found');
assert.ok(!a.inks.some((c) => ['#FFFFFF', '#000000', '#222222', '#999999', '#CCCCCC', '#FF00FF'].includes(c)), 'whites, blacks, greys and script text dropped');
assert.equal(new Set(a.inks).size, a.inks.length);
assert.notEqual(a.source.inks, 'seeded');
assert.deepEqual(a, brandFromHtml(rich, 'https://feneri.example/'), 'pure and deterministic');

// 2. sparse page: only a title, nothing to take colours from -> seeded palette, and it says so
const sparse = '<html><head><title>Kumru Kahve | Ana Sayfa</title></head><body><h1>Merhaba</h1></body></html>';
const b = brandFromHtml(sparse, 'https://www.kumrukahve.com.tr/');
assert.equal(b.name, 'Kumru Kahve');
assert.equal(b.tagline, '');
assert.equal(b.source.inks, 'seeded');
assert.ok(b.source.notes.some((n) => /seeded/.test(n)));
assert.ok(b.inks.length >= 3 && b.inks.every((c) => HEX.test(c)));
assert.deepEqual(b.inks, brandFromHtml(sparse, 'https://www.kumrukahve.com.tr/').inks, 'seeded palette is stable');
const host = brandFromHtml('<html><body>x</body></html>', 'https://www.example-shop.co.uk/a');
assert.equal(host.name, 'Example-shop', 'host name as last resort');

// 3. garbage and empty: never throws, never invents
for (const junk of ['', '   ', '<<<>>>&&&', '\u0000\u0001<meta', '<title>', null, undefined, 42]) {
  const g = brandFromHtml(junk, undefined);
  assert.equal(g.name, '');
  assert.equal(g.tagline, '');
  assert.ok(g.inks.length >= 2 && g.inks.every((c) => HEX.test(c)), 'seeded fallback inks');
  assert.equal(g.source.inks, 'seeded');
}
assert.equal(brandFromHtml('<title>Home</title>', undefined).name, '', 'a generic title is not a name');
assert.equal(brandFromHtml('<meta name="theme-color" content="rgb(10, 120, 200)"><meta name="theme-color" content="#abc">', '').inks[0], '#0A78C8');

// brandFromUrl: input checks and a stubbed fetch (the test never touches the network)
await assert.rejects(brandFromUrl('not a url'), /not a valid URL/);
await assert.rejects(brandFromUrl('file:///etc/passwd'), /only http and https/);
const calls = [];
const stub = (type, body, status = 200) => async (url, init) => {
  calls.push([url, init]);
  return new Response(body, { status, headers: { 'content-type': type } });
};
const viaUrl = await brandFromUrl('https://feneri.example/', { fetchImpl: stub('text/html; charset=utf-8', rich) });
assert.equal(viaUrl.name, 'Feneri');
assert.equal(calls.length, 1, 'exactly one request');
assert.equal(calls[0][1].credentials, 'omit');
assert.match(calls[0][1].headers['user-agent'], /levni-brandkit/);
await assert.rejects(brandFromUrl('https://x.example/', { fetchImpl: stub('application/pdf', 'x') }), /did not return HTML/);
await assert.rejects(brandFromUrl('https://x.example/', { fetchImpl: stub('text/html', 'no', 503) }), /answered 503/);
await assert.rejects(brandFromUrl('https://x.example/', { fetchImpl: async () => { throw new Error('boom'); } }), /could not reach/);
const big = await brandFromUrl('https://x.example/', { maxBytes: 4096, fetchImpl: stub('text/html', `<title>Big</title><meta name="theme-color" content="#336699">${'<p>x</p>'.repeat(5000)}`) });
assert.equal(big.name, 'Big');
assert.ok(big.source.truncated, 'reads at most maxBytes');

// expandKit: shapes, defaults, only, errors
const brand = { name: 'Feneri', tagline: 'Slow ferries across the Bosphorus', mark: 'lighthouse', inks: ['#14213D', '#FCA311', '#3A86A8', '#EFEAE0'] };
const kit = expandKit({ brand });
assert.deepEqual(kit.assets.map((x) => x.name), KIT_ASSETS);
assert.equal(kit.brand.mark, 'lighthouse');
assert.equal(kit.brand.inks.length, 4);
assert.ok(kit.brand.words.length >= 2);
for (const x of kit.assets) {
  assert.ok(Array.isArray(x.files) && x.files.length, x.name);
  assert.ok(x.scene || x.spec, `${x.name} has a scene or spec`);
  assert.doesNotMatch(JSON.stringify(x), /NaN|undefined|Infinity/, x.name);
}
const files = kit.assets.flatMap((x) => x.files.map((f) => f.file));
for (const f of ['mark.png', 'mark.svg', 'favicon-32.png', 'favicon-180.png', 'palette.png', 'og.png', 'cover.webp', 'social-square.png', 'story.png', 'readme-banner.png', 'board.png', 'loop.webp']) assert.ok(files.includes(f), f);
assert.equal(kit.assets.find((x) => x.name === 'posters').scenes.length, 4, '4 posters by default');
assert.equal(expandKit({ brand, posters: 8 }).assets.find((x) => x.name === 'posters').scenes.length, 8);
assert.deepEqual(expandKit({ brand, only: ['og', 'mark'] }).assets.map((x) => x.name), ['mark', 'og']);
assert.equal(expandKit({ brand: { name: 'No Mark Co', tagline: 'Fresh bread every morning' } }).brand.mark.length > 0, true, 'a mark is picked');
assert.equal(expandKit({ brand: { name: 'No Mark Co' } }).brand.mark, expandKit({ brand: { name: 'No Mark Co' } }).brand.mark, 'the picked mark is stable');
assert.equal(expandKit({ brand: { name: 'Plain' } }).brand.inks.length, 4, 'inks default to a seeded set');
assert.deepEqual(seededInks(3), seededInks(3));
assert.throws(() => expandKit({ brand: {} }), /name/);
assert.throws(() => expandKit({ brand: { name: 'X', mark: 'no-such-prop' } }), /not a prop/);
assert.throws(() => expandKit({ brand: { name: 'X', inks: ['red'] } }), /not a #RRGGBB/);
assert.throws(() => expandKit({ brand, only: ['nope'] }), /unknown kit assets/);

// renderKit: a reduced set into a temp dir
const dir = mkdtempSync(join(tmpdir(), 'levni-kit-'));
try {
  const t0 = Date.now();
  const only = ['mark', 'favicon', 'palette', 'og', 'readme-banner'];
  const r = await renderKit({ brand, only }, dir);
  for (const f of ['mark.png', 'mark.svg', 'favicon-32.png', 'favicon-180.png', 'palette.png', 'og.png', 'readme-banner.png', 'brand.json', 'kit.json', 'index.html']) assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, 'board.png')), '`only` leaves the rest out');
  assert.equal(r.files.length, 10);
  const meta = async (f) => sharp(join(dir, f)).metadata();
  const mk = await meta('mark.png');
  assert.equal(mk.width, 1024); assert.equal(mk.height, 1024); assert.equal(mk.hasAlpha, true);
  const raw = await sharp(join(dir, 'mark.png')).ensureAlpha().raw().toBuffer();
  assert.equal(raw[3], 0, 'mark corner is transparent');
  assert.equal((await meta('favicon-32.png')).width, 32);
  assert.equal((await meta('favicon-180.png')).width, 180);
  const og = await meta('og.png');
  assert.equal(og.width, 1200); assert.equal(og.height, 630);
  const ban = await meta('readme-banner.png');
  assert.equal(ban.width, 1280); assert.equal(ban.height, 640);
  assert.match(readFileSync(join(dir, 'mark.svg'), 'utf8'), /^<svg/);
  const kj = JSON.parse(readFileSync(join(dir, 'kit.json'), 'utf8'));
  assert.equal(kj.files.length, 7);
  assert.ok(kj.files.every((f) => f.bytes > 0 && f.drawnBy));
  assert.equal(kj.files.find((f) => f.file === 'og.png').width, 1200);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.match(html, /<title>Feneri brand kit<\/title>/);
  assert.doesNotMatch(html, /<script|https?:\/\//, 'the index page is static and dependency-free');
  assert.ok(html.includes('#14213D'), 'index uses the brand inks');
  assert.equal(r.brand.name, 'Feneri');
  assert.ok(r.ms > 0 && typeof r.notes === 'object');

  // determinism: brand.json, and the pixels
  const a1 = readFileSync(join(dir, 'brand.json'), 'utf8'), p1 = readFileSync(join(dir, 'og.png'));
  const dir2 = mkdtempSync(join(tmpdir(), 'levni-kit-'));
  try {
    await renderKit({ brand, only: ['og'] }, dir2);
    assert.equal(readFileSync(join(dir2, 'brand.json'), 'utf8'), a1, 'brand.json is deterministic');
    assert.ok(readFileSync(join(dir2, 'og.png')).equals(p1), 'og.png is deterministic');
  } finally { rmSync(dir2, { recursive: true, force: true }); }
  console.log(`brandkit ok (${Date.now() - t0} ms for the reduced render)`);
} finally { rmSync(dir, { recursive: true, force: true }); }
