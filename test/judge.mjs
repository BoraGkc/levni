// Judge tests: mocked adapter and mocked fetch, no network.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { score, pick } from '../src/judge/index.mjs';
import { openrouter } from '../src/judge/openrouter.mjs';

// a deterministic rng so shuffles are reproducible
const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);

// mocked adapter: image is a number-like label; score looked up in a table
const table = { a: 1, b: 2.5, c: 2.45, d: 0.5 };
const calls = [];
const adapter = { score: async (img, o) => { calls.push([img, o.brief]); return { score: table[img], notes: `n-${img}` }; } };

assert.deepEqual(await score('b', { brief: 'x', adapter }), { score: 2.5, notes: 'n-b' });

calls.length = 0;
let r = await pick(['a', 'b', 'd'], { brief: 'x', adapter, rng: lcg(1) });
assert.equal(r.index, 1);
assert.equal(r.tie, false);
assert.deepEqual(r.scores, [1, 2.5, 0.5]);
assert.equal(calls.length, 6, 'each image scored twice');
assert.ok(calls.every((c) => c[1] === 'x'));

// within 0.15 -> tie, said so
r = await pick(['a', 'b', 'c'], { adapter, rng: lcg(2) });
assert.equal(r.tie, true);
assert.deepEqual(r.tied, [1, 2]);
assert.match(r.notes[0], /^tie:/);

// each pass runs in its own shuffled order
const order = [];
await pick(['a', 'b'], { adapter: { score: async (img) => { order.push(img); return { score: 1 }; } }, rng: lcg(7) });
assert.equal(order.length, 4);

// scoreMany is used when present, in shuffled order, results mapped back
let manyCalls = 0;
const many = { score: async () => { throw new Error('unused'); }, scoreMany: async (imgs) => { manyCalls++; return imgs.map((i) => ({ score: table[i] })); } };
r = await pick(['d', 'a', 'b'], { adapter: many, rng: lcg(3) });
assert.equal(manyCalls, 2);
assert.equal(r.index, 2);

await assert.rejects(pick(['a'], { adapter }), /at least two/);
await assert.rejects(score('a', { adapter: {} }), /score\(image/);
await assert.rejects(score('a', { adapter: { score: async () => ({}) } }), /numeric/);

// openrouter adapter with mocked fetch
const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer();
const reqs = [];
const mockFetch = async (url, init) => {
  const body = JSON.parse(init.body);
  reqs.push({ url, headers: init.headers, body });
  return { ok: true, status: 200, json: async () => ({ answers: { score: { score: 2, confidence: 0.8 } } }) };
};
const or = openrouter({ fetch: mockFetch, apiKey: 'test-key', model: 'm/x', concurrency: 2 });
const s = await or.score(png, { brief: 'rockets' });
assert.equal(s.score, 2);
assert.match(s.notes, /confidence 0.80/);
assert.equal(reqs[0].body.model, 'm/x');
assert.equal(reqs[0].headers.authorization, 'Bearer test-key');
assert.match(reqs[0].body.state[0], /Brief: rockets/);
assert.match(reqs[0].body.state[1].image_url.url, /^data:image\/jpeg;base64,/);
assert.equal(reqs[0].body.questions.score.criteria.length, 4);
const batch = await or.scoreMany([png, png, png], { brief: 'b' });
assert.equal(batch.length, 3);
assert.equal(reqs.length, 4);

// errors and a missing key
const bad = openrouter({ apiKey: 'k', fetch: async () => ({ ok: false, status: 429, json: async () => ({ error: 'slow down' }) }) });
await assert.rejects(bad.score(png, {}), /openrouter 429/);
const saved = process.env.OPENROUTER_API_KEY; delete process.env.OPENROUTER_API_KEY;
await assert.rejects(openrouter({ fetch: mockFetch }).score(png, {}), /OPENROUTER_API_KEY is not set/);
if (saved) process.env.OPENROUTER_API_KEY = saved;

console.log('judge: ok');
