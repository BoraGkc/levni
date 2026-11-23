// dither element and screen pass: defaults, silly inputs, determinism, presets.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { compose } from '../src/index.mjs';
import { bayer, screenRaster, SCREEN_PRESETS } from '../src/dither.mjs';

assert.deepEqual(bayer(2), [[0, 2], [3, 1]]);
assert.equal(new Set(bayer(8).flat()).size, 64);

const t0 = Date.now();
const cases = [
  { type: 'dither', x: 0, y: 0, w: 1200, h: 673 },
  { type: 'dither', x: 600, y: 336, r: 200, mode: 'radial', colors: ['coral', 'mustard'] },
  { type: 'dither', x: 0, y: 0, w: 400, h: 300, mode: 'noise', pattern: 'dot' },
  { type: 'dither', x: 0, y: 0, w: 400, h: 300, pattern: 'plus', angle: 0, matrix: 2 },
  { type: 'dither', x: 0, y: 0, w: 1e6, h: 1e6, cell: 0.1, matrix: 7, pattern: 'nope', gap: 9, from: -3, to: 40 },
  { type: 'dither', x: 0, y: 0, w: 0, h: -5, colors: [] },
];
for (const e of cases) {
  const a = (await compose({ seed: 3, elements: [e] })).svg;
  assert.doesNotMatch(a, /NaN|undefined|Infinity/, JSON.stringify(e));
  assert.equal(a, (await compose({ seed: 3, elements: [e] })).svg, 'deterministic');
}
// the huge field is capped, not millions of cells
assert.ok((await compose({ elements: [cases[4]] })).svg.length < 3e6);

const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#7FA0D0' } }).png().toBuffer();
for (const p of Object.keys(SCREEN_PRESETS)) {
  const out = await screenRaster(png, p);
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 120); assert.equal(meta.height, 80);
}
// flat paper stays flat paper
const paper = await sharp({ create: { width: 60, height: 60, channels: 3, background: '#F4F2EC' } }).png().toBuffer();
const { data } = await sharp(await screenRaster(paper, { inks: ['#0A3FB0'] })).raw().toBuffer({ resolveWithObject: true });
assert.ok(data.every((v, i) => v === [0xf4, 0xf2, 0xec][i % 3]));
await assert.rejects(() => screenRaster(png, 'nope'), /unknown screen preset/);
assert.ok(Date.now() - t0 < 15000, 'fast');
console.log('dither ok');
