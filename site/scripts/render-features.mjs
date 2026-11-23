// Images for /features/ and /mcp/, drawn by Levni from the repo's example scenes. Run: node scripts/render-features.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { rasterize } from '../../src/raster.mjs';
import { compose } from '../../src/index.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const ex = (n) => JSON.parse(readFileSync(here(`../examples/${n}.json`), 'utf8'));
mkdirSync(here('public/features'), { recursive: true });
process.chdir(here('..')); // example scenes reference files relative to the repo root

async function out(spec, name, width = 800) {
  const { svg } = await compose(spec);
  await sharp(await rasterize(svg)).resize(width).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(here(`public/features/${name}.webp`));
  console.log(name);
}

for (const n of ['chart-inflation', 'people', 'slots-tv', 'slots-lens', 'ribbon-loop', 'ribbon-rings']) await out(ex(n), n);
await out({ ...ex('cover'), format: 'story', reflow: true, title: { text: 'Why every newsroom wants a data desk', kicker: 'Analysis', band: 'blue', brand: 'levni.dev' } }, 'format-story', 360);
await out({ ...ex('cover'), format: 'square', reflow: true }, 'format-square', 400);
await out({ ...ex('cover'), format: 'og', reflow: true, title: { text: 'Launch week, in one picture', position: 'bottom', band: 'paper', brand: 'levni.dev' } }, 'format-og');
await out({ seed: 4, elements: [
  { type: 'panel', x: 0, y: 0, w: 1200, h: 673, color: 'tone' },
  { type: 'prop', name: 'memorial-candle', x: 600, y: 360, size: 360, palette: 'blue' },
  { type: 'prop', name: 'single-flower', x: 830, y: 470, size: 180, palette: 'blue', rot: 70 },
] }, 'sensitive');
