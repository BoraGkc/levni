// Soft 3D (v2): every element composes cleanly, presets are deterministic and varied, geometry closes without seams.
// Usage: node test/soft3d.mjs
import sharp from 'sharp';
import { compose } from '../src/index.mjs';
import { critique } from '../src/critic.mjs';
import { _internals as I, LAYOUTS, THEMES, RIBBON_PRESETS, autoLayout } from '../src/soft3d.mjs';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const clean = (where, svg) => { if (/NaN|undefined|Infinity/.test(svg)) fail(where, 'SVG contains NaN/undefined/Infinity'); };
const scene = (elements, extra = {}) => ({ finish: 'soft', seed: 2, background: '#E4EEF9', elements, ...extra });

// 1. every single-shape element, with defaults and with options
const singles = [
  { type: 'torus3d', x: 300, y: 300, size: 300 },
  { type: 'torus3d', x: 300, y: 300, size: 300, thickness: 0.2, rotate: [80, 0, 0], colors: ['coral', '#FFD27A'] },
  { type: 'sphere3d', x: 600, y: 300, size: 200, color: 'mustard', shadow: false },
  { type: 'capsule3d', x: 600, y: 300, size: 260, radius: 0.3 },
  { type: 'blob3d', x: 600, y: 300, size: 260, seed: 9, wobble: 0.4 },
  { type: 'cubes3d', x: 600, y: 300, size: 300, heights: [[1, 2], [3, 1]], colors: ['#DDE9FF', '#3D6BFF'], colorBy: 'height' },
  { type: 'cubes3d', x: 600, y: 300, size: 300, blocks: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], round: 0 },
  { type: 'tube3d', preset: 'knot', x: 600, y: 300, size: 300 },
  { type: 'ribbon3d', points: [[100, 500, 0], [400, 200, 120], [800, 300, -80], [1100, 150, 0]], width: 120 },
  ...RIBBON_PRESETS.map((preset) => ({ type: 'ribbon3d', preset, x: 600, y: 330, size: 360, seed: 3 })),
  { type: 'extrude3d', name: 'rocket', x: 600, y: 330, size: 240 },
  { type: 'extrude3d', name: 'heart', x: 600, y: 330, size: 240, lines: 'none', depth: 0.3, rotate: [0, 160, 0] },
  { type: 'extrude3d', paths: [{ d: 'M20 20 L80 20 L80 80 L20 80 Z M40 40 L60 40 L60 60 L40 60 Z', fill: 'coral', rule: 'evenodd' }], x: 600, y: 330, size: 200 },
];
for (const e of singles) {
  const at = `${e.type}${e.preset ? ' ' + e.preset : ''}${e.name ? ' ' + e.name : ''}`;
  try {
    const { svg, used } = await compose(scene([e]));
    clean(at, svg);
    const b = used.find((u) => u.type === e.type);
    if (!b || ![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) fail(at, `no valid box ${JSON.stringify(b)}`);
    if ((svg.match(/<path /g) || []).length < 20) fail(at, 'too few faces drawn');
  } catch (err) { fail(at, `compose threw: ${err.message}`); }
}
try { await compose(scene([{ type: 'extrude3d', name: 'no-such-prop-xyz' }])); fail('extrude3d', 'expected an error for an unknown prop'); } catch (err) { if (!/no prop named/.test(err.message)) fail('extrude3d', `wrong error: ${err.message}`); }

// 2. every cover layout and palette composes, deterministically, and keeps the title zone mostly clear
const palettes = Object.keys(THEMES);
for (const [i, preset] of LAYOUTS.entries()) {
  const sc = scene([{ type: 'soft3d', preset, seed: i + 1, palette: palettes[i % palettes.length], badge: 'examples/badge-tulip.svg' }]);
  try {
    const a = await compose(sc), b = await compose(sc);
    clean(`soft3d ${preset}`, a.svg);
    if (a.svg !== b.svg) fail(`soft3d ${preset}`, 'same scene, different SVG');
    if (critique(a.used, a.canvas).some((n) => /runs off|focal/.test(n))) fail(`soft3d ${preset}`, `critic: ${critique(a.used, a.canvas).join('; ')}`);
  } catch (err) { fail(`soft3d ${preset}`, err.message); }
}
try { await compose(scene([{ type: 'soft3d', preset: 'nope' }])); fail('soft3d', 'expected an unknown preset error'); } catch (err) { if (!/unknown preset/.test(err.message)) fail('soft3d', `wrong error: ${err.message}`); }
// custom palette and other formats
for (const format of ['square', 'story']) {
  try {
    const { svg } = await compose({ finish: 'soft', format, elements: [{ type: 'soft3d', preset: 'auto', seed: 5, palette: { background: ['#F2EEE6', '#E4DCCD'], stops: ['#FFB36B', '#FF5E62', '#8E3BC9'] }, titleSpace: 'top' }] });
    clean(`soft3d ${format}`, svg);
  } catch (err) { fail(`soft3d ${format}`, err.message); }
}

// 3. auto: nine consecutive seeds walk through nine different layouts, and their pictures differ
const names = new Set(Array.from({ length: 9 }, (_, k) => autoLayout(k + 1)));
if (names.size !== 9) fail('auto', `seeds 1..9 give only ${names.size} layouts`);
const svgs = new Set();
for (let s = 1; s <= 4; s++) svgs.add((await compose(scene([{ type: 'soft3d', preset: 'auto', seed: s }]))).svg);
if (svgs.size !== 4) fail('auto', 'different seeds gave identical covers');

// 4. geometry: a Möbius band and a closed tube close on themselves (the last row meets the first)
{
  const pc = I.presetCurve('mobius', 1);
  const faces = I.sweepMesh({ points: pc.points, closed: true, twist: 0.5, width: 0.4 }, 150, 'ribbon');
  const m = 14, last = faces.slice(-m), first = faces.slice(0, m);
  // the closing quad's far edge is the first row's near edge, crossed (j -> m - j)
  const gap = Math.max(...last.map((f, j) => Math.hypot(...f.v[1].map((x, k) => x - first[m - 1 - j].v[3][k]))));
  if (gap > 1e-6) fail('mobius', `band does not close (gap ${gap})`);
  const tube = I.sweepMesh({ points: I.presetCurve('knot', 1).points, closed: true, twist: 0, width: 0.2, radius: 0.1 }, 150, 'tube');
  // no face may stretch across the knot: a broken closure shows up as one long quad edge
  let worst = 0;
  for (const f of tube) worst = Math.max(worst, Math.hypot(...f.v[0].map((x, k) => x - f.v[1][k])));
  if (!(worst < 0.05)) fail('tube', `knot tube has a stretched face (${worst})`);
}

// 5. a typical cover: compose + rasterise in about a second
{
  const t0 = performance.now();
  const { svg } = await compose({ finish: 'soft', elements: [{ type: 'soft3d', preset: 'auto', seed: 3, palette: 'mint-night', badge: 'examples/badge-tulip.svg' }], title: { text: 'A title', kicker: 'Kicker' } });
  await sharp(Buffer.from(svg)).png().toBuffer();
  const ms = performance.now() - t0;
  console.log(`typical cover: ${ms.toFixed(0)} ms, ${(svg.length / 1024).toFixed(0)} KB SVG`);
  if (ms > 4000) fail('speed', `a typical cover took ${ms.toFixed(0)} ms`);
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n` + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log(`ok: ${singles.length} shapes, ${LAYOUTS.length} cover layouts, ${palettes.length} palettes`);
