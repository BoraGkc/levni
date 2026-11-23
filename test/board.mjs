// Brand boards: the shortcut expands, tiles fit, edge values stay finite, output is deterministic and fast.
import { renderBoard, expandBrand } from '../src/index.mjs';
import { findProp } from '../src/props.mjs';

const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const bad = (s) => /NaN|undefined|Infinity/.test(s);

const brand = { name: 'Feneri', tagline: 'Slow ferries across the Bosphorus', mark: 'lighthouse', inks: ['#14213D', '#FCA311', '#3A86A8', '#EFEAE0'] };
const t0 = Date.now();

// shortcut: 9 tiles, plain JSON, no bad numbers, deterministic
const a = expandBrand(brand), b = expandBrand(brand);
check(a.tiles.length === 9, 'brand does not make nine tiles');
check(JSON.stringify(a) === JSON.stringify(b), 'expandBrand is not deterministic');
check(!bad(JSON.stringify(a)), 'expanded brand holds NaN/undefined');
check(JSON.parse(JSON.stringify(a)).tiles.length === 9, 'expanded brand is not plain JSON');
check(a.canvas[0] === 1800 && a.canvas[1] === 1200, 'default brand board is not 1800x1200');
const r1 = await renderBoard({ brand, canvas: [900, 600] }, null), r2 = await renderBoard({ brand, canvas: [900, 600] }, null);
check(r1.png.equals(r2.png), 'same brand renders differently twice');
const small = await renderBoard({ brand, canvas: [900, 600], quantize: true }, null);
check(small.width === 900 && small.png.length < r1.png.length, 'canvas override or quantize ignored');

// brand edge values: one ink, light ink first, hex only, long names, soft finish, no tagline, person, no captions
const edges = [
  { name: 'A', mark: 'dove', inks: ['#E63946'] },
  { name: 'Very Long Brand Name That Goes On And On Forever', tagline: 'x '.repeat(60), mark: 'dove', inks: ['#FFFFFF', '#000000'], font: 'mono' },
  { name: 'Çağrı & <Co>', mark: 'dove', inks: ['coral', 'blue', 'paper'], finish: 'soft', captions: false, person: { name: 'Ece Yilmaz', role: 'Roaster' } },
  { name: 'Plain', mark: 'dove', font: 'sans', props: ['coffee-cup', 'dove'], seed: 7 },
];
for (const e of edges) {
  const spec = expandBrand(e);
  check(!bad(JSON.stringify(spec)), `${e.name}: bad number in spec`);
  const r = await renderBoard({ brand: e, canvas: [900, 600] }, null);
  check(r.png.length > 10000, `${e.name}: empty board`);
}
for (const [bad1, msg] of [[{ mark: 'dove' }, 'no name'], [{ name: 'X' }, 'no mark'], [{ name: 'X', mark: 'zzz-nope' }, 'unknown mark'], [{ name: 'X', mark: 'dove', inks: ['red-ish'] }, 'bad ink']]) {
  let threw = false; try { expandBrand(bad1); } catch { threw = true; }
  check(threw, `brand ${msg} did not throw`);
}

// auto-fit: one scene written for the normal 1200x673 canvas lands in tiles of very different shapes
const scene = { background: 'blue', elements: [{ type: 'disc', x: 600, y: 336, r: 200, color: 'mustard' }, { type: 'prop', name: 'dove', x: 600, y: 336, size: 300 }] };
const tiles = [[0, 0, 2, 1], [2, 0, 1, 2], [0, 1, 2, 1], [3, 0, 1, 1]].map((at) => ({ at, scene }));
const fitA = await renderBoard({ canvas: [900, 450], grid: { cols: 4, rows: 2 }, tiles }, null);
const fitB = await renderBoard({ canvas: [450, 700], grid: { cols: 4, rows: 2 }, tiles: [...tiles, { at: [3, 1], scene, mockup: 'phone', tilt: 5 }] }, null);
check(fitA.width === 900 && fitB.height === 700, 'fit boards have the wrong size');
let threw = false; try { await renderBoard({ tiles: [{ at: [0, 0], scene: 'missing-file.json' }] }, null); } catch { threw = true; }
check(threw, 'a missing scene file did not throw');

// silly inputs stay finite and bounded
const silly = await renderBoard({
  canvas: [Infinity, NaN], gap: -50, margin: 1e9, radius: 1e9, grid: { cols: 1e6, rows: 1e6 },
  tiles: [
    { at: [0, 0, 1, 1], type: 'type', text: '', size: NaN, tracking: Infinity, family: 'No Such Font <&>', sub: 'x'.repeat(500) },
    { at: [1, 0, 1, 1], type: 'type', text: 'Line one\nLine two\nthree\nfour\nfive\nsix\nseven', family: 'mono', italic: true, align: 'left' },
    { at: [2, 0, 1, 1], type: 'palette', colors: ['#112233', { hex: '#445566', weight: NaN }, { hex: 'nonsense' }, 'paper'], pad: Infinity },
    { at: [0, 1, 1, 1], scene, mockup: 'card', tilt: 1e9, ratio: 0 },
    { at: [1, 1, 1, 1], scene, mockup: 'tote', bagColor: 'nope' },
    { at: [2, 1, 1, 1], scene, mockup: 'browser', url: '<script>' + 'u'.repeat(200), caption: 'c'.repeat(200) },
    { rect: [NaN, 5, -3, Infinity], scene, mockup: 'phone' },
  ],
}, null);
check(silly.width >= 200 && silly.width <= 6000 && silly.height >= 200 && silly.height <= 6000, 'silly canvas not clamped');

// animation time and finish pass into scene tiles
const timed = await renderBoard({ canvas: [600, 400], grid: { cols: 1, rows: 1 }, t: 0.5, finish: 'soft', tiles: [{ scene: { elements: [{ type: 'disc', x: 600, y: 336, r: 100 }] } }] }, null);
check(timed.png.length > 1000, 'board with t and finish failed');

for (const type of ['serif', 'sans', 'mono']) {
  const r = await renderBoard({ canvas: [500, 300], grid: { cols: 1, rows: 1 }, tiles: [{ type: 'type', text: 'Wordmark', family: type, bg: 'paper' }] }, null);
  check(r.png.length > 1000, `type tile ${type} failed`);
}
check(!!findProp('dove'), 'dove prop missing');

const ms = Date.now() - t0;
check(ms < 60000, `board test too slow: ${ms} ms`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`board: ok (${ms} ms)`);
