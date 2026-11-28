// shapegrid, echo, dotmatrix, dotline, furniture: defaults, silly inputs, determinism, exact geometry.
import assert from 'node:assert/strict';
import { compose } from '../src/index.mjs';
import { modulePath, landAt, GRID_MODULES } from '../src/shapes.mjs';

const svgOf = async (el, extra = {}) => (await compose({ seed: 3, finish: 'soft', canvas: [1200, 1600], ...extra, elements: [el] })).svg;
const count = (s, re) => (s.match(re) || []).length;

// geometry: a square module fills its rect exactly, a pill's flat side is flush, a quarter stays in its corner
assert.equal(modulePath('square', 10, 20, 100, 50), 'M10 20H110V70H10V20Z');
assert.equal(modulePath('blank', 0, 0, 10, 10), '');
assert.match(modulePath('pill-left', 0, 0, 200, 100), /^M50 0H200V100H50A50 50 0 0 1 0 50A50 50 0 0 1 50 0Z$|A50 50/);
assert.match(modulePath('quarter-tl', 0, 0, 100, 100), /^M0 0H100A100 100 0 0 1 0 100Z$/);
for (const m of [...GRID_MODULES.filter((n) => !['half-circle', 'quarter', 'arch', 'blank'].includes(n)), 'half-circle-up', 'half-circle-left', 'quarter-br', 'arch-down']) assert.ok(modulePath(m, 0, 0, 80, 120), m);

