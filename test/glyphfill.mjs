// glyphfill: defaults, edge values, determinism, speed, crayon + soft finish, t.
import assert from 'node:assert/strict';
import { compose } from '../src/index.mjs';

const bad = /NaN|undefined|Infinity/;
const scene = (el, extra = {}) => ({ seed: 4, background: 'dark', elements: [{ type: 'glyphfill', x: 600, y: 330, size: 380, ...el }], ...extra });
const cases = {
  'default circle': {},
  'default sphere': { shape: 'sphere' },
  sphere_land_ink: { shape: 'sphere', land: 0.5, color: 'ink', accent: 'coral' },
  sphere_light: { shape: 'sphere', light: { angle: 40, elev: 70 }, mode: 'dot' },
  ring_block: { shape: 'ring', mode: 'block', hole: 0.5 },
  star: { shape: 'star', points: 7, accent: 'coral' },
  rect_flat: { shape: 'rect', w: 500, h: 120, tone: 'flat', field: 0.2 },
  'prop glyph': { prop: 'coffee-cup', accent: 'mustard' },
  'prop dot': { prop: 'rocket', mode: 'dot' },
  'prop block flip': { prop: 'rocket', mode: 'block', flip: true },
  'prop paths subset': { prop: 'globe', paths: [0, 1, 2, 3] },
  'prop no outline': { prop: 'coffee-cup', outline: false, rim: false },
  silly: { shape: 'sphere', size: 1e9, cell: -5, edge: 99, gamma: 'x', jitter: NaN, light: { angle: Infinity }, land: 7, accentShare: 9 },
  tiny: { shape: 'sphere', size: 0, cell: 1e-9 },
};

for (const [name, el] of Object.entries(cases)) {
  for (const finish of ['crayon', 'soft']) {
    const t0 = Date.now();
    const a = (await compose(scene(el, { finish }))).svg;
    const ms = Date.now() - t0;
    assert.ok(!bad.test(a), `${name}/${finish}: NaN/undefined/Infinity in SVG`);
    assert.ok(a.includes('<svg') && a.length > 400, `${name}: empty svg`);
    assert.equal((await compose(scene(el, { finish }))).svg, a, `${name}/${finish}: not deterministic`);
    assert.ok(ms < 4000, `${name}/${finish}: too slow (${ms} ms)`);
  }
}

// glyph text stays outside the crayon filter and is pinned to the grid
const crayon = (await compose(scene({ prop: 'coffee-cup' }, { finish: 'crayon' }))).svg;
const filterAt = crayon.indexOf('<g filter="url(#crayon)">'), textAt = crayon.indexOf('textLength=');
assert.ok(textAt > crayon.indexOf('</g>', filterAt), 'glyph text must be drawn above the crayon group');

// outline pass: line glyphs of all four directions appear on a prop with diagonal and vertical strokes
const g = (await compose(scene({ prop: 'rocket', cell: 8, color: 'paper' }, { finish: 'soft' }))).svg;
for (const ch of ['/', '|', '-']) assert.ok(g.includes(ch), `outline glyph ${ch} missing`);

// t moves the sphere (spin) but stays valid
const t0s = (await compose(scene({ shape: 'sphere', land: 0.4 }, { t: 0 }))).svg, t5 = (await compose(scene({ shape: 'sphere', land: 0.4 }, { t: 0.5 }))).svg;
assert.notEqual(t0s, t5, 't has no effect');
assert.ok(!bad.test(t5));

// unknown shape / prop give a clear error
await assert.rejects(() => compose(scene({ shape: 'blob' })), /unknown shape/);
await assert.rejects(() => compose(scene({ prop: 'nope-nope' })), /no prop/);
console.log('glyphfill ok');
