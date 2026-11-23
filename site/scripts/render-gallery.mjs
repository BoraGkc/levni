// Renders the /gallery/ page and the landing showcase from the scenes in scenes/gallery-<group>/.
//   node scripts/render-gallery.mjs           (only draws images that are missing)
//   node scripts/render-gallery.mjs --force   (redraws all)
// Each scene file is a normal Levni scene plus a "_meta" block ({ title, alt }) that is stripped
// before rendering. Writes, per scene: public/g/<group>/<id>.webp (large), <id>-s.webp (thumbnail) and
// <id>.json (the scene as shown in the dialog), and src/data/gallery.json (what the page reads).
// Output is committed, so the Pages build needs no sharp.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { compose, resolveCanvas, renderBoard } from '../../src/index.mjs';
import { screenRaster } from '../../src/dither.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
process.chdir(here('..')); // scenes reference files (badges) relative to the repo root

// tab order on the page
export const GROUPS = [
  ['boards', 'Brand boards'],
  ['stickers', 'Seals & stickers'],
  ['brand', 'Brand assets'],
  ['lines', 'Terrain & etching'],
  ['pixel', 'Pixel icons'],
  ['worlds', 'Little worlds'],
  ['charts', 'Hand-inked data'],
  ['covers', 'Riso & miniature'],
  ['icons', '3D icons'],
  ['formats', 'Formats'],
  ['soft3d', 'Soft 3D covers'],
];

// large / thumbnail widths by shape
const sizes = (w, h) => (w > h * 1.2 ? [1200, 640] : w >= h ? [800, 400] : [720, 360]);
const webp = { quality: 80, effort: 6, smartSubsample: true };

// a compact, readable JSON: top-level keys one per line, one element per line
function pretty(scene) {
  const lines = Object.entries(scene).map(([k, v]) => {
    if (k === 'elements' && Array.isArray(v)) return `  "elements": [\n${v.map((e) => `    ${JSON.stringify(e)}`).join(',\n')}\n  ]`;
    return `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}

const items = [];
let drawn = 0;
for (const [group] of GROUPS) {
  const dir = here(`scenes/gallery-${group}`);
  if (!existsSync(dir)) continue;
  mkdirSync(here(`public/g/${group}`), { recursive: true });
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const id = f.slice(0, -5);
    const { _meta: meta = {}, ...scene } = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const big = here(`public/g/${group}/${id}.webp`), small = here(`public/g/${group}/${id}-s.webp`);
    // a brand board spec (gallery-boards/): drawn by renderBoard, shown with its spec in the dialog
    const isBoard = group === 'boards';
    const { w: cw, h: ch } = isBoard ? { w: scene.canvas?.[0] ?? 1800, h: scene.canvas?.[1] ?? 1200 } : resolveCanvas(scene);
    const [lw, tw] = sizes(cw, ch);
    if (force || !existsSync(big) || !existsSync(small)) {
      const t = Date.now();
      let png;
      if (isBoard) {
        const tmp = join(tmpdir(), `levni-board-${id}.png`);
        await renderBoard(scene, tmp, { baseDir: dir });
        png = readFileSync(tmp);
      } else {
        const { svg } = await compose(scene);
        png = await sharp(Buffer.from(svg), { density: 72 * Math.max(1, lw / cw) }).png().toBuffer();
        if (scene.screen) png = await screenRaster(png, scene.screen); // the print pass is raster: the CLI applies it on export
      }
      await sharp(png).resize(lw).webp(webp).toFile(big);
      await sharp(png).resize(tw).webp({ ...webp, quality: 78 }).toFile(small);
      console.log(`${group}/${id}  ${Date.now() - t} ms`);
      drawn++;
    }
    writeFileSync(here(`public/g/${group}/${id}.json`), pretty(scene));
    items.push({ group, id, title: meta.title || id, alt: meta.alt || '', w: lw, h: Math.round((lw * ch) / cw), tw, th: Math.round((tw * ch) / cw) });
  }
}

// Ortak Alan article covers: already drawn by render-assets.mjs (public/gallery/oa-*.webp), shown with their scenes
for (const f of readdirSync(here('scenes/gallery')).filter((n) => n.endsWith('.json')).sort()) {
  const id = `oa-${f.slice(0, -5)}`;
  const scene = { ...JSON.parse(readFileSync(here(`scenes/gallery/${f}`), 'utf8')), locale: 'tr' };
  writeFileSync(here(`public/g/covers/${id}.json`), pretty(scene));
  items.push({ group: 'covers', id, title: `Ortak Alan cover: ${f.slice(0, -5)}`, alt: 'A riso article cover drawn by Levni for Ortak Alan', w: 800, h: 449, tw: 800, th: 449, src: `/gallery/${id}.webp` });
}

// The landing showcase's formats slide: four formats of one scene on one card
const all = here('public/g/formats/all.webp');
if (force || !existsSync(all)) {
  const fit = async (id, h) => sharp(here(`public/g/formats/${id}.webp`)).resize({ height: h }).png().toBuffer();
  const [story, og, square, yt] = await Promise.all([fit('4-story', 589), fit('2-og', 373), fit('3-square', 196), fit('5-youtube', 196)]);
  const frames = [[60, 42, 332, 589], [430, 42, 710, 373], [496, 435, 196, 196], [716, 435, 349, 196]];
  const lines = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="673">${frames.map(([x, y, w, h]) => `<rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${h + 2}" fill="none" stroke="#14181F" stroke-width="2"/>`).join('')}</svg>`);
  await sharp({ create: { width: 1200, height: 673, channels: 3, background: '#E6E2D8' } })
    .composite([{ input: story, left: 60, top: 42 }, { input: og, left: 430, top: 42 }, { input: square, left: 496, top: 435 }, { input: yt, left: 716, top: 435 }, { input: lines, left: 0, top: 0 }])
    .webp(webp).toFile(all);
  await sharp(all).resize(640).webp({ ...webp, quality: 78 }).toFile(here('public/g/formats/all-s.webp'));
  console.log('formats/all');
}

mkdirSync(here('src/data'), { recursive: true });
writeFileSync(here('src/data/gallery.json'), JSON.stringify({ groups: GROUPS, items }));
console.log(`${items.length} items, ${drawn} drawn`);
