// The Levni Shots page (/shots/): every shot drawn with its own sample fields as a still and a loop, 480 px wide.
//   node scripts/render-shots.mjs [--force] [--only <id>]   -> public/shots/<id>.webp, <id>-loop.webp, src/data/shots.json
import { writeFileSync, existsSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { compose, shotScene, SHOTS } from '../../src/index.mjs';
import { animate } from '../../src/animate.mjs';
import { rasterize } from '../../src/raster.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const rows = [];
for (const s of SHOTS) {
  const scene = shotScene(s.id), loop = here(`public/shots/${s.id}-loop.webp`);
  if ((!only || only === s.id) && (force || !existsSync(loop))) {
    const t0 = Date.now();
    await sharp(await rasterize((await compose({ ...scene, t: 0.62 })).svg)).resize(480).webp({ quality: 82 }).toFile(here(`public/shots/${s.id}.webp`));
    let q = 80, r;
    for (;;) { r = await animate(scene, loop, { frames: 30, fps: 12, width: 480, quality: q }); if (r.bytes < 320e3 || q <= 50) break; q -= 10; }
    console.log(`${s.id.padEnd(16)} ${Math.round(r.bytes / 1024)} KB ${Date.now() - t0} ms`);
  }
  rows.push({ ...s, scene, kb: existsSync(loop) ? Math.round(statSync(loop).size / 1024) : 0 });
}
writeFileSync(here('src/data/shots.json'), JSON.stringify(rows, null, 1));
console.log(`${rows.length} shots`);
