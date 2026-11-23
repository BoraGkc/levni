// amtone, camo, grain and the element-level `screen`: defaults, silly inputs, determinism, clip, speckle.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { compose } from '../src/index.mjs';

const t0 = Date.now();
const cases = [
  { type: 'amtone' },
  { type: 'amtone', x: 0, y: 0, w: 400, h: 300, source: 'radial', colors: ['coral', 'blue'], shape: 'dot' },
  { type: 'amtone', x: 0, y: 0, w: 400, h: 300, source: 'linear', shape: 'square', angle: 15, invert: true, gamma: 2 },
  { type: 'amtone', x: 0, y: 0, w: 400, h: 300, source: 'noise', shape: 'line', scale: 0.01, octaves: 4 },
  { type: 'amtone', x: 0, y: 0, w: 400, h: 300, source: 'terrain', light: 300, clip: 'circle' },
  { type: 'amtone', x: 300, y: 300, r: 150, source: 'terrain', sea: 0.5 },
  { type: 'amtone', source: 'prop', prop: 'rocket', x: 300, y: 300, size: 300, cell: 8 },
  { type: 'amtone', x: -50, y: -50, w: 1e7, h: 1e7, cell: 0.01, source: 'nope', shape: 'nope', angle: 1e9, gamma: -4, colors: [] },
  { type: 'camo', x: 0, y: 0, w: 500, h: 400, colors: ['ink', 'coral', 'mustard'], ground: 'paper', speckle: 0.7 },
  { type: 'camo', x: 300, y: 300, r: 200, threshold: 9, scale: 99, octaves: 99, res: -3 },
  { type: 'camo', x: 0, y: 0, w: 1e7, h: 0, colors: [], threshold: -2, speckle: 5 },
  { type: 'grain' },
  { type: 'grain', mode: 'toner', x: 100, y: 100, w: 300, h: 300, colors: ['ink', 'paper'], streaks: 3 },
  { type: 'grain', x: 0, y: 0, w: 1e7, h: 1e7, density: 1e9, size: -1, opacity: 9 },
  { type: 'disc', x: 300, y: 300, r: 100, color: 'coral', screen: 'riso' },
  { type: 'disc', x: 300, y: 300, r: 100, color: 'coral', screen: { cell: 0, matrix: 3, inks: ['nope'], paper: 'x' } },
];
for (const e of cases) {
  for (const finish of ['soft', 'crayon']) {
    const a = (await compose({ seed: 3, finish, elements: [e] })).svg;
    assert.doesNotMatch(a.replace(/base64,[A-Za-z0-9+/=]+/g, ''), /NaN|undefined|Infinity/, JSON.stringify(e));
    assert.equal(a, (await compose({ seed: 3, finish, elements: [e] })).svg, 'deterministic ' + JSON.stringify(e));
    assert.ok(a.length < 8e6, 'size capped ' + JSON.stringify(e).slice(0, 80));
  }
}

// different seeds / elements give different textures
const A = (await compose({ seed: 1, elements: [{ type: 'camo', x: 0, y: 0, w: 400, h: 300 }] })).svg;
const B = (await compose({ seed: 2, elements: [{ type: 'camo', x: 0, y: 0, w: 400, h: 300 }] })).svg;
assert.notEqual(A, B);
// camo contours are closed paths, coloured with the palette
assert.match(A, /<path d="M[^"]+Z" fill="#[0-9A-Fa-f]{6}" fill-rule="evenodd"/);
// speckle adds masks and dots
assert.match((await compose({ elements: [{ type: 'camo', x: 0, y: 0, w: 400, h: 300, speckle: 0.6 }] })).svg, /<mask id="pcm/);
// a circle clip stays inside the circle
assert.match((await compose({ elements: [{ type: 'amtone', x: 100, y: 100, w: 300, h: 300, clip: 'circle' }] })).svg, /<clipPath id="pc[^"]+"><circle/);
// two screens overprint with multiply
assert.match((await compose({ elements: [{ type: 'amtone', x: 0, y: 0, w: 300, h: 300, colors: ['coral', 'blue'] }] })).svg, /mix-blend-mode:multiply/);

// element-level screen: only that element is dithered, the rest of the picture keeps its colours
const scene = { seed: 5, finish: 'soft', canvas: [400, 300], background: 'paper', grain: 0, elements: [
  { type: 'panel', x: 20, y: 20, w: 160, h: 260, color: 'coral' },
  { type: 'panel', x: 220, y: 20, w: 160, h: 260, color: 'coral', screen: { cell: 8, matrix: 8, inks: ['#14181F'], paper: '#F4F2EC' } },
] };
const { svg } = await compose(scene);
assert.match(svg, /<image [^>]*href="data:image\/png;base64,/);
const png = await sharp(Buffer.from(svg)).raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => { const k = (y * png.info.width + x) * png.info.channels; return [...png.data.subarray(k, k + 3)]; };
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 24);
assert.ok(near(px(60, 150), [242, 96, 63]), 'plain panel keeps its colour');
const cols = new Set(); for (let y = 40; y < 260; y += 3) for (let x = 240; x < 360; x += 3) cols.add(px(x, y).join());
assert.ok(cols.size <= 12, 'screened panel is reduced to the screen palette (' + cols.size + ')');
assert.ok(!near(px(300, 150), [242, 96, 63]) || cols.size > 1, 'screened panel is not plain coral');
// outside the element nothing changes
assert.ok(near(px(200, 150), [244, 242, 236]), 'ground stays paper');

console.log(`print ok (${Date.now() - t0} ms)`);
