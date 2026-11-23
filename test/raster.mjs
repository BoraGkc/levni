// The fast rasteriser must look like librsvg's own filter render and be much faster.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { compose, rasterize } from '../src/index.mjs';

const diff = async (a, b) => {
  const [x, y] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
  assert.equal(x.length, y.length, 'same size');
  let d = 0; for (let i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]);
  return d / x.length;
};
let slow = 0, fast = 0;
for (const f of ['cover', 'engrave-etched-poster', 'poster-summit', 'seal-sheet']) {
  const { svg } = await compose(JSON.parse(readFileSync(new URL(`../examples/${f}.json`, import.meta.url), 'utf8')));
  let t = performance.now(); const ref = await sharp(Buffer.from(svg)).png().toBuffer(); slow += performance.now() - t;
  t = performance.now(); const out = await rasterize(svg); fast += performance.now() - t;
  const d = await diff(ref, out);
  assert.ok(d < 1.5, `${f}: mean channel difference ${d.toFixed(2)} (want < 1.5)`);
}
assert.ok(fast < slow * 0.8, `fast path ${Math.round(fast)} ms should beat librsvg ${Math.round(slow)} ms`);
// density (scale) and raw output
const { svg } = await compose({ seed: 2, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 300 }] });
const half = await rasterize(svg, { density: 36 });
assert.equal((await sharp(half).metadata()).width, 600);
const raw = await rasterize(svg, { raw: true });
assert.equal(raw.info.channels, 4); assert.equal(raw.info.width, 1200);
// plain SVGs (no markers) still render
const plain = await rasterize('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
assert.equal((await sharp(plain).metadata()).width, 10);
console.log(`raster ok (librsvg ${Math.round(slow)} ms, fast ${Math.round(fast)} ms)`);