// shapegrid: exact gap between two squares (explicit cells, 2 columns, gap 20, 220 wide -> cells of 100)
const g = await svgOf({ type: 'shapegrid', x: 0, y: 0, w: 220, h: 100, cols: 2, rows: 1, gap: 20, cells: ['square', 'square'] });
assert.match(g, /M0 0H100V100H0V0Z/);
assert.match(g, /M120 0H220V100H120V0Z/);
// a merged span covers 2x1 cells including the gap between them
const sp = await svgOf({ type: 'shapegrid', x: 0, y: 0, w: 220, h: 100, cols: 2, rows: 1, gap: 20, cells: [['square', 'ink', [2, 1]], 'circle'] });
assert.match(sp, /M0 0H220V100H0V0Z/);
assert.equal(count(sp, /<path/g), 1, 'the covered cell stays empty');
// spans + blank slot + weights: the blank slot draws nothing
const slot = await svgOf({ type: 'shapegrid', x: 0, y: 0, w: 400, h: 400, cols: 4, rows: 4, gap: 8, seed: 2, colors: ['ink', 'coral'], weights: [3, 1], spans: [{ col: 0, row: 2, cols: 4, rows: 2, module: 'blank' }] });
assert.doesNotMatch(slot, /NaN/);
assert.equal(count(slot, /Z/g), 8, 'two rows of four; the blank slot draws nothing');
// colours: both inks show up with enough cells
const colors = await svgOf({ type: 'shapegrid', x: 0, y: 0, w: 800, h: 800, cols: 8, rows: 8, gap: 6, colors: ['ink', 'coral'], weights: [1, 1] });
assert.equal(count(colors, /<path d="[^"]+" fill="#/g), 2);

// echo: n copies, tones step from A to B, outline only on the last copy
const ech = await svgOf({ type: 'echo', shape: 'circle', x: 600, y: 800, size: 300, n: 5, dy: 40, from: '#000000', to: '#ffffff', outline: '#ff0000' });
assert.equal(count(ech, /<g transform="translate\(/g), 5);
assert.ok(ech.includes('fill="#000000"') && ech.includes('fill="#ffffff"') && ech.includes('fill="#808080"'));
assert.equal(count(ech, /stroke="#ff0000"/g), 1, 'one outline pass, on the top copy');
assert.match(await svgOf({ type: 'echo', prop: 'cat', n: 4, final: 'prop' }), /<g transform/);
await assert.rejects(() => compose({ elements: [{ type: 'echo', prop: 'no-such-prop-xyz' }] }), /no prop/);

// dotmatrix: pattern rows decide filled / hollow / faint
const dm = await svgOf({ type: 'dotmatrix', x: 0, y: 0, w: 100, h: 20, pattern: ['.oO.o'], cell: 20, faint: '#aaaaaa', filled: '#111111' });
assert.equal(count(dm, /fill="#aaaaaa"/g), 1);
assert.match(dm, /fill="none" stroke="#111111"/);
assert.equal(count(dm, /Z/g), 5, 'five dots: two faint, two filled, one ring');
// world map: land is land, ocean is ocean
assert.ok(landAt(35, 39) > 0.9, 'Anatolia');
assert.ok(landAt(-30, -20) < 0.1, 'South Atlantic');
assert.ok(landAt(135, -25) > 0.5, 'Australia');
assert.ok(landAt(0, 89) === 0 && landAt(0, -80) === 0, 'outside the bitmap is sea');
const wm = await svgOf({ type: 'dotmatrix', x: 0, y: 0, w: 1000, h: 500, mask: 'world', cell: 12, hollow: 0.3, faint: '#4D86E0' });
assert.ok(wm.length > 5000 && /stroke-width/.test(wm));
// noise and prop masks, big grid is capped
for (const e of [{ mask: 'noise', cell: 10 }, { mask: 'prop', prop: 'cat', cell: 12 }, { mask: 'world', cell: 0.1, w: 1e6, h: 1e6 }, { pattern: [] }, { mask: 'world', view: [10, 20] }, { cell: -4, hollow: 9, dot: 50 }]) {
  const s = await svgOf({ type: 'dotmatrix', x: 0, y: 0, w: 600, h: 400, ...e });
  assert.doesNotMatch(s, /NaN|undefined|Infinity/, JSON.stringify(e));
}
await assert.rejects(() => compose({ elements: [{ type: 'dotmatrix', mask: 'nope' }] }), /unknown mask/);
await assert.rejects(() => compose({ elements: [{ type: 'dotmatrix', mask: 'pattern' }] }), /pattern rows/);

// dotline: line dots sit on the canvas grid, iso back edges turn muted, shimmer loops
const dl = { type: 'dotline', prop: 'globe', x: 400, y: 300, size: 300, cell: 10, color: '#111111', muted: '#999999' };
const dl1 = await svgOf(dl);
assert.match(dl1, /fill="#111111"/);
assert.match(dl1, /fill="#999999"/, 'fills become muted dots');
for (const m of dl1.matchAll(/M(-?[\d.]+) (-?[\d.]+)a([\d.]+)/g)) {
  const cx = Number(m[1]) + Number(m[3]), cy = Number(m[2]);
  assert.ok(Math.abs(cx / 10 - Math.round(cx / 10)) < 0.02 && Math.abs(cy / 10 - Math.round(cy / 10)) < 0.02, `dot off the grid at ${cx},${cy}`);
}
assert.doesNotMatch(await svgOf({ ...dl, fill: false }), /fill="#999999"/, 'fill: false leaves only lines');
const isoDots = (extra = {}) => svgOf({ type: 'dotline', cell: 10, color: '#111111', muted: '#999999', ...extra,
  iso: { x: 600, y: 400, objects: [{ kind: 'box', x: -60, y: -60, w: 200, d: 200, h: 120, hatch: false }, { kind: 'box', x: 0, y: 0, w: 80, d: 80, h: 100, z: 120, hatch: false }] } });
assert.match(await isoDots(), /fill="#999999"/, 'edges under the top box are hidden lines');
assert.doesNotMatch(await isoDots({ hiddenLines: false }), /fill="#999999"/, 'hiddenLines: false drops them');
const sh = (t) => compose({ seed: 1, t, elements: [{ ...dl, shimmer: 0.6 }] }).then((o) => o.svg);
assert.notEqual(await sh(0), await sh(0.5), 'shimmer moves with t');
assert.equal(await sh(0), await sh(1), 'shimmer loops');
const dls = await svgOf({ ...dl, shadow: [1, 1], shadowColor: '#555555', faint: '#222222' });
assert.match(dls, /fill="#555555"/, 'shadow dots');
assert.match(dls, /fill="#222222"/, 'faint dots');
for (const e of [{}, { prop: 'rocket', cell: -3, size: 1e9, line: 99, dot: 7, shimmer: 'x', fillEvery: 0, shadow: [1e9, 'a'] }, { d: 'M10 10L90 90', line: 3 }, { prop: 'cat', paint: true, hidden: [0, 1, 'x'], flip: true }]) {
  const s1 = await svgOf({ type: 'dotline', ...e });
  assert.doesNotMatch(s1, /NaN|undefined|Infinity/, JSON.stringify(e));
}
await assert.rejects(() => compose({ elements: [{ type: 'dotline', prop: 'nope-nope' }] }), /dotline: no prop/);
await assert.rejects(() => compose({ elements: [{ type: 'dotline', iso: { objects: [] } }] }), /drew nothing/);

// furniture: border dots land on the corners, counts follow the gap, every part is optional
const fu = await svgOf({ type: 'furniture', x: 0, y: 0, w: 400, h: 300, border: { inset: 20, gap: 10, dot: 2 } });
assert.equal(count(fu, /<circle/g), 2 * (36 + 26));
assert.match(fu, /cx="20" cy="20"/);
const all = await svgOf({ type: 'furniture', color: 'ink', border: { fade: 'down' }, corners: { style: 'registration' }, plus: { n: 4 }, rules: [{ y: 100 }, { x: 50 }, { x0: 0, y0: 0, x1: 10, y1: 10, dash: 4 }, null],
  credits: [{ left: 'a', center: 'b', right: 'c' }], tag: { text: 'nt5642', box: 'fill' } });
assert.match(all, /NT5642/);
assert.equal(count(all, /<text/g), 4);
assert.doesNotMatch(all, /NaN|undefined|Infinity/);

// everything is deterministic and survives silly inputs
for (const e of [{ type: 'shapegrid' }, { type: 'shapegrid', cols: 1e6, rows: -3, gap: 1e9, w: -5, modules: ['nope', 7], colors: [null], cells: [['x', 'y', [99, 99]], 5, null] }, { type: 'echo', n: 1e6, size: -9, dx: 1e9, steps: 0 }, { type: 'echo', d: 'M0 0' }, { type: 'dotmatrix' }, { type: 'furniture' }, { type: 'furniture', border: true, corners: true, plus: true, credits: {}, tag: {} }]) {
  let a;
  try { a = (await compose({ seed: 9, elements: [e] })).svg; } catch (err) { assert.match(String(err.message), /echo|dotmatrix/, JSON.stringify(e)); continue; }
  assert.doesNotMatch(a, /NaN|undefined|Infinity/, JSON.stringify(e));
  assert.equal(a, (await compose({ seed: 9, elements: [e] })).svg, 'deterministic');
}
console.log('shapes ok');
