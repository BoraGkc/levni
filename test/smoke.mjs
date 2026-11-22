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

console.log(`${Object.keys(props).length} props, ${list.length} variants, ${tiles} tiles rasterized in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (errors.length) {
  console.error(`${errors.length} problem(s):\n` + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('ok');
