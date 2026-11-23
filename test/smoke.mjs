// Smoke test: every prop variant is validated, composed on its own, and rasterized once.
// Variants are drawn 24 to a tile (6 x 4) at half resolution, so the whole library takes seconds, not minutes.
// Usage: node test/smoke.mjs [--out <dir>]   (--out keeps the tiles as a contact sheet for review)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose, loadProps } from '../src/index.mjs';
import { validateProp } from '../src/validate.mjs';

const oi = process.argv.indexOf('--out');
const outDir = oi > -1 ? process.argv[oi + 1] : null;
if (outDir) mkdirSync(outDir, { recursive: true });

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const props = loadProps();
const list = [];

// 1. Shape of every prop file
for (const [name, p] of Object.entries(props)) {
  for (const e of validateProp(p)) fail(name, e);
  (p.variants || []).forEach((v, i) => { if (v.paths?.length) list.push([name, i]); });
}

// 2. Each variant on its own: the SVG must be clean and the ink box finite and non-empty
for (const [name, variant] of list) {
  const at = `${name}#${variant}`;
  try {
    const { svg, used } = await compose({ seed: 1, elements: [{ type: 'prop', name, variant, x: 600, y: 336, size: 300 }] });
    if (/NaN|undefined|Infinity/.test(svg)) fail(at, 'SVG contains NaN/undefined/Infinity');
    const b = used.find((u) => u.type === 'draw');
    if (!b || ![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) fail(at, 'empty or invalid ink box');
  } catch (err) {
    fail(at, `compose threw: ${err.message}`);
  }
}

// 3. Rasterize every variant once, 24 per tile (6 x 4 cells of 200 x 168)
const t0 = Date.now();
let tiles = 0;
for (let i = 0; i < list.length; i += 24) {
  const chunk = list.slice(i, i + 24);
  const elements = chunk.flatMap(([name, variant], k) => {
    const x = 100 + (k % 6) * 200, y = 70 + Math.floor(k / 6) * 168;
    return [
      { type: 'prop', name, variant, x, y, size: 115 },
      { type: 'label', text: `${name} ${variant}`.slice(0, 24), x, y: y + 78, size: 11, anchor: 'middle', upper: false },
    ];
  });
  try {
    const { svg } = await compose({ seed: 3, elements });
    const img = sharp(Buffer.from(svg), { density: outDir ? 72 : 36 });
    const { width, height } = await img.metadata();
    if (!width || !height) fail(`tile ${tiles}`, 'raster has no size');
    if (outDir) await img.png().toFile(join(outDir, `props-${String(tiles).padStart(3, '0')}.png`));
    else await img.png().toBuffer();
  } catch (err) {
    fail(`tile ${tiles} (${chunk[0].join('#')} …)`, `raster failed: ${err.message}`);
  }
  tiles++;
}

// 3b. Data charts: every chart composes without NaN, including empty, zero, single, negative and junk data
{
  const data = [[], [0, 0, 0], [5], [-4, 3, -1], [1, NaN, 'x', null, 4], [1e9, 1], [0.0001, 0.0002]];
  const make = (v, ink) => [
    { type: 'bars', x: 10, y: 10, w: 300, h: 200, values: v, labels: v.map((_, i) => 'l' + i), showValues: true },
    { type: 'bars', x: 10, y: 10, w: 300, h: 200, values: v, horizontal: true, labels: ['a'], showValues: true, highlight: 0 },
    { type: 'linechart', x: 10, y: 10, w: 300, h: 200, values: v, area: true, dots: true, showValues: true },
    { type: 'linechart', x: 10, y: 10, w: 300, h: 200, series: [v, v.slice().reverse()] },
    { type: 'pie', x: 300, y: 300, r: 80, values: v, labels: ['a', 'b'], showValues: true },
    { type: 'donut', x: 300, y: 300, r: 80, values: v, highlight: 0 },
    { type: 'isochart', x: 10, y: 10, values: v, unit: 0.5, showValues: true },
    { type: 'isochart', x: 10, y: 10, values: v, unit: 0, icon: 'phone' },
  ];
  for (const [k, v] of data.entries()) {
    try {
      const { svg } = await compose({ seed: 2, elements: make(v) });
      if (/NaN|undefined|Infinity/.test(svg)) fail(`charts data#${k}`, 'SVG contains NaN/undefined/Infinity');
    } catch (err) { fail(`charts data#${k}`, err.message); }
  }
  for (const bad of [{ values: undefined }, { values: 7 }, { values: [] , w: 0, h: -5 }, { values: [1, 2], r: 0 }]) for (const type of ['bars', 'linechart', 'pie', 'donut', 'isochart']) {
    try {
      const { svg } = await compose({ seed: 2, elements: [{ type, x: 50, y: 50, w: 200, h: 100, r: 40, ...bad }] });
      if (/NaN|undefined|Infinity/.test(svg)) fail(`charts ${type}`, 'SVG contains NaN/undefined/Infinity on odd input');
    } catch (err) { fail(`charts ${type}`, err.message); }
  }
}
// 3b. Every person pose composes without NaN, facing both ways; `people` too
{
  const { POSE_NAMES } = await import('../src/person.mjs');
  for (const facing of ['right', 'left']) for (const pose of POSE_NAMES) {
    try {
      const { svg, used } = await compose({ seed: 1, elements: [{ type: 'person', x: 300, y: 500, size: 300, pose, facing, accent: 'coral', hold: 'lightbulb' }] });
      if (/NaN|undefined|Infinity/.test(svg)) fail(`person ${pose}/${facing}`, 'SVG contains NaN/undefined/Infinity');
      if (!used.some((u) => u.type === 'person' && [u.x, u.y, u.w, u.h].every(Number.isFinite))) fail(`person ${pose}/${facing}`, 'no valid box');
    } catch (err) { fail(`person ${pose}/${facing}`, err.message); }
  }
  const { svg } = await compose({ seed: 1, elements: [{ type: 'people', x: 100, y: 500, w: 800, n: 7, size: 200 }] });
  if (/NaN|undefined|Infinity/.test(svg)) fail('people', 'SVG contains NaN/undefined/Infinity');
}

// 4. Every example scene renders (small, fast)
const { readdirSync, readFileSync } = await import('node:fs');
const exDir = new URL('../examples/', import.meta.url);
for (const f of readdirSync(exDir).filter((n) => n.endsWith('.json'))) {
  try {
    const { svg } = await compose(JSON.parse(readFileSync(new URL(f, exDir), 'utf8')));
    if (/NaN|undefined|Infinity/.test(svg)) fail(`examples/${f}`, 'SVG contains NaN/undefined/Infinity');
    await sharp(Buffer.from(svg), { density: 24 }).png().toBuffer();
  } catch (err) { fail(`examples/${f}`, err.message); }
}

console.log(`${Object.keys(props).length} props, ${list.length} variants, ${tiles} tiles rasterized in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (errors.length) {
  console.error(`${errors.length} problem(s):\n` + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('ok');
